import { describe, expect, it } from "vitest"
import { buildPortfolioAnalytics } from "./portfolio"

const now = new Date("2026-11-15T12:00:00Z")
const date = (iso: string) => iso

const base = {
  properties: [
    { id: "p1", name: "Kilimani Heights", status: "occupied" },
    { id: "p2", name: "Westlands Loft", status: "occupied" },
    { id: "p3", name: "RayElite Court", status: "vacant" },
    { id: "p4", name: "Old Town Studio", status: "maintenance" },
  ],
  tenants: [
    { id: "t1", full_name: "Amina Wanjiku", property_id: "p1", status: "active" },
    { id: "t2", full_name: "Peter Mwangi", property_id: "p2", status: "active" },
    { id: "t3", full_name: "Grace Njeri", property_id: "p1", status: "active" },
  ],
}

describe("buildPortfolioAnalytics", () => {
  it("computes the current month collection rate and outstanding rent", () => {
    const analytics = buildPortfolioAnalytics({
      ...base,
      now,
      rent: [
        { id: "r1", amount: 40000, status: "paid", due_date: date("2026-11-01"), property_id: "p1", tenant_id: "t1" },
        { id: "r2", amount: 20000, status: "pending", due_date: date("2026-11-05"), property_id: "p1", tenant_id: "t3" },
        { id: "r3", amount: 30000, status: "paid", due_date: date("2026-10-01"), property_id: "p2", tenant_id: "t2" },
      ],
      expenses: [{ amount: 12000, category: "repairs", expense_date: date("2026-11-02") }],
      maintenance: [],
    })

    expect(analytics.cashflow.due).toBe(60000)
    expect(analytics.cashflow.collected).toBe(40000)
    expect(analytics.cashflow.outstanding).toBe(20000)
    expect(analytics.cashflow.collectRate).toBe(67)
    expect(analytics.cashflow.expenses).toBe(12000)
    expect(analytics.cashflow.net).toBe(28000)
  })

  it("buckets arrears by age instead of lumping them together", () => {
    const analytics = buildPortfolioAnalytics({
      ...base,
      now,
      rent: [
        { id: "r1", amount: 1000, status: "late", due_date: date("2026-11-01"), tenant_id: "t1", property_id: "p1" },
        { id: "r2", amount: 2000, status: "pending", due_date: date("2026-10-10"), tenant_id: "t1", property_id: "p1" },
        { id: "r3", amount: 3000, status: "pending", due_date: date("2026-08-01"), tenant_id: "t2", property_id: "p2" },
        { id: "r4", amount: 4000, status: "paid", due_date: date("2026-07-01"), tenant_id: "t2", property_id: "p2" },
      ],
      expenses: [],
      maintenance: [],
    })

    const buckets = Object.fromEntries(analytics.arrearsAging.map((bucket) => [bucket.bucket, bucket.amount]))
    expect(buckets["0–30 days"]).toBe(1000)
    expect(buckets["31–60 days"]).toBe(2000)
    expect(buckets["90+ days"]).toBe(3000)
  })

  it("ranks tenants by outstanding balance and keeps the oldest debt age", () => {
    const analytics = buildPortfolioAnalytics({
      ...base,
      now,
      rent: [
        { id: "r1", amount: 5000, status: "pending", due_date: date("2026-09-01"), tenant_id: "t1", property_id: "p1" },
        { id: "r2", amount: 9000, status: "pending", due_date: date("2026-11-01"), tenant_id: "t2", property_id: "p2" },
      ],
      expenses: [],
      maintenance: [],
    })

    expect(analytics.tenantsAtRisk[0].name).toBe("Peter Mwangi")
    expect(analytics.tenantsAtRisk[0].outstanding).toBe(9000)
    expect(analytics.tenantsAtRisk[1].oldestDueDays).toBeGreaterThan(60)
  })

  it("computes occupancy from property status", () => {
    const analytics = buildPortfolioAnalytics({ ...base, now, rent: [], expenses: [], maintenance: [] })
    expect(analytics.occupancy).toMatchObject({ occupied: 2, vacant: 1, maintenance: 1, total: 4, rate: 50 })
  })

  it("averages the age of open work orders and counts completions", () => {
    const analytics = buildPortfolioAnalytics({
      ...base,
      now: new Date("2026-11-15T00:00:00Z"),
      rent: [],
      expenses: [],
      maintenance: [
        { id: "m1", priority: "urgent", status: "open", created_at: date("2026-11-05T00:00:00Z") },
        { id: "m2", priority: "low", status: "in_progress", created_at: date("2026-11-01T00:00:00Z") },
        { id: "m3", priority: "medium", status: "completed", created_at: date("2026-11-02T00:00:00Z"), completed_date: date("2026-11-10") },
      ],
    })
    expect(analytics.maintenance.active).toBe(2)
    expect(analytics.maintenance.urgent).toBe(1)
    expect(analytics.maintenance.completed30d).toBe(1)
    expect(analytics.maintenance.avgAgeDays).toBe(12)
  })

  it("separates expense categories and payment channels", () => {
    const analytics = buildPortfolioAnalytics({
      ...base,
      now,
      rent: [
        { id: "r1", amount: 10000, status: "paid", due_date: date("2026-11-01"), payment_method: "mpesa", tenant_id: "t1", property_id: "p1" },
        { id: "r2", amount: 5000, status: "paid", due_date: date("2026-11-02"), payment_method: "cash", tenant_id: "t2", property_id: "p2" },
      ],
      expenses: [
        { amount: 3000, category: "utilities", expense_date: date("2026-11-03") },
        { amount: 2000, category: "repairs", expense_date: date("2026-11-04") },
      ],
      maintenance: [],
    })
    expect(analytics.expenseMix).toEqual([
      { category: "utilities", amount: 3000 },
      { category: "repairs", amount: 2000 },
    ])
    expect(analytics.paymentMix[0]).toMatchObject({ method: "mpesa", amount: 10000, count: 1 })
  })
})
