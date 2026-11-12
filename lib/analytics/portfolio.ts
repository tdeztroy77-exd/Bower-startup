/**
 * Portfolio analytics read model.
 *
 * One place that turns raw rows into the numbers the dashboard and reports
 * screen present: collection rate over time, arrears aging, concentration by
 * property, tenant risk, maintenance age and automation coverage.
 *
 * Pure computation over rows supplied by the caller — no network here, so the
 * same model can be unit-tested and reused by an API route or a server page.
 */

export type RentRow = {
  id: string
  amount: number | string | null
  status: string | null
  due_date: string | null
  payment_date?: string | null
  paid_date?: string | null
  property_id?: string | null
  tenant_id?: string | null
  payment_method?: string | null
}

export type ExpenseRow = {
  amount: number | string | null
  category: string | null
  expense_date: string | null
}

export type PropertyRow = { id: string; name: string; status: string | null }
export type TenantRow = {
  id: string
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  property_id?: string | null
  status?: string | null
}
export type MaintenanceRow = {
  id: string
  priority: string | null
  status: string | null
  created_at: string
  completed_date?: string | null
}
export type DocumentRow = { id: string; expiry_date: string | null }
export type LeaseRow = { id: string; lease_end_date: string | null; status: string | null }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAY = 86_400_000

const num = (value: unknown) => Number(value || 0)
const settled = (status: string | null) => status === "paid" || status === "completed"
const monthKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function tenantLabel(tenant: TenantRow | undefined): string {
  if (!tenant) return "Unknown tenant"
  if (tenant.full_name) return tenant.full_name
  return [tenant.first_name, tenant.last_name].filter(Boolean).join(" ") || "Unnamed tenant"
}

export interface PortfolioAnalytics {
  generatedAt: string
  months: number
  cashflow: {
    due: number
    collected: number
    outstanding: number
    expenses: number
    net: number
    collectRate: number
  }
  collectionTrend: Array<{ key: string; label: string; due: number; collected: number; rate: number }>
  arrearsAging: Array<{ bucket: string; amount: number; count: number }>
  expenseMix: Array<{ category: string; amount: number }>
  expenseTrend: Array<{ key: string; label: string; amount: number }>
  occupancy: { occupied: number; vacant: number; maintenance: number; total: number; rate: number }
  topProperties: Array<{
    id: string
    name: string
    collected: number
    outstanding: number
    collectRate: number
  }>
  tenantsAtRisk: Array<{
    id: string
    name: string
    property: string | null
    outstanding: number
    oldestDueDays: number
  }>
  maintenance: {
    active: number
    urgent: number
    completed30d: number
    avgAgeDays: number
    byPriority: Array<{ priority: string; count: number }>
  }
  paymentMix: Array<{ method: string; amount: number; count: number }>
  automationCoverage: {
    recurringExpenses: number
    documentsExpiring: number
    leasesExpiring: number
  }
}

