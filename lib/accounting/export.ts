/**
 * Accounting export.
 *
 * Double-entry journal rows an accountant can import. Two real formats:
 *   - Xero manual journal CSV
 *   - QuickBooks journal CSV
 * plus a plain generic CSV for everything else.
 *
 * Account codes are the common small-portfolio defaults; they are stated in
 * each file header so the accountant can remap them.
 */

export type AccountingPayment = {
  id: string
  amount: number
  due_date: string | null
  paid_date?: string | null
  status: string | null
  payment_method?: string | null
  reference_number?: string | null
  tenant_name?: string | null
  late_fee?: number | null
}

export type AccountingExpense = {
  id: string
  amount: number
  expense_date: string | null
  category: string | null
  description: string | null
  vendor?: string | null
}

export type JournalRow = {
  journal: string
  date: string
  reference: string
  description: string
  contact: string
  accountCode: string
  accountName: string
  debit: number
  credit: number
  taxType: string
}

const EXPENSE_ACCOUNTS: Record<string, { code: string; name: string }> = {
  maintenance: { code: "5100", name: "Repairs & maintenance" },
  repairs: { code: "5100", name: "Repairs & maintenance" },
  utilities: { code: "5200", name: "Utilities" },
  insurance: { code: "5300", name: "Insurance" },
  taxes: { code: "5400", name: "Taxes & statutory" },
  management: { code: "5500", name: "Management fees" },
  marketing: { code: "5600", name: "Marketing" },
  legal: { code: "5700", name: "Legal & professional" },
  security: { code: "5800", name: "Security" },
  cleaning: { code: "5900", name: "Cleaning" },
  supplies: { code: "6000", name: "Supplies" },
  travel: { code: "6100", name: "Travel" },
  other: { code: "6900", name: "Other expenses" },
}

const settled = (status: string | null) => status === "paid" || status === "completed"

function paymentAccount(method: string | null | undefined): { code: string; name: string } {
  switch (method) {
    case "mpesa":
      return { code: "1010", name: "M-Pesa clearing" }
    case "cash":
      return { code: "1000", name: "Cash at bank" }
    case "bank_transfer":
      return { code: "1000", name: "Cash at bank" }
    case "cheque":
      return { code: "1000", name: "Cash at bank" }
    default:
      return { code: "1000", name: "Cash at bank" }
  }
}

const isoDate = (value: string | null | undefined, fallback: Date) =>
  value ? value.slice(0, 10) : fallback.toISOString().slice(0, 10)

/**
 * Build balanced double-entry rows. Each transaction produces two rows: one
 * debit, one credit. Rent: debit money received, credit rent income. Expense:
 * debit the expense account, credit money paid.
 */
