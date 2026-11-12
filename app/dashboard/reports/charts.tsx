"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Panel } from "@/components/dashboard/panel"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { formatCompactNumber, formatCurrency } from "@/lib/utils"
import type { PortfolioAnalytics } from "@/lib/analytics/portfolio"

const COLOURS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-5)", "var(--chart-4)", "var(--muted-foreground)"]

function TooltipBox({
  active,
  payload,
  label,
  money = true,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>
  label?: string
  money?: boolean
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-lift">
      {label ? (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      ) : null}
      {payload.map((entry) => (
        <div key={`${entry.dataKey}-${entry.name}`} className="flex items-center gap-2 py-0.5 text-xs">
          <span className="size-2 rounded-full" style={{ background: entry.color }} />
          <span className="capitalize text-muted-foreground">{entry.name}</span>
          <span className="ml-auto pl-4 font-semibold tabular text-foreground">
            {entry.dataKey === "rate" ? `${entry.value || 0}%` : money ? formatCurrency(entry.value || 0) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ReportCharts({ analytics }: { analytics: PortfolioAnalytics }) {
  const { collectionTrend, arrearsAging, expenseTrend, expenseMix, paymentMix } = analytics
  const hasArrears = arrearsAging.some((bucket) => bucket.amount > 0)
  const expenseTotal = expenseMix.reduce((sum, item) => sum + item.amount, 0)
  const paymentTotal = paymentMix.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Collection performance"
          description="Rent due, rent collected and the collection rate"
          action={
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-1" /> Collected</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted-foreground/30" /> Due</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 bg-chart-2" /> Rate</span>
            </div>
          }
          bodyClassName="pt-2"
        >
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={collectionTrend} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} dy={8} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis
                  yAxisId="money"
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
                  tickFormatter={(value: number) => formatCompactNumber(value)}
                />
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  width={34}
                  tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar yAxisId="money" dataKey="due" name="Due" fill="var(--muted-foreground)" fillOpacity={0.22} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar yAxisId="money" dataKey="collected" name="Collected" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Line yAxisId="rate" type="monotone" dataKey="rate" name="Rate" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Arrears aging" description="Unpaid rent by how late it is">
          {!hasArrears ? (
            <EmptyBlock title="No arrears" description="Every invoice in the window is settled." className="py-10" />
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={arrearsAging} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 4" />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }} tickFormatter={(value: number) => formatCompactNumber(value)} />
                  <YAxis type="category" dataKey="bucket" tickLine={false} axisLine={false} width={68} tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }} />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                  <Bar dataKey="amount" name="Outstanding" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {arrearsAging.map((entry, index) => (
                      <Cell key={entry.bucket} fill={index >= 2 ? "var(--chart-5)" : "var(--chart-2)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="mt-2 space-y-2 border-t border-border/70 pt-3">
            {arrearsAging.map((bucket) => (
              <li key={bucket.bucket} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="text-muted-foreground">{bucket.bucket}</span>
                <span className="tabular text-foreground">
                  {bucket.count} · <span className="font-semibold">{formatCurrency(bucket.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Expenses by month" description="Operating costs in the selected window" bodyClassName="pt-2">
          {expenseTrend.every((entry) => entry.amount === 0) ? (
            <EmptyBlock title="No expenses recorded" description="Recorded costs will appear here by month." className="py-10" />
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseTrend} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} dy={8} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tickLine={false} axisLine={false} width={56} tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }} tickFormatter={(value: number) => formatCompactNumber(value)} />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                  <Bar dataKey="amount" name="Expenses" fill="var(--chart-5)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Where the money goes" description="Expense mix in the window">
          {expenseMix.length === 0 ? (
            <EmptyBlock title="No expenses" description="Nothing to break down yet." className="py-10" />
          ) : (
            <div className="space-y-3">
              <div className="relative mx-auto h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseMix.slice(0, 6)} dataKey="amount" nameKey="category" innerRadius={46} outerRadius={66} paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
                      {expenseMix.slice(0, 6).map((entry, index) => (
                        <Cell key={entry.category} fill={COLOURS[index % COLOURS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<TooltipBox />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[20px] font-semibold tracking-[-0.03em] text-foreground tabular">{formatCompactNumber(expenseTotal)}</span>
                  <span className="text-[10px] text-muted-foreground">total spend</span>
                </div>
              </div>
              <ul className="space-y-1.5 border-t border-border/70 pt-3">
                {expenseMix.slice(0, 5).map((entry, index) => (
                  <li key={entry.category} className="flex items-center gap-2 text-[12px]">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: COLOURS[index % COLOURS.length] }} />
                    <span className="flex-1 truncate capitalize text-muted-foreground">{entry.category}</span>
                    <span className="font-medium tabular text-foreground">{formatCurrency(entry.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="How rent arrives" description="Settled payments by channel">
        {paymentMix.length === 0 ? (
          <EmptyBlock title="No settled payments" description="Channels appear once rent has been recorded or collected." className="py-8" />
        ) : (
          <ul className="space-y-3">
            {paymentMix.map((entry, index) => {
              const share = paymentTotal > 0 ? Math.round((entry.amount / paymentTotal) * 100) : 0
              return (
                <li key={entry.method}>
                  <div className="flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="capitalize text-foreground">{entry.method}</span>
                    <span className="text-muted-foreground">
                      {entry.count} payment{entry.count === 1 ? "" : "s"} · <span className="font-semibold text-foreground">{formatCurrency(entry.amount)}</span> · {share}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${share}%`, background: COLOURS[index % COLOURS.length] }} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
