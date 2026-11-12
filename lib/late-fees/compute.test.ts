import { describe, expect, it } from "vitest"
import { computeLateFee, DEFAULT_POLICY, type LateFeePolicy } from "./compute"

const now = new Date("2026-11-20T00:00:00Z")
const base: LateFeePolicy = { ...DEFAULT_POLICY, enabled: true, grace_days: 5, fee_type: "flat", amount: 500, cap: 5000 }

const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10)

describe("late fee computation", () => {
  it("does nothing while disabled", () => {
    expect(computeLateFee({ invoiceAmount: 30000, dueDate: daysAgo(30), policy: { ...base, enabled: false }, now }))
      .toMatchObject({ applicable: false, reason: "policy_disabled" })
  })

  it("does nothing inside the grace period", () => {
    expect(computeLateFee({ invoiceAmount: 30000, dueDate: daysAgo(5), policy: base, now }))
      .toMatchObject({ applicable: false, reason: "in_grace" })
  })

  it("applies a flat fee after grace", () => {
    expect(computeLateFee({ invoiceAmount: 30000, dueDate: daysAgo(6), policy: base, now }))
      .toMatchObject({ applicable: true, fee: 500, daysLate: 6 })
  })

  it("applies a percentage fee and respects the cap", () => {
    const percent: LateFeePolicy = { ...base, fee_type: "percent", percent: 10, cap: 2000 }
    expect(computeLateFee({ invoiceAmount: 30000, dueDate: daysAgo(10), policy: percent, now }).fee).toBe(2000)
    expect(computeLateFee({ invoiceAmount: 10000, dueDate: daysAgo(10), policy: percent, now }).fee).toBe(1000)
  })

  it("never returns a negative or zero charge", () => {
    expect(computeLateFee({ invoiceAmount: 0, dueDate: daysAgo(10), policy: base, now }))
      .toMatchObject({ applicable: false, reason: "no_amount" })
    expect(computeLateFee({ invoiceAmount: 1000, dueDate: daysAgo(10), policy: { ...base, amount: 0 }, now }))
      .toMatchObject({ applicable: false, reason: "zero_fee" })
  })

  it("ignores a missing due date", () => {
    expect(computeLateFee({ invoiceAmount: 1000, dueDate: null, policy: base, now }))
      .toMatchObject({ applicable: false, reason: "no_due_date" })
  })
})
