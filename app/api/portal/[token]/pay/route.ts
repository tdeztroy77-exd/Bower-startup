import { NextRequest, NextResponse } from "next/server"
import { darajaPaymentsAvailable, stkPush } from "@/lib/mpesa/daraja"
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit"
import { normaliseKenyanPhone, resolvePortalToken } from "@/lib/portal/resolve"

/**
 * POST /api/portal/[token]/pay
 * Body: { payment_id }
 *
 * A tenant pays one of their own unpaid invoices with an M-Pesa prompt. The
 * amount is taken from the invoice on the server — the browser cannot choose
 * a lower amount. The Daraja callback settles the invoice through the normal
 * reconciliation path.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params
  const resolved = await resolvePortalToken(token)
  if (!resolved) return NextResponse.json({ error: "This link has expired or been revoked" }, { status: 404 })

  const { service, link, tenant } = resolved

  const limit = checkRateLimit(`portal-pay:${clientIdentifier(request)}`, 6, 10 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many payment attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.resetInSeconds) } },
    )
  }

  const body = (await request.json().catch(() => ({}))) as { payment_id?: string }
  if (!body.payment_id) return NextResponse.json({ error: "Choose an invoice" }, { status: 400 })

  const { data: invoice } = await service
    .from("rent_payments")
    .select("id, amount, late_fee, status, due_date, tenant_id, user_id")
    .eq("id", body.payment_id)
    .eq("tenant_id", tenant.id)
    .eq("user_id", link.user_id)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  if (["paid", "completed"].includes(invoice.status || "")) {
    return NextResponse.json({ error: "This invoice is already paid" }, { status: 409 })
  }

  const amount = Number(invoice.amount || 0) + Number(invoice.late_fee || 0)
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "This invoice has no payable amount" }, { status: 400 })
  }

  const phone = normaliseKenyanPhone(tenant.phone)
  if (!phone) {
    return NextResponse.json(
      { error: "Your phone number is not set up for M-Pesa. Ask your landlord to update it." },
      { status: 400 },
    )
  }

  if (!darajaPaymentsAvailable()) {
    return NextResponse.json({ error: "M-Pesa is temporarily unavailable. Try again later." }, { status: 503 })
  }

  const result = (await stkPush({
    phone,
    amount,
    accountReference: `RENT-${tenant.id.slice(0, 8).toUpperCase()}`,
    transactionDesc: "Rent payment",
  })) as any

  if (result.mocked) {
    return NextResponse.json({ error: "Payment could not be verified" }, { status: 502 })
  }
  if (result.ResponseCode !== "0") {
    return NextResponse.json(
      { error: result.CustomerMessage || "The payment prompt could not be sent" },
      { status: 502 },
    )
  }

  const { error: insertError } = await service.from("mpesa_transactions").insert({
    user_id: link.user_id,
    tenant_id: tenant.id,
    payment_id: invoice.id,
    phone,
    amount,
    merchant_request_id: result.MerchantRequestID,
    checkout_request_id: result.CheckoutRequestID,
    status: "initiated",
    result_desc: result.ResponseDescription ?? null,
    raw_response: {
      ResponseCode: result.ResponseCode,
      ResponseDescription: result.ResponseDescription ?? null,
    },
  })
  if (insertError) {
    console.error("[portal/pay] could not record the prompt", insertError.message)
    return NextResponse.json({ error: "The prompt was sent but could not be recorded. Contact your landlord." }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    checkout_request_id: result.CheckoutRequestID,
    amount,
    message: "Check your phone and enter your M-Pesa PIN to complete the payment.",
  })
}