export function buildPortfolioAnalytics(input: {
  rent: RentRow[]
  expenses: ExpenseRow[]
  properties: PropertyRow[]
  tenants: TenantRow[]
  maintenance: MaintenanceRow[]
  documents?: DocumentRow[]
  leases?: LeaseRow[]
  months?: number
  now?: Date
}): PortfolioAnalytics {
  const now = input.now ?? new Date()
  const months = Math.max(1, Math.min(input.months ?? 6, 24))
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1))
  const currentKey = monthKey(now)

  const tenantById = new Map(input.tenants.map((tenant) => [tenant.id, tenant]))
  const propertyById = new Map(input.properties.map((property) => [property.id, property]))
  const inWindow = (date: Date | null) => date !== null && date >= windowStart

  // ---- collection trend --------------------------------------------------
  const buckets = new Map<string, { due: number; collected: number; label: string }>()
  for (let index = 0; index < months; index += 1) {
    const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - index), 1))
    const key = monthKey(cursor)
    buckets.set(key, { due: 0, collected: 0, label: MONTHS[cursor.getUTCMonth()] })
  }

  for (const row of input.rent) {
    const due = parseDate(row.due_date)
    if (!inWindow(due)) continue
    const key = monthKey(due!)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.due += num(row.amount)
    if (settled(row.status)) bucket.collected += num(row.amount)
  }

  const collectionTrend = [...buckets.entries()].map(([key, bucket]) => ({
    key,
    label: bucket.label,
    due: Math.round(bucket.due),
    collected: Math.round(bucket.collected),
    rate: bucket.due > 0 ? Math.round((bucket.collected / bucket.due) * 100) : 0,
  }))

  // ---- current month cashflow -------------------------------------------
  const currentPayments = input.rent.filter((row) => {
    const due = parseDate(row.due_date)
    return due !== null && monthKey(due) === currentKey
  })
  const due = currentPayments.reduce((sum, row) => sum + num(row.amount), 0)
  const collected = currentPayments
    .filter((row) => settled(row.status))
    .reduce((sum, row) => sum + num(row.amount), 0)
  const expensesThisMonth = input.expenses
    .filter((row) => {
      const date = parseDate(row.expense_date)
      return date !== null && monthKey(date) === currentKey
    })
    .reduce((sum, row) => sum + num(row.amount), 0)

  // ---- arrears aging -----------------------------------------------------
  const aging = [
    { bucket: "0–30 days", amount: 0, count: 0, max: 30 },
    { bucket: "31–60 days", amount: 0, count: 0, max: 60 },
    { bucket: "61–90 days", amount: 0, count: 0, max: 90 },
    { bucket: "90+ days", amount: 0, count: 0, max: Number.POSITIVE_INFINITY },
  ]
  const unpaid = input.rent.filter(
    (row) => !settled(row.status) && !["cancelled", "canceled"].includes(row.status || ""),
  )
  for (const row of unpaid) {
    const dueDate = parseDate(row.due_date)
    if (!dueDate || dueDate > now) continue
    const daysLate = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / DAY))
    const bucket = aging.find((entry) => daysLate <= entry.max) ?? aging[aging.length - 1]
    bucket.amount += num(row.amount)
    bucket.count += 1
  }

  // ---- expenses ----------------------------------------------------------
  const mix = new Map<string, number>()
  for (const row of input.expenses) {
    const date = parseDate(row.expense_date)
    if (!inWindow(date)) continue
    const key = (row.category || "other").replace(/_/g, " ")
    mix.set(key, (mix.get(key) || 0) + num(row.amount))
  }
  const expenseMix = [...mix.entries()]
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)

  const expenseBuckets = new Map<string, number>()
  for (let index = 0; index < months; index += 1) {
    const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - index), 1))
    expenseBuckets.set(monthKey(cursor), 0)
  }
  for (const row of input.expenses) {
    const date = parseDate(row.expense_date)
    if (!inWindow(date)) continue
    const key = monthKey(date!)
    if (expenseBuckets.has(key)) {
      expenseBuckets.set(key, (expenseBuckets.get(key) || 0) + num(row.amount))
    }
  }
  const expenseTrend = [...expenseBuckets.entries()].map(([key, amount]) => ({
    key,
    label: MONTHS[Number(key.slice(5, 7)) - 1],
    amount: Math.round(amount),
  }))

  // ---- occupancy ---------------------------------------------------------
  const occupied = input.properties.filter((property) => property.status === "occupied").length
  const vacant = input.properties.filter(
    (property) => property.status === "available" || property.status === "vacant",
  ).length
  const maintenanceCount = input.properties.filter((property) => property.status === "maintenance").length
  const total = input.properties.length

  // ---- concentration by property ----------------------------------------
  const propertyStats = new Map<string, { collected: number; outstanding: number }>()
  for (const row of input.rent) {
    const dueDate = parseDate(row.due_date)
    if (!inWindow(dueDate) || !row.property_id) continue
    const entry = propertyStats.get(row.property_id) || { collected: 0, outstanding: 0 }
    if (settled(row.status)) entry.collected += num(row.amount)
    else if (!["cancelled", "canceled"].includes(row.status || "")) entry.outstanding += num(row.amount)
    propertyStats.set(row.property_id, entry)
  }
  const topProperties = [...propertyStats.entries()]
    .map(([id, stats]) => ({
      id,
      name: propertyById.get(id)?.name || "Unnamed property",
      collected: Math.round(stats.collected),
      outstanding: Math.round(stats.outstanding),
      collectRate:
        stats.collected + stats.outstanding > 0
          ? Math.round((stats.collected / (stats.collected + stats.outstanding)) * 100)
          : 0,
    }))
    .sort((a, b) => b.outstanding - a.outstanding || b.collected - a.collected)
    .slice(0, 6)

  // ---- tenant risk -------------------------------------------------------
  const riskMap = new Map<string, { outstanding: number; oldestDue: number }>()
  for (const row of unpaid) {
    const dueDate = parseDate(row.due_date)
    if (!dueDate || !row.tenant_id || dueDate > now) continue
    const entry = riskMap.get(row.tenant_id) || { outstanding: 0, oldestDue: dueDate.getTime() }
    entry.outstanding += num(row.amount)
    entry.oldestDue = Math.min(entry.oldestDue, dueDate.getTime())
    riskMap.set(row.tenant_id, entry)
  }
  const tenantsAtRisk = [...riskMap.entries()]
    .map(([id, stats]) => {
      const tenant = tenantById.get(id)
      return {
        id,
        name: tenantLabel(tenant),
        property: tenant?.property_id ? propertyById.get(tenant.property_id)?.name || null : null,
        outstanding: Math.round(stats.outstanding),
        oldestDueDays: Math.max(0, Math.floor((now.getTime() - stats.oldestDue) / DAY)),
      }
    })
    .filter((tenant) => tenant.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 8)

  // ---- maintenance -------------------------------------------------------
  const active = input.maintenance.filter(
    (row) => row.status === "open" || row.status === "in_progress",
  )
  const completed30d = input.maintenance.filter((row) => {
    if (row.status !== "completed") return false
    const completed = parseDate(row.completed_date) ?? parseDate(row.created_at)
    return completed !== null && completed.getTime() >= now.getTime() - 30 * DAY
  }).length
  const avgAgeDays =
    active.length === 0
      ? 0
      : Math.round(
          active.reduce((sum, row) => {
            const created = parseDate(row.created_at)
            return sum + (created ? Math.max(0, (now.getTime() - created.getTime()) / DAY) : 0)
          }, 0) / active.length,
        )
  const priorityOrder = ["urgent", "high", "medium", "low"]
  const byPriority = priorityOrder.map((priority) => ({
    priority,
    count: active.filter((row) => row.priority === priority).length,
  }))

  // ---- payment mix -------------------------------------------------------
  const methods = new Map<string, { amount: number; count: number }>()
  for (const row of input.rent) {
    const dueDate = parseDate(row.due_date)
    if (!inWindow(dueDate) || !settled(row.status)) continue
    const method = (row.payment_method || "unspecified").replace(/_/g, " ")
    const entry = methods.get(method) || { amount: 0, count: 0 }
    entry.amount += num(row.amount)
    entry.count += 1
    methods.set(method, entry)
  }
  const paymentMix = [...methods.entries()]
    .map(([method, stats]) => ({ method, amount: Math.round(stats.amount), count: stats.count }))
    .sort((a, b) => b.amount - a.amount)

  // ---- automation coverage ----------------------------------------------
  const inDays = (days: number) => new Date(now.getTime() + days * DAY)
  const documentsExpiring = (input.documents ?? []).filter((doc) => {
    const expiry = parseDate(doc.expiry_date)
    return expiry !== null && expiry >= now && expiry <= inDays(45)
  }).length
  const leasesExpiring = (input.leases ?? []).filter((lease) => {
    if (lease.status !== "active") return false
    const end = parseDate(lease.lease_end_date)
    return end !== null && end >= now && end <= inDays(60)
  }).length

  return {
    generatedAt: now.toISOString(),
    months,
    cashflow: {
      due: Math.round(due),
      collected: Math.round(collected),
      outstanding: Math.max(0, Math.round(due - collected)),
      expenses: Math.round(expensesThisMonth),
      net: Math.round(collected - expensesThisMonth),
      collectRate: due > 0 ? Math.round((collected / due) * 100) : 0,
    },
    collectionTrend,
    arrearsAging: aging.map(({ bucket, amount, count }) => ({ bucket, amount: Math.round(amount), count })),
    expenseMix,
    expenseTrend,
    occupancy: {
      occupied,
      vacant,
      maintenance: maintenanceCount,
      total,
      rate: total > 0 ? Math.round((occupied / total) * 100) : 0,
    },
    topProperties,
    tenantsAtRisk,
    maintenance: {
      active: active.length,
      urgent: active.filter((row) => row.priority === "urgent").length,
      completed30d,
      avgAgeDays,
      byPriority,
    },
    paymentMix,
    automationCoverage: {
      recurringExpenses: 0, // filled by the caller when the table is available
      documentsExpiring,
      leasesExpiring,
    },
  }
}
