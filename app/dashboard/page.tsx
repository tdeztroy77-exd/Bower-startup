"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CircleDollarSign,
  FileText,
  Plus,
  Repeat2,
  TrendingDown,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { LeaseExpiryAlerts, ActivityFeed } from "@/components/dashboard-widgets"
import { formatCompactNumber, formatCurrency, formatKenyaCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface Insights {
  periodLabel: string
  comparatives: { previousMonth: string; changePct: number }
  cashflow: {
    due: number
    collected: number
    outstanding: number
    expenses: number
    net: number
    collectRate: number
  }
  trend: Array<{ month: string; label: string; due: number; income: number; expense: number; rate: number }>
  attention: {
    overdue: { amount: number; tenants: number; oldestDueDays: number }
    leasesExpiring: number
    documentsExpiring: number
    urgentWorkOrders: number
  }
  expensesByCategory: Array<{ name: string; value: number }>
  occupancy: { rate: number; occupied: number; vacant: number; maintenance: number; total: number }
  maintenance: { urgent: number; high: number; medium: number; low: number; active: number; completed: number }
  portfolio: { properties: number; activeTenants: number; documents: number; recurringExpenses: number }
}

const EXPENSE_COLOURS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-5)", "var(--muted-foreground)"]

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-lift">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5 text-xs">
          <span className="size-2 rounded-full" style={{ background: entry.color }} />
          <span className="capitalize text-muted-foreground">{entry.name}</span>
          <span className="ml-auto pl-4 font-semibold tabular text-foreground">
            {formatCurrency(entry.value || 0)}
          </span>
        </div>
      ))}
    </div>
  )
}

