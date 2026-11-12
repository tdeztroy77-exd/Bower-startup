import { withAuth, successResponse, throwUnlessMissingTable } from "@/lib/api"

/**
 * GET /api/dashboard/insights
 *
 * The dashboard's read model: current-month cashflow, a six-month
 * income/expense/collection-rate trend, expense mix, occupancy, the service
 * queue and the "needs attention" counts.
 *
 * Everything is scoped to the signed-in user. Optional tables are tolerated
 * while a deployment is still being provisioned, but a real query failure is
 * never swallowed.
 */

const TREND_MONTHS = 6
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const monthStart = (year: number, month: number) => new Date(Date.UTC(year, month, 1))
const monthEnd = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))

export const GET = withAuth(async (_req, { supabase, userId }) => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()

  const currentStart = monthStart(year, month)
  const currentEnd = monthEnd(year, month)
  const trendStart = monthStart(year, month - (TREND_MONTHS - 1))
  const today = new Date(now.toISOString().slice(0, 10) + "T00:00:00Z")
  const todayString = today.toISOString().slice(0, 10)
  const in45Days = new Date(today.getTime() + 45 * 86_400_000).toISOString().slice(0, 10)
  const in60Days = new Date(today.getTime() + 60 * 86_400_000).toISOString().slice(0, 10)

  const [
    payments,
    expenses,
    properties,
    tenants,
    maintenance,
    documents,
    recurring,
    unpaid,
    expiringLeases,
    expiringDocuments,
  ] = await Promise.all([
    supabase
      .from("rent_payments")
      .select("amount, status, due_date, payment_date, property_id, tenant_id")
      .eq("user_id", userId)
      .gte("due_date", trendStart.toISOString().slice(0, 10)),
    supabase
      .from("expenses")
      .select("amount, category, expense_date")
      .eq("user_id", userId)
      .gte("expense_date", trendStart.toISOString().slice(0, 10)),
    supabase.from("properties").select("id, status").eq("user_id", userId),
    supabase.from("tenants").select("id, status").eq("user_id", userId),
    supabase.from("maintenance_requests").select("id, priority, status").eq("user_id", userId),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_recurring", true),
    supabase
      .from("rent_payments")
      .select("amount, due_date, tenant_id, status")
      .eq("user_id", userId)
      .in("status", ["pending", "late", "partial"]),
    supabase
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active")
      .gte("lease_end_date", todayString)
      .lte("lease_end_date", in60Days),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("expiry_date", "is", null)
      .gte("expiry_date", todayString)
      .lte("expiry_date", in45Days),
  ])

  const results = [
    payments,
    expenses,
    properties,
    tenants,
    maintenance,
    documents,
    recurring,
    unpaid,
    expiringLeases,
    expiringDocuments,
  ]
  results.forEach((result, index) => throwUnlessMissingTable(result.error, `Dashboard insight query ${index + 1}`))

  const paymentRows = (payments.data || []) as Array<{
    amount: number | string | null
    status: string | null
    due_date: string | null
  }>
  const expenseRows = (expenses.data || []) as Array<{
    amount: number | string | null
    category: string | null
    expense_date: string | null
  }>

  const isSettled = (status: string | null) => status === "paid" || status === "completed"
  const amountOf = (row: { amount: number | string | null }) => Number(row.amount || 0)

  // ---- Current month cashflow ------------------------------------------------
  const inCurrentMonth = (date: string | null) => {
    if (!date) return false
    const d = new Date(`${date.slice(0, 10)}T00:00:00Z`)
    return d >= currentStart && d <= currentEnd
  }

  const monthPayments = paymentRows.filter((payment) => inCurrentMonth(payment.due_date))
  const dueThisMonth = monthPayments.reduce((sum, payment) => sum + amountOf(payment), 0)
  const collectedThisMonth = monthPayments
    .filter((payment) => isSettled(payment.status))
    .reduce((sum, payment) => sum + amountOf(payment), 0)
  const outstanding = Math.max(0, dueThisMonth - collectedThisMonth)

  const monthExpenses = expenseRows.filter((expense) => inCurrentMonth(expense.expense_date))
  const expensesThisMonth = monthExpenses.reduce((sum, expense) => sum + amountOf(expense), 0)
  const netThisMonth = collectedThisMonth - expensesThisMonth

  // ---- Six-month trend with collection rate ---------------------------------
  const trend = Array.from({ length: TREND_MONTHS }, (_, index) => {
    const offset = TREND_MONTHS - 1 - index
    const cursor = new Date(Date.UTC(year, month - offset, 1))
    const y = cursor.getUTCFullYear()
    const m = cursor.getUTCMonth()
    const start = monthStart(y, m)
    const end = monthEnd(y, m)
    const within = (date: string | null) => {
      if (!date) return false
      const d = new Date(`${date.slice(0, 10)}T00:00:00Z`)
      return d >= start && d <= end
    }
    const due = paymentRows.filter((p) => within(p.due_date)).reduce((s, p) => s + amountOf(p), 0)
    const income = paymentRows
      .filter((p) => isSettled(p.status) && within(p.due_date))
      .reduce((s, p) => s + amountOf(p), 0)
    return {
      month: MONTHS[m],
      label: `${MONTHS[m]} ${String(y).slice(2)}`,
      due,
      income,
      expense: expenseRows.filter((e) => within(e.expense_date)).reduce((s, e) => s + amountOf(e), 0),
      rate: due > 0 ? Math.round((income / due) * 100) : 0,
    }
  })

  const previous = trend[trend.length - 2] || { income: 0, expense: 0 }
  const changePct = (current: number, prior: number) => {
    if (!prior) return current > 0 ? 100 : 0
    return Math.round(((current - prior) / Math.abs(prior)) * 100)
  }

  // ---- Expense mix -----------------------------------------------------------
  const byCategory = new Map<string, number>()
  for (const expense of monthExpenses) {
    const key = (expense.category || "other").replace(/_/g, " ")
    byCategory.set(key, (byCategory.get(key) || 0) + amountOf(expense))
  }
  const sortedCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1])
  const topCategories = sortedCategories.slice(0, 4).map(([name, value]) => ({ name, value }))
  const otherTotal = sortedCategories.slice(4).reduce((sum, [, value]) => sum + value, 0)
  const expensesByCategory =
    otherTotal > 0 ? [...topCategories, { name: "other", value: otherTotal }] : topCategories

  // ---- Occupancy -------------------------------------------------------------
  const propertyRows = (properties.data || []) as Array<{ id: string; status: string | null }>
  const totalProperties = propertyRows.length
  const occupied = propertyRows.filter((p) => p.status === "occupied").length
  const vacant = propertyRows.filter((p) => p.status === "available" || p.status === "vacant").length
  const inMaintenance = propertyRows.filter((p) => p.status === "maintenance").length
  const occupancyRate = totalProperties > 0 ? Math.round((occupied / totalProperties) * 100) : 0

  // ---- Maintenance queue -----------------------------------------------------
  const maintenanceRows = (maintenance.data || []) as Array<{
    id: string
    priority: string | null
    status: string | null
  }>
  const active = maintenanceRows.filter((m) => m.status === "open" || m.status === "in_progress")
  const priorityCount = (priority: string) => active.filter((m) => m.priority === priority).length

  const tenantRows = (tenants.data || []) as Array<{ id: string; status: string | null }>
  const activeTenants = tenantRows.filter((t) => t.status === "active").length

  // ---- Attention queue -------------------------------------------------------
  const unpaidRows = (unpaid.data || []) as Array<{
    amount: number | string | null
    due_date: string | null
    tenant_id: string | null
  }>
  let overdueAmount = 0
  let oldestDueDays = 0
  const overdueTenants = new Set<string>()
  for (const row of unpaidRows) {
    if (!row.due_date) continue
    const dueDate = new Date(`${row.due_date.slice(0, 10)}T00:00:00Z`)
    if (dueDate > today) continue
    overdueAmount += amountOf(row)
    if (row.tenant_id) overdueTenants.add(row.tenant_id)
    oldestDueDays = Math.max(oldestDueDays, Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000))
  }

  return successResponse({
    periodLabel: `${MONTHS[month]} ${year}`,
    comparatives: {
      previousMonth: MONTHS[(month + 11) % 12],
      changePct: changePct(collectedThisMonth, previous.income),
    },
    cashflow: {
      due: dueThisMonth,
      collected: collectedThisMonth,
      outstanding,
      expenses: expensesThisMonth,
      net: netThisMonth,
      collectRate: dueThisMonth > 0 ? Math.round((collectedThisMonth / dueThisMonth) * 100) : 0,
    },
    attention: {
      overdue: {
        amount: Math.round(overdueAmount),
        tenants: overdueTenants.size,
        oldestDueDays,
      },
      leasesExpiring: expiringLeases.count || 0,
      documentsExpiring: expiringDocuments.count || 0,
      urgentWorkOrders: priorityCount("urgent"),
    },
    trend,
    expensesByCategory,
    occupancy: { rate: occupancyRate, occupied, vacant, maintenance: inMaintenance, total: totalProperties },
    maintenance: {
      urgent: priorityCount("urgent"),
      high: priorityCount("high"),
      medium: priorityCount("medium"),
      low: priorityCount("low"),
      active: active.length,
      completed: maintenanceRows.filter((m) => m.status === "completed").length,
    },
    portfolio: {
      properties: totalProperties,
      activeTenants,
      documents: documents.count || 0,
      recurringExpenses: recurring.count || 0,
    },
  })
})
