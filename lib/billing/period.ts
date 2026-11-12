/**
 * Subscription period maths.
 *
 * Kept pure so the same rules can be reasoned about (and tested) without a
 * database. The SQL functions in `21-billing-lifecycle.sql` are the source of
 * truth for mutations; these helpers are used by the renewal job, the status
 * fallback and the UI copy.
 */

export const DEFAULT_PERIOD_DAYS = 30
export const GRACE_DAYS = 3
export const RENEWAL_LEAD_DAYS = 2
export const MAX_RENEWAL_ATTEMPTS = 3

export type SubscriptionRow = {
  status: "trialing" | "active" | "past_due" | "canceled" | "expired"
  trial_ends_at?: string | null
  current_period_start?: string | null
  current_period_end?: string | null
  grace_ends_at?: string | null
  cancel_at?: string | null
  auto_renew?: boolean | null
  last_payment_method?: string | null
  payment_phone?: string | null
  renewal_attempts?: number | null
  last_renewal_attempt_at?: string | null
}

const DAY_MS = 86_400_000

function later(a: number, b: number): number {
  return Math.max(a, b)
}

/**
 * A payment extends access from whichever is later: now, the end of the
 * current paid period, or the end of a trial. Paying on day 3 of a trial
 * therefore does not throw the remaining trial days away.
 */
export function computeNextPeriod(
  row: Pick<SubscriptionRow, "status" | "current_period_end" | "trial_ends_at">,
  now = new Date(),
  days = DEFAULT_PERIOD_DAYS,
): { start: Date; end: Date } {
  const candidates = [now.getTime()]
  if (row.current_period_end) candidates.push(new Date(row.current_period_end).getTime())
  if (row.status === "trialing" && row.trial_ends_at) candidates.push(new Date(row.trial_ends_at).getTime())

  const start = new Date(later(candidates[0], Math.max(...candidates.slice(1), candidates[0])))
  return { start, end: new Date(start.getTime() + days * DAY_MS) }
}

export type Entitlement = {
  active: boolean
  /** Why access is in this state, for UI copy and middleware redirects. */
  reason:
    | "no_subscription"
    | "trialing"
    | "active"
    | "renewal_due"
    | "past_due"
    | "trial_ended"
    | "canceled"
    | "expired"
  daysLeft: number
  inGrace: boolean
  endsAt: Date | null
}

/** Mirrors `public.subscription_status()` for callers without a database. */
export function evaluateEntitlement(
  row: SubscriptionRow | null,
  now = new Date(),
): Entitlement {
  if (!row) {
    return { active: false, reason: "no_subscription", daysLeft: 0, inGrace: false, endsAt: null }
  }

  const nowMs = now.getTime()
  const trialEnd = row.trial_ends_at ? new Date(row.trial_ends_at).getTime() : null
  const periodEnd = row.current_period_end ? new Date(row.current_period_end).getTime() : null
  const graceEnd = row.grace_ends_at ? new Date(row.grace_ends_at).getTime() : null

  const trialExpired = row.status === "trialing" && trialEnd !== null && trialEnd <= nowMs
  const inGrace = row.status === "past_due" && graceEnd !== null && graceEnd > nowMs

  if (trialExpired) {
    return { active: false, reason: "trial_ended", daysLeft: 0, inGrace: false, endsAt: trialEnd ? new Date(trialEnd) : null }
  }

  if (row.status === "canceled") {
    const until = row.cancel_at ? new Date(row.cancel_at).getTime() : null
    if (until !== null && until > nowMs) {
      return {
        active: true,
        reason: "canceled",
        daysLeft: Math.ceil((until - nowMs) / DAY_MS),
        inGrace: false,
        endsAt: new Date(until),
      }
    }
    return { active: false, reason: "expired", daysLeft: 0, inGrace: false, endsAt: until ? new Date(until) : null }
  }

  if (row.status === "expired") {
    return { active: false, reason: "expired", daysLeft: 0, inGrace: false, endsAt: periodEnd ? new Date(periodEnd) : null }
  }

  if (row.status === "past_due") {
    if (inGrace) {
      return {
        active: true,
        reason: "past_due",
        daysLeft: Math.ceil((graceEnd! - nowMs) / DAY_MS),
        inGrace: true,
        endsAt: new Date(graceEnd!),
      }
    }
    return { active: false, reason: "past_due", daysLeft: 0, inGrace: false, endsAt: graceEnd ? new Date(graceEnd) : null }
  }

  if (row.status === "trialing") {
    return {
      active: true,
      reason: "trialing",
      daysLeft: trialEnd ? Math.max(0, Math.ceil((trialEnd - nowMs) / DAY_MS)) : 0,
      inGrace: false,
      endsAt: trialEnd ? new Date(trialEnd) : null,
    }
  }

  // active
  if (periodEnd !== null && periodEnd <= nowMs) {
    return {
      active: false,
      reason: "renewal_due",
      daysLeft: 0,
      inGrace: false,
      endsAt: new Date(periodEnd),
    }
  }

  return {
    active: true,
    reason: "active",
    daysLeft: periodEnd ? Math.max(0, Math.ceil((periodEnd - nowMs) / DAY_MS)) : 0,
    inGrace: false,
    endsAt: periodEnd ? new Date(periodEnd) : null,
  }
}

