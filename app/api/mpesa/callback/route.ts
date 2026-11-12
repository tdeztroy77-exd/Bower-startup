import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { authenticateMpesaCallback, checkSettledAmount } from "@/lib/mpesa/daraja"
import {
  billingConfigured,
  billingDb,
  findSubscriptionPaymentByCheckout,
  grantPeriod,
  notifyUser,
} from "@/lib/billing/server"

/**
 * POST /api/mpesa/callback
 * Public endpoint hit by Safaricom when an STK push settles.
 *
 * It settles two different things:
 *   1. rent payments, recorded in `mpesa_transactions` (then applied to the
 *      rent invoice when the amount matches)
 *   2. subscription payments, recorded in `subscription_payments`
 *
 * Subscription settlement happens here — not only in the browser poll — so a
 * landlord who closes the checkout tab is still activated when the money
 * arrives.
 *
 * SECURITY
 *   - MPESA_CALLBACK_SECRET is the primary control, compared in constant time.
 *     A deployment without it rejects every callback (503).
 *   - The IP allowlist is defence in depth and never trusts a client-supplied
 *     x-forwarded-for header.
 *   - The settled amount is compared with the amount we charged before an
 *     invoice or subscription is settled.
 *   - Only settlement facts are persisted; the payer's MSISDN and name are
 *     not copied into our database.
 */
export async function POST(req: NextRequest) {
  const auth = authenticateMpesaCallback(req.headers, {
    requireSecret: true,
    requireIpAllowlist: false,
  })
  if (!auth.ok) {
    if (auth.reason === "secret_not_configured") {
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: "Callback secret is not configured" },
        { status: 503 },
      )
    }
    console.warn("[mpesa/callback] rejected", {
      reason: auth.reason,
      ip: auth.ip,
      ipSource: auth.ipSource,
    })
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as any
  const stk = body?.Body?.stkCallback
  if (!stk) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Bad payload" }, { status: 400 })
  }

  const checkoutId: string = stk.CheckoutRequestID
  const merchantId: string = stk.MerchantRequestID
  const resultCode: number = Number(stk.ResultCode)
  const resultDesc: string = stk.ResultDesc || ""

  const items: any[] = stk.CallbackMetadata?.Item || []
  const meta: Record<string, any> = {}
  for (const item of items) meta[item.Name] = item.Value

  const status = resultCode === 0 ? "completed" : "failed"

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Server misconfigured" }, { status: 500 })
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Settlement facts only — never the whole upstream payload (MSISDN, name).
  const safeCallback = {
    ResultCode: resultCode,
    ResultDesc: resultDesc,
    Amount: meta.Amount ?? null,
    MpesaReceiptNumber: meta.MpesaReceiptNumber ?? null,
    TransactionDate: meta.TransactionDate ?? null,
  }

  const update = {
    status,
    result_code: resultCode,
    result_desc: resultDesc,
    mpesa_receipt: meta.MpesaReceiptNumber || null,
    transaction_date: meta.TransactionDate ? String(meta.TransactionDate) : null,
    completed_at: status === "completed" ? new Date().toISOString() : null,
    raw_callback: safeCallback,
  }

  const { data: tx, error: txErr } = await supabase
    .from("mpesa_transactions")
    .update(update)
    .eq("checkout_request_id", checkoutId)
    .select("id, user_id, tenant_id, payment_id, amount")
    .maybeSingle()

  if (txErr) {
    console.error("[mpesa/callback] transaction update failed", txErr.message)
    return NextResponse.json({ ResultCode: 1, ResultDesc: "DB error" }, { status: 500 })
  }

  if (!tx) {
    const settled = await settleSubscriptionPayment({
      checkoutId,
      resultCode,
      resultDesc,
      amount: Number(meta.Amount),
      receipt: meta.MpesaReceiptNumber || null,
    })
    if (settled) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })

    console.warn("[mpesa/callback] callback for an unknown checkout id", { checkoutId, merchantId })
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
  }

  if (status === "completed") {
    const settledAmount = Number(meta.Amount)
    const expectedAmount = Number(tx.amount)

    let invoiceAmount: number | null = null
    if (tx.payment_id) {
      const { data: invoice } = await supabase
        .from("rent_payments")
        .select("id, amount, late_fee")
        .eq("id", tx.payment_id)
        .eq("user_id", tx.user_id)
        .maybeSingle()
      if (invoice) invoiceAmount = Number(invoice.amount || 0) + Number(invoice.late_fee || 0)
    }

    const verdict = checkSettledAmount({ expected: expectedAmount, settled: settledAmount, invoiceAmount })

    if (!verdict.ok) {
      await supabase
        .from("mpesa_transactions")
        .update({ result_desc: verdict.reason })
        .eq("id", tx.id)
      console.error("[mpesa/callback] settled amount does not match the invoice", {
        transactionId: tx.id,
        paymentId: tx.payment_id,
        expected: expectedAmount,
        invoiceAmount,
        settled: settledAmount,
        comparison: verdict.comparison,
      })
      // Ack: the transaction is recorded and retries would only duplicate it.
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
    }

    if (tx.payment_id) {
      await supabase
        .from("rent_payments")
        .update({
          status: "paid",
          paid_date: new Date().toISOString().slice(0, 10),
          payment_method: "mpesa",
          reference_number: meta.MpesaReceiptNumber || null,
        })
        .eq("id", tx.payment_id)
        .eq("user_id", tx.user_id)
    }
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
}

