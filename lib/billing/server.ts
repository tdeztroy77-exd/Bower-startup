import { createClient } from "@supabase/supabase-js"

/**
 * Server-side billing helpers.
 *
 * Entitlement changes are intentionally centralised here: every activation
 * goes through the `grant_subscription_period` RPC, which is idempotent per
 * payment. The browser never has write access to the subscription tables.
 */

export function billingDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Billing database is not configured")
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export function billingConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export type GrantResult = {
  applied: boolean
  already_applied?: boolean
  period_start?: string
  period_end?: string
  status?: string
  invoice_no?: string
}

/**
 * Apply a successful payment to the subscription. Safe to call from the
 * client poll, the Daraja callback and a webhook concurrently: the RPC locks
 * the payment row and refuses to grant twice.
 */
export async function grantPeriod(
  db: ReturnType<typeof billingDb>,
  userId: string,
  paymentId: string,
  days = 30,
): Promise<GrantResult> {
  const { data, error } = await db.rpc("grant_subscription_period", {
    p_user: userId,
    p_payment_id: paymentId,
    p_days: days,
  })
  if (error) throw new Error(`Could not apply payment: ${error.message}`)
  return (data || { applied: false }) as GrantResult
}

export async function notifyUser(
  db: ReturnType<typeof billingDb>,
  userId: string,
  input: {
    type: string
    title: string
    message: string
    severity?: "info" | "warning" | "critical" | "success"
    link?: string
    metadata?: Record<string, unknown>
  },
) {
  const { error } = await db.from("notifications").insert({
    user_id: userId,
    type: input.type,
    title: input.title,
    message: input.message,
    severity: input.severity ?? "info",
    link: input.link ?? "/dashboard/billing",
    metadata: input.metadata ?? null,
  })
  if (error) console.error("[billing] notification insert failed", error.message)
}

export async function recordSubscriptionEvent(
  db: ReturnType<typeof billingDb>,
  input: {
    userId: string
    event: string
    toStatus?: string
    fromStatus?: string
    reason?: string
    metadata?: Record<string, unknown>
  },
) {
  const { error } = await db.from("subscription_events").insert({
    user_id: input.userId,
    event: input.event,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    reason: input.reason ?? null,
    actor: "system",
    metadata: input.metadata ?? null,
  })
  if (error) console.error("[billing] event insert failed", error.message)
}

/** Find a subscription payment by the Daraja checkout id. */
export async function findSubscriptionPaymentByCheckout(
  db: ReturnType<typeof billingDb>,
  checkoutRequestId: string,
) {
  const { data, error } = await db
    .from("subscription_payments")
    .select("*")
    .eq("checkout_request_id", checkoutRequestId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}
