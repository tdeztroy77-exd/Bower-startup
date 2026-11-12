import { describe, expect, it } from "vitest"
import {
  computeNextPeriod,
  describeEntitlement,
  evaluateEntitlement,
  isRenewalDue,
  type SubscriptionRow,
} from "./period"

const now = new Date("2026-11-10T12:00:00Z")
const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString()

describe("computeNextPeriod", () => {
  it("starts after a paid period so early payment never loses days", () => {
    const { start, end } = computeNextPeriod(
      { status: "active", current_period_end: days(12) },
      now,
    )
    expect(start.toISOString()).toBe(days(12))
    expect(end.toISOString()).toBe(days(42))
  })

  it("starts after the trial when paying during a trial", () => {
    const { start } = computeNextPeriod(
      { status: "trialing", trial_ends_at: days(5) },
      now,
    )
    expect(start.toISOString()).toBe(days(5))
  })

  it("starts now when everything has lapsed", () => {
    const { start } = computeNextPeriod(
      { status: "expired", current_period_end: days(-40) },
      now,
    )
    expect(start.toISOString()).toBe(now.toISOString())
  })
})

describe("evaluateEntitlement", () => {
  it("keeps access during the grace window", () => {
    const row: SubscriptionRow = {
      status: "past_due",
      current_period_end: days(-1),
      grace_ends_at: days(2),
    }
    const result = evaluateEntitlement(row, now)
    expect(result.active).toBe(true)
    expect(result.inGrace).toBe(true)
    expect(result.reason).toBe("past_due")
  })

  it("pauses access after grace", () => {
    const row: SubscriptionRow = {
      status: "past_due",
      current_period_end: days(-5),
      grace_ends_at: days(-1),
    }
    expect(evaluateEntitlement(row, now).active).toBe(false)
  })

  it("keeps access until the cancellation date", () => {
    const row: SubscriptionRow = {
      status: "canceled",
      cancel_at: days(8),
      current_period_end: days(8),
    }
    const result = evaluateEntitlement(row, now)
    expect(result.active).toBe(true)
    expect(result.reason).toBe("canceled")
    expect(result.daysLeft).toBe(8)
  })

  it("ends a trial at its end date", () => {
    const row: SubscriptionRow = { status: "trialing", trial_ends_at: days(-1) }
    expect(evaluateEntitlement(row, now)).toMatchObject({ active: false, reason: "trial_ended" })
  })

  it("flags a paid period that has ended", () => {
    const row: SubscriptionRow = { status: "active", current_period_end: days(-2) }
    expect(evaluateEntitlement(row, now)).toMatchObject({ active: false, reason: "renewal_due" })
  })
})

describe("isRenewalDue", () => {
  const base: SubscriptionRow = {
    status: "active",
    current_period_end: days(1),
    auto_renew: true,
    last_payment_method: "mpesa_stk",
    payment_phone: "254712345678",
    renewal_attempts: 0,
  }

  it("is due inside the two-day lead window", () => {
    expect(isRenewalDue(base, now)).toBe(true)
  })

  it("is not due too early", () => {
    expect(isRenewalDue({ ...base, current_period_end: days(10) }, now)).toBe(false)
  })

  it("never renews a Stripe subscription by prompt", () => {
    expect(isRenewalDue({ ...base, last_payment_method: "stripe" }, now)).toBe(false)
  })

  it("respects auto-renew off and the attempt cap", () => {
    expect(isRenewalDue({ ...base, auto_renew: false }, now)).toBe(false)
    expect(isRenewalDue({ ...base, renewal_attempts: 3 }, now)).toBe(false)
  })

  it("waits 20 hours between attempts", () => {
    const recent = new Date(now.getTime() - 3 * 3_600_000).toISOString()
    expect(isRenewalDue({ ...base, last_renewal_attempt_at: recent }, now)).toBe(false)
  })
})

describe("describeEntitlement", () => {
  it("reads like a sentence, not a status code", () => {
    const text = describeEntitlement(evaluateEntitlement({ status: "trialing", trial_ends_at: days(4) }, now))
    expect(text).toContain("4 days left")
  })
})
