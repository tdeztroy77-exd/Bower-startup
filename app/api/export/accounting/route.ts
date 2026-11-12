import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api"
import { buildJournalRows, renderAccountingCsv, type AccountingFormat } from "@/lib/accounting/export"

/**
 * GET /api/export/accounting?from=YYYY-MM-DD&to=YYYY-MM-DD&format=xero|quickbooks|generic
 *
 * Double-entry journal export for an accountant. Defaults to the current year
 * to date and the generic format.
 */
export const GET = withAuth(async (request, { supabase, userId }) => {
  const url = new URL(request.url)
  const now = new Date()
  const defaultFrom = `${now.getUTCFullYear()}-01-01`
  const defaultTo = now.toISOString().slice(0, 10)
  const valid = (value: string | null, fallback: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback
  const from = valid(url.searchParams.get("from"), defaultFrom)
  const to = valid(url.searchParams.get("to"), defaultTo)
  const requested = url.searchParams.get("format")
  const format: AccountingFormat =
    requested === "xero" || requested === "quickbooks" || requested === "generic" ? requested : "generic"

  const [{ data: payments, error: paymentError }, { data: expenses, error: expenseError }] = await Promise.all([
    supabase
      .from("rent_payments")
      .select("id, amount, due_date, paid_date, status, payment_method, reference_number, late_fee, tenants(full_name, first_name, last_name)")
      .eq("user_id", userId)
      .in("status", ["paid", "completed"])
      .gte("due_date", from)
      .lte("due_date", to),
    supabase
      .from("expenses")
      .select("id, amount, expense_date, category, description, vendor")
      .eq("user_id", userId)
      .gte("expense_date", from)
      .lte("expense_date", to),
  ])

  if (paymentError || expenseError) {
    console.error("[accounting-export] query failed", paymentError?.message, expenseError?.message)
    return new NextResponse(JSON.stringify({ error: "Could not build the export" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    })
  }

  const rows = buildJournalRows({
    payments: (payments || []).map((payment: any) => ({
      id: payment.id,
      amount: Number(payment.amount || 0),
      due_date: payment.due_date,
      paid_date: payment.paid_date,
      status: payment.status,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number,
      late_fee: Number(payment.late_fee || 0),
      tenant_name:
        payment.tenants?.full_name ||
        [payment.tenants?.first_name, payment.tenants?.last_name].filter(Boolean).join(" ") ||
        null,
    })),
    expenses: (expenses || []).map((expense: any) => ({
      id: expense.id,
      amount: Number(expense.amount || 0),
      expense_date: expense.expense_date,
      category: expense.category,
      description: expense.description,
      vendor: expense.vendor,
    })),
    now,
  })

  const csv = renderAccountingCsv(format, rows)
  const filename = `bower-${format}-journal-${from}-to-${to}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  })
})
