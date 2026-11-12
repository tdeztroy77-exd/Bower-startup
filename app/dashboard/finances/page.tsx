"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CalendarClock, CircleDollarSign, Plus, Receipt, Repeat, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusPill, statusTone } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, tenantName } from "@/lib/utils"
import { RecurringExpensesPanel } from "@/components/recurring-expenses-panel"
import { LateFeePolicyCard } from "@/components/late-fee-policy-card"

/** Payments read calmly: only a late or partial row earns colour. */
function paymentTone(status?: string | null) {
  if (!status || status === "pending") return "neutral" as const
  return statusTone(status)
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4">
          <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" />
          <div className="hidden h-3 w-1/5 animate-pulse rounded-full bg-muted/70 sm:block" />
          <div className="ml-auto h-3 w-16 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  )
}

export default function FinancesPage() {
  const [rentPayments, setRentPayments] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const supabase = createClient()
        const currentMonth = new Date()
        const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59)

        const [paymentsRes, expensesRes] = await Promise.all([
          supabase
            .from("rent_payments")
            .select(`
              *,
              tenants (full_name, first_name, last_name),
              properties (name)
            `)
            .gte("due_date", firstDayOfMonth.toISOString())
            .lte("due_date", lastDayOfMonth.toISOString())
            .order("due_date", { ascending: false }),
          supabase
            .from("expenses")
            .select("*, properties(name)")
            .gte("expense_date", firstDayOfMonth.toISOString())
            .lte("expense_date", lastDayOfMonth.toISOString())
            .order("expense_date", { ascending: false }),
        ])

        if (paymentsRes.error) throw paymentsRes.error
        if (expensesRes.error) throw expensesRes.error

        setRentPayments(paymentsRes.data || [])
        setExpenses(expensesRes.data || [])
      } catch (err: any) {
        console.error("[bower] fetch finances error", err)
        setError(err.message || "Failed to load financial data")
      } finally {
        setLoading(false)
      }
    }
    fetchFinancialData()
  }, [])

  const totalRentDue = rentPayments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0
  const totalRentPaid =
    rentPayments?.filter((p) => p.status === "paid" || p.status === "completed")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0
  const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount || 0), 0) || 0
  const netIncome = totalRentPaid - totalExpenses
  const collectRate = totalRentDue > 0 ? Math.round((totalRentPaid / totalRentDue) * 100) : 0

  const monthLabel = new Date().toLocaleDateString("en-KE", { month: "long", year: "numeric" })

  const recurringTemplates = (expenses || [])
    .filter((e: any) => e.is_recurring)
    .map((e: any) => ({
      id: e.id,
      description: e.description || e.category,
      category: e.category,
      amount: Number(e.amount || 0),
      vendor: e.vendor,
      recurring_frequency: e.recurring_frequency,
      next_occurrence: e.next_occurrence,
      property_name: e.properties?.name || null,
    }))

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Money · ${monthLabel}`}
        title="Finances"
        description="Rent due, rent collected and running costs for the current month."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
              <Link href="/dashboard/finances/expenses/new">
                <Plus /> Add expense
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[124px] animate-pulse rounded-2xl border border-border/70 bg-card" />
          ))
        ) : (
          <>
            <StatCard
              label="Rent due"
              value={formatCurrency(totalRentDue)}
              icon={CalendarClock}
              href="/dashboard/finances/payments/new"
              accent="indigo"
              hint={`${rentPayments.length} payment${rentPayments.length === 1 ? "" : "s"} due this month`}
            />
            <StatCard
              label="Collected"
              value={formatCurrency(totalRentPaid)}
              icon={CircleDollarSign}
              href="/dashboard/finances"
              accent="emerald"
              hint={`${collectRate}% of rent due marked paid`}
            />
            <StatCard
              label="Expenses"
              value={formatCurrency(totalExpenses)}
              icon={Receipt}
              href="/dashboard/finances/expenses/new"
              accent="coral"
              hint={`${expenses.length} recorded item${expenses.length === 1 ? "" : "s"}`}
            />
            <StatCard
              label="Net"
              value={formatCurrency(netIncome)}
              icon={Wallet}
              href="/dashboard/reports"
              accent={netIncome >= 0 ? "emerald" : "coral"}
              hint={netIncome >= 0 ? "Collected minus expenses" : "Expenses exceed what was collected"}
            />
          </>
        )}
      </div>

      <Panel bodyClassName="p-0">
        <Tabs defaultValue="payments" className="gap-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
            <TabsList className="h-9 rounded-lg bg-muted p-[3px]">
              <TabsTrigger value="payments" className="rounded-md px-3 text-[13px]">
                Rent payments
              </TabsTrigger>
              <TabsTrigger value="expenses" className="rounded-md px-3 text-[13px]">
                Expenses
              </TabsTrigger>
              <TabsTrigger value="recurring" className="rounded-md px-3 text-[13px]">
                Recurring
              </TabsTrigger>
            </TabsList>
            <p className="px-1 text-xs text-muted-foreground">Ordered by the date money was due or spent</p>
          </div>

          <TabsContent value="payments">
            {loading ? (
              <TableSkeleton rows={5} />
            ) : rentPayments && rentPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="pd-table">
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Property</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="font-medium text-foreground">{tenantName(payment.tenants)}</td>
                        <td className="text-muted-foreground">{payment.properties?.name || "—"}</td>
                        <td className="text-muted-foreground">{formatDate(payment.due_date)}</td>
                        <td>
                          <StatusPill tone={paymentTone(payment.status)} dot>
                            {payment.status || "unrecorded"}
                          </StatusPill>
                        </td>
                        <td className="text-right font-medium tabular text-foreground">
                          {formatCurrency(payment.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyBlock
                icon={Receipt}
                title="No rent payments this month"
                description="Payments with a due date in the current month show up here as soon as they are recorded."
                actionHref="/dashboard/finances/payments/new"
                actionLabel="Record a payment"
              />
            )}
          </TabsContent>

          <TabsContent value="expenses">
            {loading ? (
              <TableSkeleton rows={5} />
            ) : expenses && expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="pd-table">
                  <thead>
                    <tr>
                      <th>Expense</th>
                      <th>Category</th>
                      <th>Property</th>
                      <th>Date</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium text-foreground">{expense.description}</span>
                            {expense.is_recurring ? (
                              <StatusPill tone="brand">
                                <Repeat className="size-3" strokeWidth={2.2} />
                                {expense.recurring_frequency || "recurring"}
                              </StatusPill>
                            ) : null}
                            {expense.parent_recurring_id ? (
                              <StatusPill tone="neutral">generated</StatusPill>
                            ) : null}
                          </div>
                          {expense.vendor ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">{expense.vendor}</p>
                          ) : null}
                        </td>
                        <td className="capitalize text-muted-foreground">{expense.category || "—"}</td>
                        <td className="text-muted-foreground">{expense.properties?.name || "General"}</td>
                        <td className="text-muted-foreground">{formatDate(expense.expense_date)}</td>
                        <td className="text-right font-medium tabular text-foreground">
                          {formatCurrency(expense.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyBlock
                icon={Receipt}
                title="No expenses this month"
                description="Costs with an expense date in the current month are listed here."
                actionHref="/dashboard/finances/expenses/new"
                actionLabel="Add an expense"
              />
            )}
          </TabsContent>

          <TabsContent value="recurring" className="p-5">
            {loading ? <TableSkeleton rows={3} /> : <RecurringExpensesPanel templates={recurringTemplates} />}
          </TabsContent>
        </Tabs>
      </Panel>

      <LateFeePolicyCard />
    </div>
  )
}
