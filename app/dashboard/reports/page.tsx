import Link from "next/link"
import { ArrowUpRight, Building2, CircleDollarSign, Download, FileText, Percent, Receipt, Wrench } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { formatCurrency, formatCompactNumber } from "@/lib/utils"
import { buildPortfolioAnalytics } from "@/lib/analytics/portfolio"
import { OwnerStatementButton } from "@/components/owner-statement-button"
import { ReportCharts } from "./charts"

export const dynamic = "force-dynamic"

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>
}) {
  const months = Math.max(3, Math.min(Number((await searchParams).months) || 6, 12))
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Sign in to view reports.</div>
  }

  const now = new Date()
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1))

  const [rent, expenses, properties, tenants, maintenance, documents, recurring] = await Promise.all([
    supabase
      .from("rent_payments")
      .select("id, amount, status, due_date, payment_date, paid_date, property_id, tenant_id, payment_method")
      .eq("user_id", user.id)
      .gte("due_date", windowStart.toISOString().slice(0, 10)),
    supabase
      .from("expenses")
      .select("amount, category, expense_date")
      .eq("user_id", user.id)
      .gte("expense_date", windowStart.toISOString().slice(0, 10)),
    supabase.from("properties").select("id, name, status").eq("user_id", user.id),
    supabase
      .from("tenants")
      .select("id, full_name, first_name, last_name, property_id, status, lease_end_date")
      .eq("user_id", user.id),
    supabase
      .from("maintenance_requests")
      .select("id, priority, status, created_at, completed_date")
      .eq("user_id", user.id),
    supabase.from("documents").select("id, expiry_date").eq("user_id", user.id).not("expiry_date", "is", null),
    supabase.from("expenses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_recurring", true),
  ])

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

  const trend = analytics.collectionTrend
  const previous = trend.length > 1 ? trend[trend.length - 2] : null
  const latest = trend[trend.length - 1]
  const collectedChange = previous && previous.collected > 0
    ? Math.round(((latest.collected - previous.collected) / previous.collected) * 100)
    : null
  const periodLabel = `${months}-month view`

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Reports · ${periodLabel}`}
        title="Analytics"
        description="Collection performance, arrears, concentration and service delivery — derived from the same records the workspace runs on."
        actions={
          <>
            <div className="hidden items-center gap-1 rounded-lg border border-border bg-card p-0.5 sm:flex">
              {[3, 6, 12].map((option) => (
                <Link
                  key={option}
                  href={`/dashboard/reports?months=${option}`}
                  className={
                    option === months
                      ? "rounded-md bg-secondary px-2.5 py-1 text-[11.5px] font-semibold text-secondary-foreground"
                      : "rounded-md px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
                  }
                >
                  {option}m
                </Link>
              ))}
            </div>
            <OwnerStatementButton />
            <Link
              href="/api/export?format=csv"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:border-pine/30 hover:text-pine"
            >
              <Download className="size-3.5" /> Export
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Collected this month"
          value={formatCurrency(analytics.cashflow.collected)}
          icon={CircleDollarSign}
          accent="emerald"
          hint="vs last month"
          trend={
            collectedChange === null
              ? undefined
              : {
                  value: `${collectedChange >= 0 ? "+" : ""}${collectedChange}%`,
                  direction: collectedChange >= 0 ? "up" : "down",
                  tone: collectedChange >= 0 ? "positive" : "negative",
                }
          }
        />
        <StatCard
          label="Collection rate"
          value={`${analytics.cashflow.collectRate}%`}
          icon={Percent}
          accent={analytics.cashflow.collectRate >= 90 ? "emerald" : "amber"}
          hint={`${formatCurrency(analytics.cashflow.outstanding)} outstanding`}
        />
        <StatCard
          label="Outstanding rent"
          value={formatCurrency(analytics.arrearsAging.reduce((sum, bucket) => sum + bucket.amount, 0))}
          icon={Receipt}
          accent="coral"
          href="/dashboard/finances"
          hint={`${analytics.tenantsAtRisk.length} tenant${analytics.tenantsAtRisk.length === 1 ? "" : "s"} with arrears`}
        />
        <StatCard
          label="Net this month"
          value={formatCurrency(analytics.cashflow.net)}
          icon={Building2}
          accent={analytics.cashflow.net >= 0 ? "emerald" : "coral"}
          hint={`${formatCurrency(analytics.cashflow.expenses)} expenses`}
        />
      </div>

      <ReportCharts analytics={analytics} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Portfolio concentration"
          description="Outstanding rent by property, most exposed first"
          action={
            <Link href="/dashboard/properties" className="text-[11.5px] font-medium text-muted-foreground hover:text-pine">
              All properties
            </Link>
          }
          bodyClassName="p-0"
        >
          {analytics.topProperties.length === 0 ? (
            <EmptyBlock title="No property activity" description="Add properties and payments to see concentration." className="py-10" />
          ) : (
            <div className="overflow-x-auto">
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th className="text-right">Collected</th>
                    <th className="text-right">Outstanding</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topProperties.map((property) => (
                    <tr key={property.id}>
                      <td className="max-w-[180px] truncate text-[12.5px] font-medium text-foreground">{property.name}</td>
                      <td className="text-right text-[12.5px] tabular text-muted-foreground">{formatCompactNumber(property.collected)}</td>
                      <td className="text-right text-[12.5px] tabular font-semibold text-foreground">{formatCompactNumber(property.outstanding)}</td>
                      <td>
                        <StatusPill tone={property.collectRate >= 90 ? "success" : property.collectRate >= 70 ? "warning" : "danger"} dot>
                          {property.collectRate}%
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title="Tenants to call"
          description="Highest outstanding balance, oldest debt first"
          action={
            <Link href="/dashboard/tenants" className="text-[11.5px] font-medium text-muted-foreground hover:text-pine">
              All tenants
            </Link>
          }
          bodyClassName="p-0"
        >
          {analytics.tenantsAtRisk.length === 0 ? (
            <EmptyBlock title="No tenant arrears" description="Every active invoice is settled." className="py-10" />
          ) : (
            <div className="overflow-x-auto">
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Property</th>
                    <th className="text-right">Owed</th>
                    <th>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.tenantsAtRisk.map((tenant) => (
                    <tr key={tenant.id}>
                      <td className="max-w-[150px] truncate text-[12.5px] font-medium text-foreground">
                        <Link href={`/dashboard/tenants/${tenant.id}`} className="hover:text-pine">
                          {tenant.name}
                        </Link>
                      </td>
                      <td className="max-w-[130px] truncate text-[12px] text-muted-foreground">{tenant.property || "—"}</td>
                      <td className="text-right text-[12.5px] font-semibold tabular text-foreground">{formatCurrency(tenant.outstanding)}</td>
                      <td>
                        <span className={tenant.oldestDueDays > 60 ? "text-[11.5px] font-semibold text-destructive" : "text-[11.5px] text-muted-foreground"}>
                          {tenant.oldestDueDays}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Service delivery" description="Open work orders and how old they are">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Open", value: analytics.maintenance.active },
              { label: "Urgent", value: analytics.maintenance.urgent },
              { label: "Closed 30d", value: analytics.maintenance.completed30d },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-muted/40 py-3">
                <p className="text-[18px] font-semibold tabular text-foreground">{item.value}</p>
                <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {analytics.maintenance.byPriority.map((row) => (
              <div key={row.priority} className="flex items-center gap-2 text-[12px]">
                <span className="w-16 capitalize text-muted-foreground">{row.priority}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-pine"
                    style={{
                      width: `${analytics.maintenance.active > 0 ? Math.round((row.count / analytics.maintenance.active) * 100) : 0}%`,
                    }}
                  />
                </div>
                <span className="w-6 text-right tabular text-foreground">{row.count}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-border/70 pt-3 text-[11.5px] text-muted-foreground">
            Average age of an open request: <span className="font-semibold text-foreground">{analytics.maintenance.avgAgeDays} day{analytics.maintenance.avgAgeDays === 1 ? "" : "s"}</span>
          </p>
          <Link href="/dashboard/maintenance" className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-pine hover:underline">
            Open the queue <ArrowUpRight className="size-3.5" />
          </Link>
        </Panel>

        <Panel title="Automation coverage" description="What is already running without you">
          <ul className="space-y-3 text-[12.5px]">
            {[
              { label: "Recurring expense templates", value: analytics.automationCoverage.recurringExpenses },
              { label: "Documents expiring in 45 days", value: analytics.automationCoverage.documentsExpiring },
              { label: "Leases ending in 60 days", value: analytics.automationCoverage.leasesExpiring },
            ].map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold tabular text-foreground">{item.value}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
            Expiry and reminder scans run daily. Payment reconciliation waits for you in the queue — it is the one
            thing we will not guess at.
          </p>
          <Link href="/dashboard/reconciliation" className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-pine hover:underline">
            Review reconciliation <ArrowUpRight className="size-3.5" />
          </Link>
        </Panel>

        <Panel title="Occupancy" description="Properties by current status">
          <div className="flex items-end justify-between gap-3">
            <p className="text-[28px] font-semibold leading-none tracking-[-0.03em] tabular text-foreground">
              {analytics.occupancy.rate}%
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              {analytics.occupancy.occupied} of {analytics.occupancy.total} occupied
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-pine" style={{ width: `${analytics.occupancy.rate}%` }} />
          </div>
          <ul className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Occupied", value: analytics.occupancy.occupied },
              { label: "Vacant", value: analytics.occupancy.vacant },
              { label: "Service", value: analytics.occupancy.maintenance },
            ].map((item) => (
              <li key={item.label} className="rounded-lg bg-muted/40 py-2">
                <p className="text-[14px] font-semibold tabular text-foreground">{item.value}</p>
                <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">{item.label}</p>
              </li>
            ))}
          </ul>
          <Link href="/dashboard/properties" className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-pine hover:underline">
            Review properties <ArrowUpRight className="size-3.5" />
          </Link>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-card">
        <Wrench className="size-4 text-muted-foreground" />
        <p className="min-w-0 flex-1 text-[12px] leading-5 text-muted-foreground">
          The numbers here are computed from live records. If something looks wrong, fix the record — the report
          follows automatically.
        </p>
        <Link href="/api/export?format=json" className="text-[12px] font-semibold text-pine hover:underline">
          Export JSON
        </Link>
      </div>
    </div>
  )
}