export function buildJournalRows(input: {
  payments: AccountingPayment[]
  expenses: AccountingExpense[]
  currency?: string
  now?: Date
}): JournalRow[] {
  const now = input.now ?? new Date()
  const rows: JournalRow[] = []

  for (const payment of input.payments) {
    if (!settled(payment.status)) continue
    const amount = Number(payment.amount || 0)
    if (amount <= 0) continue
    const date = isoDate(payment.paid_date || payment.due_date, now)
    const reference = payment.reference_number || payment.id.slice(0, 8).toUpperCase()
    const description = `Rent received${payment.tenant_name ? ` — ${payment.tenant_name}` : ""}`
    const account = paymentAccount(payment.payment_method)
    const journal = `RENT-${reference}`

    rows.push(
      {
        journal,
        date,
        reference,
        description,
        contact: payment.tenant_name || "",
        accountCode: account.code,
        accountName: account.name,
        debit: amount,
        credit: 0,
        taxType: "NONE",
      },
      {
        journal,
        date,
        reference,
        description,
        contact: payment.tenant_name || "",
        accountCode: "4000",
        accountName: "Rent income",
        debit: 0,
        credit: amount,
        taxType: "NONE",
      },
    )

    const lateFee = Number(payment.late_fee || 0)
    if (lateFee > 0) {
      const feeJournal = `LATE-${reference}`
      rows.push(
        {
          journal: feeJournal,
          date,
          reference,
          description: "Late fee charged",
          contact: payment.tenant_name || "",
          accountCode: "1100",
          accountName: "Rent receivable",
          debit: lateFee,
          credit: 0,
          taxType: "NONE",
        },
        {
          journal: feeJournal,
          date,
          reference,
          description: "Late fee income",
          contact: payment.tenant_name || "",
          accountCode: "4100",
          accountName: "Late fee income",
          debit: 0,
          credit: lateFee,
          taxType: "NONE",
        },
      )
    }
  }

  for (const expense of input.expenses) {
    const amount = Number(expense.amount || 0)
    if (amount <= 0) continue
    const date = isoDate(expense.expense_date, now)
    const reference = expense.id.slice(0, 8).toUpperCase()
    const category = (expense.category || "other").toLowerCase()
    const account = EXPENSE_ACCOUNTS[category] || EXPENSE_ACCOUNTS.other
    const description = (expense.description || account.name).slice(0, 120)
    const journal = `EXP-${reference}`

    rows.push(
      {
        journal,
        date,
        reference,
        description,
        contact: expense.vendor || "",
        accountCode: account.code,
        accountName: account.name,
        debit: amount,
        credit: 0,
        taxType: "NONE",
      },
      {
        journal,
        date,
        reference,
        description,
        contact: expense.vendor || "",
        accountCode: "1000",
        accountName: "Cash at bank",
        debit: 0,
        credit: amount,
        taxType: "NONE",
      },
    )
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.journal.localeCompare(b.journal))
}

const csvCell = (value: string | number) => {
  const text = String(value ?? "")
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const toCsv = (header: string[], rows: Array<Array<string | number>>) =>
  [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")

/** Xero manual journal import format. */
export function toXeroCsv(rows: JournalRow[]): string {
  const grouped = new Map<string, JournalRow[]>()
  rows.forEach((row) => {
    const list = grouped.get(row.journal) || []
    list.push(row)
    grouped.set(row.journal, list)
  })

  const output: Array<Array<string | number>> = []
  for (const [journal, lines] of grouped) {
    const first = lines[0]
    output.push(["*", journal, first.date, first.description, first.reference, first.accountCode, first.accountName, first.debit || "", first.credit || "", first.taxType, first.contact])
    for (const line of lines.slice(1)) {
      output.push(["", "", "", "", "", line.accountCode, line.accountName, line.debit || "", line.credit || "", line.taxType, line.contact])
    }
  }

  return toCsv(
    ["*", "JournalNumber", "Date", "Narration", "Reference", "AccountCode", "AccountName", "Debit", "Credit", "TaxType", "Contact"],
    output,
  )
}

/** QuickBooks journal import format. */
export function toQuickBooksCsv(rows: JournalRow[]): string {
  return toCsv(
    ["Journal No.", "Date", "Account", "Debit", "Credit", "Description", "Name", "Class", "Currency"],
    rows.map((row) => [
      row.journal,
      row.date,
      `${row.accountCode} ${row.accountName}`,
      row.debit || "",
      row.credit || "",
      row.description,
      row.contact,
      "",
      "KES",
    ]),
  )
}

/** Plain double-entry CSV for any other tool. */
export function toGenericCsv(rows: JournalRow[]): string {
  return toCsv(
    ["Journal", "Date", "Reference", "Description", "Contact", "Account code", "Account name", "Debit", "Credit", "Tax type"],
    rows.map((row) => [
      row.journal,
      row.date,
      row.reference,
      row.description,
      row.contact,
      row.accountCode,
      row.accountName,
      row.debit || "",
      row.credit || "",
      row.taxType,
    ]),
  )
}

export type AccountingFormat = "xero" | "quickbooks" | "generic"

export function renderAccountingCsv(format: AccountingFormat, rows: JournalRow[]): string {
  if (format === "xero") return toXeroCsv(rows)
  if (format === "quickbooks") return toQuickBooksCsv(rows)
  return toGenericCsv(rows)
}
