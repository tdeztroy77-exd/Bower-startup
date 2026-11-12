import { withAuth, successResponse, errorResponse, HttpError } from "@/lib/api"
import { darajaPaymentsAvailable, stkPush } from "@/lib/mpesa/daraja"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/subscription/checkout
 * Body: { plan: "pro", phone: string }
 *
 * Starts an M-Pesa STK prompt for a subscription month. The payment is only
 * applied once Daraja confirms it — either via the callback or the status
 * poll — through the idempotent `grant_subscription_period` RPC.
 */
export const POST = withAuth(async (req, { supabase, userId }) => {
  const body = (await req.json().catch(() => ({}))) as { plan?: string; phone?: string }
  const plan = (body.plan || "").toString()
  const rawPhone = (body.phone || "").toString().trim()

  if (plan !== "pro") throw new HttpError("Bower currently has one subscription plan", 400)

  const phone = rawPhone.replace(/[^\d+]/g, "")
  if (!/^(?:\+?254|0)?7\d{8}$/.test(phone)) {
    throw new HttpError("Enter a valid M-Pesa number (07XX XXX XXX)", 400)
  }

  const { data: planRow, error: planErr } = await supabase
    .from("plans")
    .select("price_kes, code, name")
    .eq("code", plan)
    .single()
  if (planErr || !planRow) throw new HttpError("Plan not found", 404)

  const amount = Number(planRow.price_kes)
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new HttpError("Plan pricing is unavailable", 503)
  }

  // Reuse a prompt that is still fresh; retire one that will never settle.
  const { data: pending } = await supabase
    .from("subscription_payments")
    .select("id, checkout_request_id, status, created_at")
    .eq("user_id", userId)
    .eq("plan_code", plan)
    .in("status", ["initiated", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (pending?.checkout_request_id) {
    const ageMs = Date.now() - new Date(pending.created_at).getTime()
    if (ageMs < 5 * 60 * 1000) {
      return successResponse({
        status: "initiated",
        checkout_request_id: pending.checkout_request_id,
        tx_id: pending.id,
        reused: true,
      })
    }
    await supabase
      .from("subscription_payments")
      .update({ status: "canceled", result_desc: "Prompt expired before confirmation" })
      .eq("id", pending.id)
  }

  if (!darajaPaymentsAvailable()) {
    return errorResponse(
      "Mobile payment is temporarily unavailable. Use card payment or try again later.",
      503,
    )
  }

  const result = (await stkPush({
    phone,
    amount,
    accountReference: `SUB-${plan.toUpperCase()}`,
    transactionDesc: `Bower ${planRow.name}`,
  }).catch((error: unknown) => ({
    error: error instanceof Error ? error.message : "gateway error",
  }))) as any

  if (result.error) {
    console.error("[api] subscription/checkout daraja call failed", result.error)
    return errorResponse("Could not reach the M-Pesa gateway", 502)
  }

  const ok = result.ResponseCode === "0"

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error("[api] subscription/checkout requires the service role key to record payments")
    return errorResponse("Billing is not configured", 503)
  }
  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: tx, error: insertError } = await adminClient
    .from("subscription_payments")
    .insert({
      user_id: userId,
      plan_code: plan,
      amount,
      phone,
      provider: "mpesa",
      kind: "initial",
      checkout_request_id: result.CheckoutRequestID,
      merchant_request_id: result.MerchantRequestID,
      status: ok ? "initiated" : "failed",
      result_desc: result.ResponseDescription,
    })
    .select("id")
    .single()

  if (insertError) {
    console.error("[api] subscription/checkout could not record payment", insertError.message)
    return errorResponse(
      "The payment request was accepted but could not be recorded. Contact support before retrying.",
      500,
    )
  }

  return successResponse({
    checkout_request_id: result.CheckoutRequestID,
    merchant_request_id: result.MerchantRequestID,
    status: ok ? "initiated" : "failed",
    amount,
    plan,
    tx_id: tx?.id,
  })
})
