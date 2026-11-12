import { describe, expect, it } from "vitest"
import { buildJournalRows, renderAccountingCsv } from "./export"
import { buildOwnerStatementData, renderOwnerStatementPdf } from "@/lib/reports/owner-statement"

const now = new Date("2026-11-15T00:00:00Z")

describe("accounting export", () => {
  const rows = buildJournalRows({
    now,
    payments: [
      {
        id: "p1",
        amount: 40000,
        due_date: "2026-11-01",
        paid_date: "2026-11-02",
        status: "paid",
        payment_method: "mpesa",
        reference_number: "RCP123",
        tenant_name: "Amina W.",
        late_fee: 1000,
      },
      { id: "p2", amount: 20000, due_date: "2026-11-01", status: "pending", tenant_name: "Peter M." },
    ],
    expenses: [
      { id: "e1", amount: 5000, expense_date: "2026-11-03", category: "repairs", description: "Tap repair", vendor: "Kiptoo" },
    ],
  })

  it("only exports settled rent", () => {
    const rentRows = rows.filter((row) => row.accountCode === "4000")
    expect(rentRows).toHaveLength(1)
    expect(rentRows[0].credit).toBe(40000)
  })

  it("balances every journal (debits equal credits)", () => {
    const journals = new Map<string, { debit: number; credit: number }>()
    for (const row of rows) {
      const entry = journals.get(row.journal) || { debit: 0, credit: 0 }
      entry.debit += row.debit
      entry.credit += row.credit
      journals.set(row.journal, entry)
    }
    for (const [, entry] of journals) {
      expect(entry.debit).toBe(entry.credit)
    }
  })

  it("maps M-Pesa to the clearing account and expenses to their category code", () => {
    expect(rows.find((row) => row.journal === "RENT-RCP123")?.accountCode).toBe("1010")
    expect(rows.find((row) => row.journal === "EXP-E1")?.accountCode).toBe("5100")
  })

  it("includes the late fee as its own balanced journal", () => {
    const feeRows = rows.filter((row) => row.journal === "LATE-RCP123")
    expect(feeRows).toHaveLength(2)
    expect(feeRows.reduce((sum, row) => sum + row.debit, 0)).toBe(1000)
  })

  it("renders the three formats with a header row", () => {
    for (const format of ["xero", "quickbooks", "generic"] as const) {
      const csv = renderAccountingCsv(format, rows)
      expect(csv.split("\r\n")[0].length).toBeGreaterThan(10)
      expect(csv).toContain("Rent income")
    }
  })
})

describe("owner statement data", () => {
  it("sums income, expenses and net, and reports arrears separately", () => {
    const data = buildOwnerStatementData({
      company: "Kiarie Holdings",
      ownerName: "Brian K.",
      periodLabel: "November 2026",
      currency: "KES",
      payments: [
        { id: "1", amount: 40000, due_date: "2026-11-01", status: "paid" },
        { id: "2", amount: 20000, due_date: "2026-11-01", status: "pending" },
      ],
      expenses: [{ id: "e1", amount: 12000, expense_date: "2026-11-02", category: "repairs", description: "Repair" }],
      properties: [
        { id: "p1", status: "occupied" },
        { id: "p2", status: "vacant" },
      ],
      tenants: [
        { id: "t1", status: "active" },
        { id: "t2", status: "inactive" },
      ],
      arrears: 20000,
      generatedAt: now,
    })

    expect(data.income).toBe(40000)
    expect(data.expensesTotal).toBe(12000)
    expect(data.net).toBe(28000)
    expect(data.arrears).toBe(20000)
    expect(data.occupancy).toMatchObject({ rate: 50, occupied: 1, total: 2 })
    expect(data.activeTenants).toBe(1)
  })
})

describe("owner statement PDF", () => {
  it("renders a real PDF with the statement data", async () => {
    const data = buildOwnerStatementData({
      company: "Kiarie Holdings",
      ownerName: "Brian K.",
      periodLabel: "November 2026",
      currency: "KES",
      payments: [{ id: "1", amount: 40000, due_date: "2026-11-01", status: "paid", tenant_name: "Amina" }],
      expenses: [{ id: "e1", amount: 5000, expense_date: "2026-11-02", category: "repairs", description: "Tap" }],
      properties: [{ id: "p1", status: "occupied" }],
      tenants: [{ id: "t1", status: "active" }],
      arrears: 0,
      generatedAt: now,
    })
    const pdf = await renderOwnerStatementPdf(data)
    expect(pdf.byteLength).toBeGreaterThan(1000)
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-")
  })
})
