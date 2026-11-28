import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, Check, Minus } from "lucide-react"
import { CtaBand, Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Compare — Bower",
  description:
    "How a property workspace differs from a spreadsheet and a WhatsApp thread — honestly, with no competitor claims we cannot verify.",
}

type Value = "yes" | "no" | "partial" | string

const columns = ["Spreadsheet", "Notebook + WhatsApp", "Bower"] as const

const rows: Array<{ label: string; values: [Value, Value, Value] }> = [
  { label: "Properties and units in one register", values: ["partial", "no", "yes"] },
  { label: "Tenant record with lease dates", values: ["partial", "no", "yes"] },
  { label: "Rent due vs collected, per month", values: ["partial", "no", "yes"] },
  { label: "M-Pesa paybill collection", values: ["no", "no", "yes"] },
  { label: "M-Pesa STK prompt from the tenant record", values: ["no", "no", "yes"] },
  { label: "Unmatched-payment reconciliation queue", values: ["no", "no", "yes"] },
  { label: "Maintenance queue with priority and owner", values: ["no", "partial", "yes"] },
  { label: "Documents with expiry reminders", values: ["no", "no", "yes"] },
  { label: "Owner-ready monthly report", values: ["manual", "no", "yes"] },
  { label: "Export everything you put in", values: ["yes", "no", "yes"] },
  { label: "One flat monthly price", values: ["free", "free", "KES 2,490"] },
]

function Cell({ value }: { value: Value }) {
  if (value === "yes") return <Check className="mx-auto size-4 text-pine" strokeWidth={2.6} />
  if (value === "no") return <Minus className="mx-auto size-4 text-muted-foreground/40" />
  return <span className="text-[12px] font-medium text-muted-foreground">{value}</span>
}

export default function ComparePage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Compare</Pill>
          <h1 className="mt-6 max-w-[20ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            A workspace, not another spreadsheet.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            We will not name competitors or claim features we cannot demonstrate. This is the honest
            comparison against how most portfolios are actually run today.
          </p>
        </div>
      </section>

      <Section>
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40">
                  <th className="px-5 py-3.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Capability
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className={`px-5 py-3.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.1em] ${
                        column === "Bower" ? "text-pine" : "text-muted-foreground"
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3.5 text-[13px] text-foreground">{row.label}</td>
                    {row.values.map((value, index) => (
                      <td
                        key={index}
                        className={`px-5 py-3.5 text-center ${index === 2 ? "bg-secondary/30" : ""}`}
                      >
                        <Cell value={value} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-[11.5px] leading-5 text-muted-foreground">
          “Partial” means the information can be kept, but nothing connects it to the next record or
          updates automatically. Pricing shown is our own list price; the other columns are not products
          we sell.
        </p>
      </Section>

      <Section muted bordered>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow">Where a workspace wins</p>
            <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
              One fact, seen everywhere.
            </h2>
            <p className="mt-4 text-[13.5px] leading-7 text-muted-foreground">
              When a payment is matched to a tenancy, the tenant timeline, the monthly cashflow panel and
              the owner report all change together. A spreadsheet can hold the same numbers, but only if
              someone updates three tabs correctly.
            </p>
          </div>
          <div>
            <p className="eyebrow">Where we are still early</p>
            <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
              Fewer integrations than a mature platform.
            </h2>
            <p className="mt-4 text-[13.5px] leading-7 text-muted-foreground">
              We support M-Pesa collection and card subscription payments. If you need an accounting sync
              or a second mobile-money rail today, we are not there yet — and we would rather say so on
              this page than in a support ticket.
            </p>
            <Link
              href="/roadmap"
              className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-pine hover:underline"
            >
              See what is in development <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </Section>

      <CtaBand
        title="Try the comparison on real data."
        body="Import your portfolio and run a month through it. The difference shows up in the reconciliation, not the brochure."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
      />
    </>
  )
}
