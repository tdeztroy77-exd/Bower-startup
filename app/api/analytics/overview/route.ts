import { withAuth, successResponse, throwUnlessMissingTable } from "@/lib/api"
import { buildPortfolioAnalytics } from "@/lib/analytics/portfolio"

/**
 * GET /api/analytics/overview?months=6
 *
 * One round-trip portfolio read model used by the reports screen and the
 * dashboard attention queue. All queries are scoped to the caller.
 */
export const GET = withAuth(async (req, { supabase, userId }) => {
  const months = Math.max(1, Math.min(Number(new URL(req.url).searchParams.get("months")) || 6, 24))
  const now = new Date()
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1))

  const [rent, expenses, properties, tenants, maintenance, documents, recurring] = await Promise.all([
    supabase
      .from("rent_payments")
      .select("id, amount, status, due_date, payment_date, paid_date, property_id, tenant_id, payment_method")
      .eq("user_id", userId)
      .gte("due_date", windowStart.toISOString().slice(0, 10)),
    supabase
      .from("expenses")
      .select("amount, category, expense_date")
      .eq("user_id", userId)
      .gte("expense_date", windowStart.toISOString().slice(0, 10)),
    supabase.from("properties").select("id, name, status").eq("user_id", userId),
    supabase.from("tenants").select("id, full_name, first_name, last_name, property_id, status, lease_end_date").eq("user_id", userId),
    supabase.from("maintenance_requests").select("id, priority, status, created_at, completed_date").eq("user_id", userId),
    supabase.from("documents").select("id, expiry_date").eq("user_id", userId).not("expiry_date", "is", null),
    supabase.from("expenses").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_recurring", true),
  ])

  const results = [rent, expenses, properties, tenants, maintenance, documents, recurring]
  results.forEach((result, index) => throwUnlessMissingTable(result.error, `Analytics query ${index + 1}`))

  const analytics = buildPortfolioAnalytics({
    rent: (rent.data || []) as any[],
    expenses: (expenses.data || []) as any[],
    properties: (properties.data || []) as any[],
    tenants: (tenants.data || []) as any[],
    maintenance: (maintenance.data || []) as any[],
    documents: (documents.data || []) as any[],
    leases: ((tenants.data || []) as any[]).map((tenant) => ({
      id: tenant.id,
      lease_end_date: tenant.lease_end_date,
      status: tenant.status,
    })),
    months,
    now,
  })

  analytics.automationCoverage.recurringExpenses = recurring.count || 0

  return successResponse(analytics)
})