/**
 * Settle a subscription payment from a Daraja callback.
 *
 * Returns true when the checkout id belongs to a subscription payment (even
 * if it failed), false when it is unknown to billing.
 */
async function settleSubscriptionPayment(input: {
  checkoutId: string
  resultCode: number
  resultDesc: string
  amount: number
  receipt: string | null
}): Promise<boolean> {
  if (!billingConfigured()) return false
  const db = billingDb()

  let payment: any = null
  try {
    payment = await findSubscriptionPaymentByCheckout(db, input.checkoutId)
  } catch (error) {
    console.error("[mpesa/callback] subscription lookup failed", error)
    return false
  }
  if (!payment) return false

  if (input.resultCode !== 0) {
    await db
      .from("subscription_payments")
      .update({
        status: "failed",
        result_code: String(input.resultCode),
        result_desc: input.resultDesc,
      })
      .eq("id", payment.id)
      .in("status", ["initiated", "pending"])

    await notifyUser(db, payment.user_id, {
      type: "billing_payment_failed",
      title: "Subscription payment failed",
      message: input.resultDesc || "The M-Pesa prompt was not completed.",
      severity: "warning",
      metadata: { payment_id: payment.id },
    })
    return true
  }

  if (!Number.isFinite(input.amount) || Number(input.amount) !== Number(payment.amount)) {
    await db
      .from("subscription_payments")
      .update({
        status: "failed",
        result_code: String(input.resultCode),
        result_desc: "Settled amount did not match the plan price",
      })
      .eq("id", payment.id)
    console.error("[mpesa/callback] subscription amount mismatch", {
      paymentId: payment.id,
      expected: payment.amount,
      settled: input.amount,
    })
    return true
  }

  try {
    const grant = await grantPeriod(db, payment.user_id, payment.id, 30)
    await db
      .from("subscription_payments")
      .update({
        mpesa_receipt: input.receipt,
        result_code: String(input.resultCode),
        result_desc: input.resultDesc || "Confirmed by M-Pesa",
        completed_at: new Date().toISOString(),
      })
      .eq("id", payment.id)

    await notifyUser(db, payment.user_id, {
      type: "billing_payment_succeeded",
      title: "Payment received",
      message: `Your Bower plan is active${grant.invoice_no ? ` · receipt ${grant.invoice_no}` : ""}.`,
      severity: "success",
      metadata: { payment_id: payment.id, invoice_no: grant.invoice_no ?? null },
    })
  } catch (error) {
    console.error("[mpesa/callback] subscription grant failed", error)
    // Ack anyway: the payment row exists and the poll/renewal path can retry
    // the grant without asking Daraja to replay the callback.
  }
  return true
}