/**
 * Should the renewal job send an M-Pesa prompt for this subscription?
 *
 * Stripe subscriptions renew themselves via Stripe; only M-Pesa needs a
 * prompt. We stop after a few attempts so a dead SIM does not generate
 * prompts forever.
 */
export function isRenewalDue(row: SubscriptionRow, now = new Date()): boolean {
  if (!row.current_period_end) return false
  if (!["active", "past_due"].includes(row.status)) return false
  if (row.auto_renew === false) return false
  if (!["mpesa_stk", "mpesa_paybill"].includes(row.last_payment_method || "")) return false
  if (!row.payment_phone) return false
  if ((row.renewal_attempts ?? 0) >= MAX_RENEWAL_ATTEMPTS) return false

  const dueAt = new Date(row.current_period_end).getTime() - RENEWAL_LEAD_DAYS * DAY_MS
  if (now.getTime() < dueAt) return false

  if (row.last_renewal_attempt_at) {
    const hoursSince = (now.getTime() - new Date(row.last_renewal_attempt_at).getTime()) / 3_600_000
    if (hoursSince < 20) return false
  }
  return true
}

/** Human copy for the billing screen. */
export function describeEntitlement(entitlement: Entitlement): string {
  switch (entitlement.reason) {
    case "trialing":
      return entitlement.daysLeft === 0
        ? "Your trial ends today."
        : `${entitlement.daysLeft} day${entitlement.daysLeft === 1 ? "" : "s"} left in your trial.`
    case "active":
      return entitlement.daysLeft === 0
        ? "Your plan renews today."
        : `Your plan renews in ${entitlement.daysLeft} day${entitlement.daysLeft === 1 ? "" : "s"}.`
    case "renewal_due":
      return "Your paid period has ended. Renew to keep access."
    case "past_due":
      return entitlement.inGrace
        ? `Payment failed. You have ${entitlement.daysLeft} day${entitlement.daysLeft === 1 ? "" : "s"} before access pauses.`
        : "Payment failed and the grace period has ended."
    case "trial_ended":
      return "Your trial has ended. Choose a plan to keep your workspace."
    case "canceled":
      return entitlement.daysLeft > 0
        ? `Cancelled. Access continues for ${entitlement.daysLeft} more day${entitlement.daysLeft === 1 ? "" : "s"}.`
        : "Cancelled."
    case "expired":
      return "Your subscription has ended."
    default:
      return "No active subscription."
  }
}
