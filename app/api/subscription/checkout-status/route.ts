import { withAuth, successResponse, errorResponse, dbError } from "@/lib/api"
import { stkQuery, darajaConfig } from "@/lib/mpesa/daraja"
import { billingDb, billingConfigured, grantPeriod, notifyUser } from "@/lib/billing/server"

/**
 * GET /api/subscription/checkout-status?checkout=<CheckoutRequestID>
 *
 * Polls Daraja and, when the prompt settled, applies the payment through the
 * idempotent `grant_subscription_period` RPC. The same grant also runs from
 * the Daraja callback, so closing this tab no longer loses a paid month.
 */
export const GET = withAuth(async (req, { supabase, userId }) => {
  const url = new URL(req.url)
  const checkout = url.searchParams.get("checkout")
  if (!checkout) return errorResponse("Provide ?checkout=", 400)

  const { data: row, error: rowErr } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("checkout_request_id", checkout)
    .eq("user_id", userId)
    .maybeSingle()
  if (rowErr) return dbError("subscription/checkout-status", rowErr, 500)
  if (!row) return errorResponse("Payment not found", 404)

  if (["active", "subscribed"].includes(row.status)) {
    return successResponse({ ...row, status: "active" })
  }
  if (row.status === "failed" || row.status === "canceled") {
    return successResponse(row)
  }

  const result = (await stkQuery(checkout).catch((e) => ({ error: e.message }))) as any
  if (result.error) {
    console.error("[api] subscription/checkout-status daraja query failed", result.error)
    return errorResponse("Could not reach the M-Pesa gateway", 502)
  }

  // A simulated response must never activate a paid plan.
  if (result.mocked) {
    console.warn("[api] subscription/checkout-status refused a MOCKED Daraja result", { checkout })
    return errorResponse("Payment could not be verified", 502)
  }

  // In production the entitlement may only come from the real gateway.
  if (process.env.NODE_ENV === "production" && darajaConfig().env !== "production") {
    console.warn("[api] subscription/checkout-status refused a non-production Daraja result", { checkout })
    return errorResponse("Payment could not be verified", 502)
  }

  const completed = result.ResultCode === "0"
  const nextStatus = result.ResultCode === null ? "pending" : completed ? "active" : "failed"

  if (!billingConfigured()) {
    return errorResponse("Billing is not configured", 503)
  }
  const db = billingDb()

  if (!completed) {
    await db
      .from("subscription_payments")
      .update({
        status: nextStatus,
        result_code: result.ResultCode ?? null,
        result_desc: result.ResultDesc ?? null,
      })
      .eq("id", row.id)
      .in("status", ["initiated", "pending"])
    return successResponse({
      status: nextStatus,
      plan: row.plan_code,
      amount: row.amount,
      result_desc: result.ResultDesc,
    })
  }

  const grant = await grantPeriod(db, userId, row.id, 30)
  await db
    .from("subscription_payments")
    .update({
      result_code: result.ResultCode,
      result_desc: result.ResultDesc ?? "Confirmed by M-Pesa",
      completed_at: new Date().toISOString(),
    })
    .eq("id", row.id)

  await notifyUser(db, userId, {
    type: "billing_payment_succeeded",
    title: "Payment received",
    message: `Your Bower plan is active. Receipt ${grant.invoice_no ?? ""}`.trim(),
    severity: "success",
    link: "/dashboard/billing",
    metadata: { payment_id: row.id, invoice_no: grant.invoice_no ?? null },
  })

  return successResponse({
    status: "active",
    plan: row.plan_code,
    amount: row.amount,
    result_desc: result.ResultDesc,
    period_end: grant.period_end,
    invoice_no: grant.invoice_no,
  })
})
