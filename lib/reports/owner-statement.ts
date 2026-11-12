import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

/**
 * Owner statement.
 *
 * One page of plain facts an owner can read without a call: what came in, what
 * went out, what is still owed, and the line items behind each total. The same
 * aggregation is exposed separately so it can be tested without a PDF.
 */

export type StatementPayment = {
  id: string
  amount: number
  due_date: string | null
  paid_date?: string | null
  status: string | null
  payment_method?: string | null
  reference_number?: string | null
  tenant_name?: string | null
  property_name?: string | null
}

export type StatementExpense = {
  id: string
  amount: number
  expense_date: string | null
  category: string | null
  description: string | null
  vendor?: string | null
  property_name?: string | null
}

export type OwnerStatementInput = {
  company: string
  ownerName: string
  periodLabel: string
  propertyName?: string | null
  currency?: string
  payments: StatementPayment[]
  expenses: StatementExpense[]
  properties: Array<{ id: string; status: string | null }>
  tenants: Array<{ id: string; status: string | null }>
  arrears: number
  generatedAt?: Date
}

export type OwnerStatementData = {
  company: string
  ownerName: string
  periodLabel: string
  propertyName: string | null
  currency: string
  income: number
  expensesTotal: number
  net: number
  arrears: number
  collectedCount: number
  expenseCount: number
  occupancy: { occupied: number; total: number; rate: number }
  activeTenants: number
  paymentRows: StatementPayment[]
  expenseRows: StatementExpense[]
  generatedAt: string
}

const settled = (status: string | null) => status === "paid" || status === "completed"

export function buildOwnerStatementData(input: OwnerStatementInput): OwnerStatementData {
  const payments = [...input.payments].sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
  const expenses = [...input.expenses].sort((a, b) => (a.expense_date || "").localeCompare(b.expense_date || ""))
  const income = payments
    .filter((payment) => settled(payment.status))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const expensesTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const occupied = input.properties.filter((property) => property.status === "occupied").length
  const total = input.properties.length

  return {
    company: input.company,
    ownerName: input.ownerName,
    periodLabel: input.periodLabel,
    propertyName: input.propertyName || null,
    currency: input.currency || "KES",
    income: Math.round(income),
    expensesTotal: Math.round(expensesTotal),
    net: Math.round(income - expensesTotal),
    arrears: Math.round(Math.max(0, input.arrears)),
    collectedCount: payments.filter((payment) => settled(payment.status)).length,
    expenseCount: expenses.length,
    occupancy: { occupied, total, rate: total > 0 ? Math.round((occupied / total) * 100) : 0 },
    activeTenants: input.tenants.filter((tenant) => tenant.status === "active").length,
    paymentRows: payments,
    expenseRows: expenses,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
  }
}

const money = (value: number, currency = "KES") =>
  `${currency} ${Math.round(value).toLocaleString("en-KE")}`

const shortDate = (value: string | null) =>
  value ? new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"