function DonutCenter({ value, caption }: { value: string; caption: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-[22px] font-semibold tracking-[-0.03em] text-foreground tabular">{value}</span>
      <span className="mt-0.5 max-w-[90px] text-center text-[10px] leading-3 text-muted-foreground">{caption}</span>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/dashboard/insights")
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) return null
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload.error || "Could not load your dashboard")
        }
        return res.json()
      })
      .then((payload) => {
        if (!cancelled && payload) setData(payload)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const emptyPortfolio = !loading && data && data.portfolio.properties === 0

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={data?.periodLabel ? `Workspace · ${data.periodLabel}` : "Workspace"}
        title="Dashboard"
        description="Rent, occupancy and service delivery across your portfolio — one operating view."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
              <Link href="/dashboard/properties/new">
                <Building2 /> Add property
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-lg">
              <Link href="/dashboard/finances/payments/new">
                <Plus /> Record payment
              </Link>
            </Button>
          </>
        }
      />

      {error ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/[0.05] px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !data ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[124px] animate-pulse rounded-2xl border border-border/70 bg-card" />
          ))
        ) : (
          <>
            <StatCard
              label="Collected this month"
              value={formatKenyaCurrency(data.cashflow.collected)}
              icon={CircleDollarSign}
              href="/dashboard/finances"
              hint={`vs ${data.comparatives.previousMonth}`}
              trend={{
                value: `${data.comparatives.changePct >= 0 ? "+" : ""}${data.comparatives.changePct}%`,
                direction: data.comparatives.changePct >= 0 ? "up" : "down",
                tone: data.comparatives.changePct >= 0 ? "positive" : "negative",
              }}
            />
            <StatCard
              label="Outstanding rent"
              value={formatKenyaCurrency(data.cashflow.outstanding)}
              icon={TrendingDown}
              href="/dashboard/finances"
              accent="coral"
              hint={`${data.cashflow.collectRate}% of rent due collected`}
            />
            <StatCard
              label="Occupancy"
              value={`${data.occupancy.rate}%`}
              icon={Building2}
              href="/dashboard/properties"
              accent="indigo"
              hint={`${data.occupancy.occupied} of ${data.occupancy.total} properties occupied`}
            />
            <StatCard
              label="Open work orders"
              value={data.maintenance.active}
              icon={Wrench}
              href="/dashboard/maintenance"
              accent="amber"
              hint={data.maintenance.urgent > 0 ? `${data.maintenance.urgent} urgent` : "Nothing urgent"}
              trend={
                data.maintenance.urgent > 0
                  ? { value: `${data.maintenance.urgent} urgent`, direction: "up", tone: "negative" }
                  : undefined
              }
            />
          </>
        )}
      </div>

      {/* Attention queue */}
      <Panel
        title="Needs attention"
        description="What costs money or trust if it waits"
        action={
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
            <Link href="/dashboard/reports">
              Full analytics <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        }
        bodyClassName="p-3"
      >
        {loading || !data ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[74px] animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Overdue rent",
                value: formatKenyaCurrency(data.attention.overdue.amount),
                hint: `${data.attention.overdue.tenants} tenant${data.attention.overdue.tenants === 1 ? "" : "s"} · oldest ${data.attention.overdue.oldestDueDays}d`,
                icon: CircleDollarSign,
                href: "/dashboard/finances",
                tone: data.attention.overdue.amount > 0 ? "text-destructive" : "text-muted-foreground",
              },
              {
                label: "Urgent work orders",
                value: String(data.attention.urgentWorkOrders),
                hint: data.attention.urgentWorkOrders > 0 ? "Same-day response" : "Nothing urgent",
                icon: Wrench,
                href: "/dashboard/maintenance",
                tone: data.attention.urgentWorkOrders > 0 ? "text-warning" : "text-muted-foreground",
              },
              {
                label: "Leases ending",
                value: String(data.attention.leasesExpiring),
                hint: "Within 60 days",
                icon: CalendarClock,
                href: "/dashboard/tenants",
                tone: data.attention.leasesExpiring > 0 ? "text-foreground" : "text-muted-foreground",
              },
              {
                label: "Documents expiring",
                value: String(data.attention.documentsExpiring),
                hint: "Within 45 days",
                icon: FileText,
                href: "/dashboard/documents",
                tone: data.attention.documentsExpiring > 0 ? "text-foreground" : "text-muted-foreground",
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-secondary/30"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted/60">
                  <item.icon className={`size-4 ${item.tone}`} strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-muted-foreground">{item.label}</span>
                  <span className="mt-0.5 block truncate text-[15px] font-semibold tabular text-foreground">
                    {item.value}
                  </span>
                </span>
                <span className="max-w-[92px] text-right text-[10px] leading-3 text-muted-foreground">{item.hint}</span>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {/* Cashflow + portfolio snapshot */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Cashflow"
          description={data ? `${data.periodLabel} · rent due against rent received` : "Current month"}
          action={
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
              <Link href="/dashboard/reports">
                Full report <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {loading || !data ? (
            <div className="h-[150px] animate-pulse rounded-xl bg-muted/50" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Rent due</p>
                  <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.03em] tabular">
                    {formatKenyaCurrency(data.cashflow.due)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 font-semibold text-secondary-foreground">
                    <TrendingUp className="size-3" /> {data.cashflow.collectRate}% collected
                  </span>
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${Math.min(100, data.cashflow.collectRate)}%` }}
                />
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 pt-4 text-[13px] sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Collected</dt>
                  <dd className="mt-0.5 font-semibold tabular text-foreground">
                    {formatKenyaCurrency(data.cashflow.collected)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Outstanding</dt>
                  <dd className="mt-0.5 font-semibold tabular text-destructive">
                    {formatKenyaCurrency(data.cashflow.outstanding)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Expenses</dt>
                  <dd className="mt-0.5 font-semibold tabular text-foreground">
                    {formatKenyaCurrency(data.cashflow.expenses)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Net position</dt>
                  <dd
                    className={cn(
                      "mt-0.5 font-semibold tabular",
                      data.cashflow.net >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {formatKenyaCurrency(data.cashflow.net)}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </Panel>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Properties", value: data?.portfolio.properties ?? 0, icon: Building2, href: "/dashboard/properties" },
            { label: "Active tenants", value: data?.portfolio.activeTenants ?? 0, icon: Users, href: "/dashboard/tenants" },
            { label: "Documents", value: data?.portfolio.documents ?? 0, icon: FileText, href: "/dashboard/documents" },
            { label: "Recurring costs", value: data?.portfolio.recurringExpenses ?? 0, icon: Repeat2, href: "/dashboard/finances" },
          ].map((tile) => (
            <Link
              key={tile.label}
              href={tile.href}
              className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary/30"
            >
              <span className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-muted-foreground">{tile.label}</span>
                <tile.icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" strokeWidth={1.9} />
              </span>
              <span className="mt-3 text-[22px] font-semibold leading-none tracking-[-0.03em] tabular">
                {loading ? "—" : tile.value}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Trend + expense mix */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Revenue trend"
          description="Rent collected against expenses, last six months"
          action={
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-chart-1" /> Income
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-chart-5" /> Expense
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3 bg-chart-2" /> Collection rate
              </span>
            </div>
          }
          bodyClassName="pt-2"
        >
          {loading || !data ? (
            <div className="h-[248px] animate-pulse rounded-xl bg-muted/50" />
          ) : (
            <div className="h-[248px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.trend} barGap={5} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    yAxisId="money"
                    tickLine={false}
                    axisLine={false}
                    width={58}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(value: number) => formatCompactNumber(value)}
                  />
                  <YAxis
                    yAxisId="rate"
                    orientation="right"
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.45 }} content={<ChartTooltip />} />
                  <Bar yAxisId="money" dataKey="income" name="Income" fill="var(--chart-1)" radius={[5, 5, 0, 0]} maxBarSize={16} />
                  <Bar yAxisId="money" dataKey="expense" name="Expense" fill="var(--chart-5)" radius={[5, 5, 0, 0]} maxBarSize={16} />
                  <Line yAxisId="rate" type="monotone" dataKey="rate" name="Collection rate" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Expense mix" description={data ? `${data.periodLabel} by category` : "This month"}>
          {loading || !data ? (
            <div className="h-[190px] animate-pulse rounded-xl bg-muted/50" />
          ) : data.expensesByCategory.length === 0 ? (
            <EmptyBlock
              icon={CircleDollarSign}
              title="No expenses this month"
              description="Recorded costs will be grouped here by category."
              actionHref="/dashboard/finances/expenses/new"
              actionLabel="Add an expense"
            />
          ) : (
            <div className="space-y-3">
              <div className="relative mx-auto h-[168px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.expensesByCategory}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={54}
                      outerRadius={76}
                      paddingAngle={2}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {data.expensesByCategory.map((entry, index) => (
                        <Cell key={entry.name} fill={EXPENSE_COLOURS[index % EXPENSE_COLOURS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <DonutCenter
                  value={formatCompactNumber(data.expensesByCategory.reduce((s, c) => s + c.value, 0))}
                  caption="spent this month"
                />
              </div>
              <ul className="space-y-2 border-t border-border/70 pt-3">
                {data.expensesByCategory.map((entry, index) => (
                  <li key={entry.name} className="flex items-center gap-2 text-[12.5px]">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: EXPENSE_COLOURS[index % EXPENSE_COLOURS.length] }}
                    />
                    <span className="flex-1 truncate capitalize text-muted-foreground">{entry.name}</span>
                    <span className="font-medium tabular text-foreground">{formatKenyaCurrency(entry.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      {/* Occupancy + maintenance queue */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Occupancy" description="Properties by status">
          {loading || !data ? (
            <div className="h-[180px] animate-pulse rounded-xl bg-muted/50" />
          ) : data.occupancy.total === 0 ? (
            <EmptyBlock
              icon={Building2}
              title="Add your first property"
              description="Occupancy tracks itself once your portfolio is in."
              actionHref="/dashboard/properties/new"
              actionLabel="Add property"
            />
          ) : (
            <div className="space-y-3">
              <div className="relative mx-auto h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Occupied", value: data.occupancy.occupied },
                        { name: "Vacant", value: data.occupancy.vacant },
                        { name: "Maintenance", value: data.occupancy.maintenance },
                      ].filter((slice) => slice.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={2}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      <Cell fill="var(--chart-1)" />
                      <Cell fill="var(--chart-2)" />
                      <Cell fill="var(--chart-3)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <DonutCenter value={`${data.occupancy.rate}%`} caption="occupied" />
              </div>
              <ul className="grid grid-cols-3 gap-2 border-t border-border/70 pt-3 text-center">
                {[
                  { label: "Occupied", value: data.occupancy.occupied, colour: "bg-chart-1" },
                  { label: "Vacant", value: data.occupancy.vacant, colour: "bg-chart-2" },
                  { label: "Service", value: data.occupancy.maintenance, colour: "bg-chart-3" },
                ].map((item) => (
                  <li key={item.label}>
                    <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                      <span className={cn("size-1.5 rounded-full", item.colour)} />
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular">{item.value}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel
          className="lg:col-span-2"
          title="Service queue"
          description="Open maintenance by priority"
          action={
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
              <Link href="/dashboard/maintenance">
                Open work orders <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {loading || !data ? (
            <div className="h-[180px] animate-pulse rounded-xl bg-muted/50" />
          ) : data.maintenance.active === 0 ? (
            <EmptyBlock
              icon={Wrench}
              title="The queue is clear"
              description="Nothing open right now — new requests land here automatically."
            />
          ) : (
            <div className="space-y-1">
              {[
                { label: "Urgent", value: data.maintenance.urgent, tone: "bg-destructive", note: "Same-day response" },
                { label: "High", value: data.maintenance.high, tone: "bg-chart-5", note: "Within 48 hours" },
                { label: "Medium", value: data.maintenance.medium, tone: "bg-chart-2", note: "This week" },
                { label: "Low", value: data.maintenance.low, tone: "bg-chart-1", note: "Scheduled" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3 rounded-xl px-1 py-2.5">
                  <span className={cn("size-2 shrink-0 rounded-full", row.tone)} />
                  <span className="w-20 text-[13px] font-medium text-foreground">{row.label}</span>
                  <span className="hidden flex-1 items-center gap-2 text-xs text-muted-foreground sm:flex">
                    <span className="h-px flex-1 border-t border-dashed border-border" />
                    {row.note}
                  </span>
                  <span className="ml-auto text-[13px] font-semibold tabular text-foreground sm:ml-0">{row.value}</span>
                </div>
              ))}
              <div className="mt-1 flex items-center justify-between border-t border-border/70 pt-3 text-[12.5px]">
                <span className="font-medium text-muted-foreground">Total active</span>
                <span className="font-semibold tabular">{data.maintenance.active}</span>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {emptyPortfolio ? (
        <Panel title="Set up your portfolio" description="Two minutes to a live operating view.">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="rounded-lg">
              <Link href="/dashboard/properties/new">
                <Building2 /> Add your first property
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-lg bg-card">
              <Link href="/dashboard/tenants/new">
                <Users /> Add a tenant
              </Link>
            </Button>
            <p className="self-center text-xs text-muted-foreground">
              Or import a CSV from the properties page.
            </p>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityFeed />
        <LeaseExpiryAlerts />
      </div>
    </div>
  )
}
