import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CheckCircle2, ClipboardList, Clock, FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { formatDate, formatKenyaCurrency } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Quotations — Bower",
  description: "Track contractor quotes side by side. Approve, convert to invoices, pay.",
}

export const dynamic = "force-dynamic"

/**
 * The quotations table stores amounts in minor units (KES cents).
 * These helpers keep the conversion in one place so the table, the stat
 * cards and the totals can never disagree.
 */
const toKsh = (minorUnits: number | null | undefined): number =>
  typeof minorUnits === "number" ? minorUnits / 100 : 0

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  requested: "Pending",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
  expired: "Rejected",
}

const statusTone: Record<string, "neutral" | "warning" | "success" | "danger"> = {
  Draft: "neutral",
  Pending: "warning",
  Approved: "success",
  Rejected: "danger",
  Paid: "success",
}

type QuotationRow = {
  id: string
  title: string
  property: string
  contractor: string
  amount: number
  hasAmount: boolean
  status: string
  variants: number
  createdAt: string | null
}

export default async function QuotationsPage() {
  const supabase = await createClient()
  const { data: quoteRows } = await supabase
    .from("quotations")
    .select(
      "id, title, status, amount, property_id, contact_id, contractor_ids, requested_at, created_at, properties(name), contacts(name)",
    )
    .order("created_at", { ascending: false })

  const quotations: QuotationRow[] = (quoteRows ?? []).map((row: any): QuotationRow => {
    const property = Array.isArray(row.properties) ? row.properties[0] : row.properties
    const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts
    const status = STATUS_LABEL[row.status] ?? "Pending"
    return {
      id: String(row.id ?? ""),
      title: String(row.title ?? "Quote request"),
      property: property?.name ?? "Unassigned property",
      contractor: contact?.name ?? "Contractor not set",
      amount: toKsh(row.amount),
      hasAmount: typeof row.amount === "number",
      status,
      variants: Array.isArray(row.contractor_ids) ? row.contractor_ids.length : 1,
      createdAt: row.created_at as string | null,
    }
  })

  const pendingApproval = quotations.filter((q: QuotationRow) => q.status === "Pending")
  const approvedThisMonth = quotations.filter((q: QuotationRow) => {
    if (q.status !== "Approved") return false
    if (!q.createdAt) return false
    const created = new Date(q.createdAt)
    const now = new Date()
    return (
      created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
    )
  })

  const withApprovalTimestamps = quoteRows ?? []
  const approvalDurations: number[] = withApprovalTimestamps
    .filter((row: any) => row.requested_at && row.responded_at)
    .map(
      (row: any): number =>
        (new Date(row.responded_at).getTime() - new Date(row.requested_at).getTime()) / 86400000,
    )
  const avgTimeToApproval = approvalDurations.length
    ? Math.round(
        (approvalDurations.reduce((sum, d) => sum + d, 0) / approvalDurations.length) * 10,
      ) / 10
    : null

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Procurement"
        title="Quotations"
        description="Contractor quotes side by side — request, compare, approve, and turn the winning quote into an invoice."
        actions={
          <Button asChild size="sm" className="rounded-lg">
            <Link href="/dashboard/maintenance">
              <Plus /> New quote request
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Pending approval"
          value={pendingApproval.length}
          icon={Clock}
          accent="amber"
          hint={pendingApproval.length === 0 ? "No pending requests" : "Awaiting your decision"}
        />
        <StatCard
          label="Approved this month"
          value={approvedThisMonth.length}
          icon={CheckCircle2}
          accent="emerald"
          hint={approvedThisMonth.length === 0 ? "No approvals recorded" : "Approved this calendar month"}
        />
        <StatCard
          label="Avg. time to approval"
          value={avgTimeToApproval === null ? "—" : `${avgTimeToApproval}d`}
          icon={FileText}
          accent="indigo"
          hint={
            avgTimeToApproval === null
              ? "Available after a contractor responds"
              : "From request to response"
          }
        />
      </div>

      <Panel
        title="Recent quotations"
        description={`${quotations.length} ${quotations.length === 1 ? "quote" : "quotes"} across your properties`}
        bodyClassName="p-0"
        action={
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
            <Link href="/dashboard/maintenance">
              Maintenance <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        }
      >
        {quotations.length === 0 ? (
          <EmptyBlock
            icon={ClipboardList}
            title="No quotations yet"
            description="Create a quote request from a maintenance record and every contractor offer will be listed here, side by side."
            actionHref="/dashboard/maintenance"
            actionLabel="Open maintenance"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="pd-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Quote</th>
                  <th>Property</th>
                  <th>Contractor</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q: QuotationRow) => (
                  <tr key={q.id}>
                    <td>
                      <p className="text-[13px] font-medium text-foreground">{q.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Requested {formatDate(q.createdAt)}
                      </p>
                    </td>
                    <td className="text-[13px] text-muted-foreground">{q.property}</td>
                    <td className="text-[13px] text-muted-foreground">{q.contractor}</td>
                    <td className="text-right">
                      <p className="text-[13px] font-semibold tabular text-foreground">
                        {q.hasAmount ? formatKenyaCurrency(q.amount) : "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {q.variants} {q.variants === 1 ? "quote" : "quotes"}
                      </p>
                    </td>
                    <td>
                      <StatusPill tone={statusTone[q.status] ?? "neutral"} dot>
                        {q.status}
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
        title="How quotations work"
        description="From request to invoice in four steps"
      >
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              n: 1,
              title: "Request quotes",
              body: "Pick the issue from a maintenance record. We send it to your contractor list.",
            },
            {
              n: 2,
              title: "Compare side by side",
              body: "Multiple quotes show up in the record with line items and totals.",
            },
            {
              n: 3,
              title: "Approve with one click",
              body: "One approval turns the winning quote into a draft invoice.",
            },
            {
              n: 4,
              title: "Track and pay",
              body: "Pay via M-Pesa, attach the receipt, mark it complete — linked to the property.",
            },
          ].map((step) => (
            <li key={step.n} className="rounded-xl border border-border/70 bg-muted/25 p-4">
              <span className="grid size-7 place-items-center rounded-lg bg-secondary text-[12px] font-semibold text-secondary-foreground tabular">
                {step.n}
              </span>
              <p className="mt-3 text-[13px] font-semibold text-foreground">{step.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  )
}
