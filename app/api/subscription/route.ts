import { withAuth, successResponse, errorResponse, HttpError, dbError } from "@/lib/api"
import { getDb, neonConfigured } from "@/lib/db/neon"
import { billingConfigured, billingDb, notifyUser } from "@/lib/billing/server"

/**
 * GET /api/subscription
 * Returns the current user's subscription state, including grace, renewal and
 * payment-method fields. The read model is `subscription_status()`.
 */
export const GET = withAuth(async (_req, { supabase, userId }) => {
  if (neonConfigured()) {
    const sql = getDb()
    await sql`select public.ensure_subscription(${userId}::uuid)`.catch(() => null)
    const rows = await sql`select * from public.subscription_status(${userId}::uuid)` as any[]
    const status = rows?.[0]?.subscription_status || rows?.[0] || null
    if (!status) {
      return successResponse({
        has_subscription: false,
        is_active: false,
        is_trialing: false,
        trial_expired: false,
        days_left: 0,
        plan: null,
        plan_name: null,
        reason: "no_subscription",
      })
    }
    let planName: string | null = null
    if (status.plan) {
      const p = await sql`select name from public.plans where code = ${status.plan}`
      planName = p?.[0]?.name || null
    }
    return successResponse({ ...status, plan_name: planName })
  }

  await supabase.rpc("ensure_subscription", { p_user: userId }).catch(() => null)
  const { data, error } = await supabase.rpc("subscription_status", { p_user: userId })
  if (error) return dbError("subscription", error, 500)
  if (!data) {
    return successResponse({
      has_subscription: false,
      is_active: false,
      is_trialing: false,
      trial_expired: false,
      days_left: 0,
      plan: null,
      plan_name: null,
      reason: "no_subscription",
    })
  }
  return successResponse(data)
})

/**
 * PATCH /api/subscription
 * Body: { cancel?: true, reactivate?: true, auto_renew?: boolean, payment_phone?: string }
 *
 * Mutations go through SECURITY DEFINER functions or the service role. The
 * browser has no write access to the subscriptions table, so a landlord
 * cannot grant themselves access by editing the row directly.
 */
export const PATCH = withAuth(async (req, { supabase, userId }) => {
  if (!billingConfigured()) return errorResponse("Billing is not configured", 503)
  const db = billingDb()
  const body = (await req.json().catch(() => ({}))) as {
    cancel?: boolean
    reactivate?: boolean
    auto_renew?: boolean
    payment_phone?: string
  }

  const { data: current, error: currentError } = await db
    .from("subscriptions")
    .select("status, plan_code, current_period_end, trial_ends_at, auto_renew")
    .eq("user_id", userId)
    .maybeSingle()
  if (currentError) return dbError("subscription", currentError, 500)
  if (!current) return errorResponse("Subscription not found", 404)

  if (body.cancel === true) {
    // These RPCs read auth.uid(), so they must run on the user-scoped client.
    const { data, error } = await supabase.rpc("cancel_own_subscription")
    if (error) return dbError("subscription cancel", error, 500)
    return successResponse(data)
  }

  if (body.reactivate === true) {
    const { data, error } = await supabase.rpc("reactivate_own_subscription")
    if (error) return dbError("subscription reactivate", error, 500)
    return successResponse(data)
  }

  const patch: Record<string, unknown> = {}
  if (typeof body.auto_renew === "boolean") {
    patch.auto_renew = body.auto_renew
  }
  if (typeof body.payment_phone === "string") {
    const phone = body.payment_phone.replace(/[^\d+]/g, "")
    if (!/^(?:\+?254|0)?7\d{8}$/.test(phone)) {
      throw new HttpError("Enter a valid M-Pesa number (07XX XXX XXX)", 400)
    }
    patch.payment_phone = phone.startsWith("+") ? phone.slice(1) : phone
  }

  if (Object.keys(patch).length === 0) {
    throw new HttpError("Nothing to update", 400)
  }

  const { data, error } = await db
    .from("subscriptions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select("auto_renew, payment_phone, status")
    .single()
  if (error) return dbError("subscription update", error, 500)

  if (typeof body.auto_renew === "boolean") {
    await notifyUser(db, userId, {
      type: "billing_auto_renew_changed",
      title: body.auto_renew ? "Auto-renew is on" : "Auto-renew is off",
      message: body.auto_renew
        ? "We will send an M-Pesa prompt before each renewal."
        : "You will need to renew manually from billing when the period ends.",
      severity: "info",
      link: "/dashboard/billing",
    })
  }

  return successResponse(data)
})
