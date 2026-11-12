import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import {
  buildOwnerStatementData,
  renderOwnerStatementPdf,
  type StatementExpense,
  type StatementPayment,
} from "@/lib/reports/owner-statement"

/**
 * GET /api/reports/owner-statement?month=YYYY-MM&property_id=
 *
 * Generates a one-page owner statement PDF for the month. Defaults to the
 * current month and the whole portfolio.
 */
export const runtime = "nodejs"

const monthBounds = (month: string) => {
  const [year, monthIndex] = month.split("-").map(Number)
  const start = new Date(Date.UTC(year, monthIndex - 1, 1))
  const end = new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59))
  return { start, end }
}

export const GET = withAuth(async (request, { supabase, userId }) => {
  const url = new URL(request.url)
  const now = new Date()
  const month =
    url.searchParams.get("month") && /^\d{4}-\d{2}$/.test(url.searchParams.get("month")!)
      ? url.searchParams.get("month")!
      : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
  const propertyId = url.searchParams.get("property_id") || null
  const { start, end } = monthBounds(month)
  const startDate = start.toISOString().slice(0, 10)
  const endDate = end.toISOString().slice(0, 10)

  let paymentsQuery = supabase
    .from("rent_payments")
    .select("id, amount, due_date, paid_date, status, payment_method, reference_number, tenants(full_name, first_name, last_name), properties(name)")
    .eq("user_id", userId)
    .gte("due_date", startDate)
    .lte("due_date", endDate)
    .order("due_date", { ascending: true })

  let expensesQuery = supabase
    .from("expenses")
    .select("id, amount, expense_date, category, description, vendor, properties(name)")
    .eq("user_id", userId)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .order("expense_date", { ascending: true })

  if (propertyId) {
    paymentsQuery = paymentsQuery.eq("property_id", propertyId)
    expensesQuery = expensesQuery.eq("property_id", propertyId)
  }

  const [{ data: profile }, { data: company }, { data: payments }, { data: expenses }, { data: properties }, { data: tenants }, { data: unpaid }] =
    await Promise.all([
      supabase.from("user_profiles").select("full_name, company_name, currency").eq("user_id", userId).maybeSingle(),
      supabase.from("companies").select("name").eq("owner_id", userId).maybeSingle(),
      paymentsQuery,
      expensesQuery,
      supabase.from("properties").select("id, status, name").eq("user_id", userId),
      supabase.from("tenants").select("id, status").eq("user_id", userId),
      supabase
        .from("rent_payments")
        .select("amount, status")
        .eq("user_id", userId)
        .in("status", ["pending", "late", "partial"]),
    ])

  const property = propertyId ? (properties || []).find((row: any) => row.id === propertyId) : null
  const currency = (profile as any)?.currency || "KES"

  const data = buildOwnerStatementData({
    company: company?.name || (profile as any)?.company_name || "Property portfolio",
    ownerName: (profile as any)?.full_name || "Owner",
    periodLabel: start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
    propertyName: property?.name || null,
    currency,
    payments: (payments || []).map((payment: any) => ({
      id: payment.id,
      amount: Number(payment.amount || 0),
      due_date: payment.due_date,
      paid_date: payment.paid_date,
      status: payment.status,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number,
      tenant_name:
        payment.tenants?.full_name ||
        [payment.tenants?.first_name, payment.tenants?.last_name].filter(Boolean).join(" ") ||
        null,
      property_name: payment.properties?.name || null,
    })) as StatementPayment[],
    expenses: (expenses || []).map((expense: any) => ({
      id: expense.id,
      amount: Number(expense.amount || 0),
      expense_date: expense.expense_date,
      category: expense.category,
      description: expense.description,
      vendor: expense.vendor,
      property_name: expense.properties?.name || null,
    })) as StatementExpense[],
    properties: (properties || []).map((row: any) => ({ id: row.id, status: row.status })),
    tenants: (tenants || []).map((row: any) => ({ id: row.id, status: row.status })),
    arrears: (unpaid || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0),
  })

  const pdf = await renderOwnerStatementPdf(data)
  const filename = `owner-statement-${month}${property ? `-${property.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}` : ""}.pdf`

  return new NextResponse(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  })
})