export async function renderOwnerStatementPdf(data: OwnerStatementData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Owner statement — ${data.periodLabel}`)
  doc.setAuthor(data.company)
  doc.setCreator("Bower")

  const ink = rgb(0.082, 0.106, 0.09)
  const muted = rgb(0.41, 0.45, 0.42)
  const emerald = rgb(0.09, 0.384, 0.29)
  const line = rgb(0.886, 0.863, 0.812)
  const white = rgb(1, 1, 1)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 48

  let page = doc.addPage([pageWidth, pageHeight])
  const helvetica = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const text = (
    target: typeof page,
    value: string,
    x: number,
    y: number,
    options: { size?: number; font?: typeof helvetica; color?: typeof ink; maxWidth?: number } = {},
  ) => {
    const size = options.size ?? 10
    const font = options.font ?? helvetica
    target.drawText(value, { x, y, size, font, color: options.color ?? ink, maxWidth: options.maxWidth })
  }

  // Header
  page.drawRectangle({ x: 0, y: pageHeight - 104, width: pageWidth, height: 104, color: emerald })
  text(page, "Bower", margin, pageHeight - 44, { size: 11, font: bold, color: white })
  text(page, "OWNER STATEMENT", margin, pageHeight - 72, { size: 22, font: bold, color: white })
  text(page, data.periodLabel, pageWidth - margin - 120, pageHeight - 72, { size: 12, font: bold, color: white })

  // Meta
  let cursor = pageHeight - 136
  text(page, data.company, margin, cursor, { size: 13, font: bold })
  text(page, data.propertyName || "Whole portfolio", margin, cursor - 16, { size: 10, color: muted })
  text(page, `Prepared for ${data.ownerName}`, margin, cursor - 32, { size: 9, color: muted })
  text(
    page,
    `Generated ${new Date(data.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    pageWidth - margin - 150,
    cursor,
    { size: 9, color: muted },
  )

  // Summary boxes
  cursor -= 76
  const boxes = [
    { label: "Rent collected", value: money(data.income, data.currency) },
    { label: "Expenses", value: money(data.expensesTotal, data.currency) },
    { label: "Net to owner", value: money(data.net, data.currency) },
  ]
  const boxWidth = (pageWidth - margin * 2 - 16) / 3
  boxes.forEach((box, index) => {
    const x = margin + index * (boxWidth + 8)
    page.drawRectangle({ x, y: cursor, width: boxWidth, height: 58, color: rgb(0.973, 0.98, 0.976), borderColor: line, borderWidth: 1 })
    text(page, box.label, x + 10, cursor + 38, { size: 8, color: muted })
    text(page, box.value, x + 10, cursor + 18, { size: 13, font: bold })
  })

  // Secondary facts
  cursor -= 30
  const facts = [
    `Occupancy ${data.occupancy.rate}% (${data.occupancy.occupied}/${data.occupancy.total} properties)`,
    `Active tenants ${data.activeTenants}`,
    `Outstanding arrears ${money(data.arrears, data.currency)}`,
    `Payments settled ${data.collectedCount}`,
  ].join("     ·     ")
  text(page, facts, margin, cursor, { size: 8.5, color: muted, maxWidth: pageWidth - margin * 2 })

  // Tables
  const drawTableHeader = (y: number) => {
    page.drawRectangle({ x: margin, y: y - 4, width: pageWidth - margin * 2, height: 18, color: rgb(0.945, 0.96, 0.952) })
    text(page, "DATE", margin + 6, y, { size: 7.5, font: bold, color: muted })
    text(page, "DESCRIPTION", margin + 70, y, { size: 7.5, font: bold, color: muted })
    text(page, "STATUS", pageWidth - margin - 170, y, { size: 7.5, font: bold, color: muted })
    text(page, "AMOUNT", pageWidth - margin - 72, y, { size: 7.5, font: bold, color: muted })
  }

  cursor -= 30
  text(page, "Rent received", margin, cursor, { size: 11, font: bold })
  cursor -= 18
  drawTableHeader(cursor)
  cursor -= 18

  for (const payment of data.paymentRows.filter((row) => settled(row.status))) {
    if (cursor < 96) {
      page = doc.addPage([pageWidth, pageHeight])
      cursor = pageHeight - 70
      drawTableHeader(cursor)
      cursor -= 18
    }
    const description = `${payment.tenant_name || "Tenant"}${payment.property_name ? ` · ${payment.property_name}` : ""}`
    text(page, shortDate(payment.paid_date || payment.due_date), margin + 6, cursor, { size: 8 })
    text(page, description.slice(0, 62), margin + 70, cursor, { size: 8 })
    text(page, (payment.payment_method || "payment").replace(/_/g, " "), pageWidth - margin - 170, cursor, { size: 8, color: muted })
    text(page, money(Number(payment.amount || 0), data.currency), pageWidth - margin - 72, cursor, { size: 8, font: bold })
    page.drawLine({ start: { x: margin, y: cursor - 5 }, end: { x: pageWidth - margin, y: cursor - 5 }, thickness: 0.5, color: line })
    cursor -= 16
  }

  if (data.paymentRows.filter((row) => settled(row.status)).length === 0) {
    text(page, "No settled rent in this period.", margin + 6, cursor, { size: 8, color: muted })
    cursor -= 18
  }

  cursor -= 16
  text(page, "Expenses", margin, cursor, { size: 11, font: bold })
  cursor -= 18
  drawTableHeader(cursor)
  cursor -= 18

  for (const expense of data.expenseRows) {
    if (cursor < 96) {
      page = doc.addPage([pageWidth, pageHeight])
      cursor = pageHeight - 70
      drawTableHeader(cursor)
      cursor -= 18
    }
    text(page, shortDate(expense.expense_date), margin + 6, cursor, { size: 8 })
    text(page, `${(expense.description || expense.category || "Expense").slice(0, 62)}`, margin + 70, cursor, { size: 8 })
    text(page, (expense.category || "other").replace(/_/g, " "), pageWidth - margin - 170, cursor, { size: 8, color: muted })
    text(page, money(Number(expense.amount || 0), data.currency), pageWidth - margin - 72, cursor, { size: 8, font: bold })
    page.drawLine({ start: { x: margin, y: cursor - 5 }, end: { x: pageWidth - margin, y: cursor - 5 }, thickness: 0.5, color: line })
    cursor -= 16
  }

  if (data.expenseRows.length === 0) {
    text(page, "No expenses recorded in this period.", margin + 6, cursor, { size: 8, color: muted })
    cursor -= 18
  }

  // Footer on every page
  const pages = doc.getPages()
  pages.forEach((target, index) => {
    target.drawLine({
      start: { x: margin, y: 52 },
      end: { x: pageWidth - margin, y: 52 },
      thickness: 0.5,
      color: line,
    })
    text(target, "Generated from live Bower records. Figures are subject to reconciled payments.", margin, 38, {
      size: 7.5,
      color: muted,
    })
    text(target, `Page ${index + 1} of ${pages.length}`, pageWidth - margin - 60, 38, { size: 7.5, color: muted })
  })

  return await doc.save()
}
