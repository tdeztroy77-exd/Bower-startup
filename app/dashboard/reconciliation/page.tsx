import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertTriangle, CheckCircle2, History, ListOrdered, Settings2, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { ReconciliationRules } from "@/components/reconciliation-rules"
import { ReconciliationReviewQueue } from "@/components/reconciliation-review-queue"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Reconciliation — Bower",
  description: "Per-tenant rules that match incoming paybill payments to the right tenant.",
}

type RecentMatch = { id: string; billRef: string; amount: number; tenant: string; tenantId?: string; method: string; confidence: number; status: string }
type TenantOption = { id: string; full_name: string }
type AuditEvent = { id: string; decision: string; notes: string | null; created_at: string; matched_tenant_id?: string | null }

const methodLabel: Record<string, string> = {
  account_ref: "Account ref",
  phone: "Phone",
  amount_tenant: "Amount / tenant",
  amount_property: "Amount / property",
  closest_amount: "Closest amount",
  manual: "Manual",
  unmatched: "Unmatched",
}

function decisionTone(decision: string) {
  const value = decision.toLowerCase()
  if (value.includes("reject")) return "danger" as const
  if (value.includes("match") || value.includes("confirm") || value.includes("approve")) return "success" as const
  return "neutral" as const
}

export const dynamic = "force-dynamic"

export default async function ReconciliationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const [{ data: transactions }, { count: activeRules }, { data: tenantOptions }, { data: auditEvents }] = await Promise.all([
    supabase.from("c2b_transactions").select("id, trans_id, trans_amount, bill_ref_number, matched_tenant_id, match_method, match_confidence, match_status, created_at, tenants(full_name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("reconciliation_rules").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("active", true),
    supabase.from("tenants").select("id, full_name").eq("user_id", user.id).eq("is_active", true).order("full_name"),
    supabase.from("reconciliation_audit").select("id, decision, notes, created_at, matched_tenant_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
  ])

  const recentMatches: RecentMatch[] = (transactions || []).map((transaction: any) => ({
    id: transaction.trans_id || transaction.id,
    billRef: transaction.bill_ref_number || "—",
    amount: Number(transaction.trans_amount || 0),
    tenant: transaction.tenants?.full_name || "—",
    tenantId: transaction.matched_tenant_id || undefined,
    method: transaction.match_method || "unmatched",
    confidence: Number(transaction.match_confidence || 0),
    status: transaction.match_status || "pending",
  }))
  const matched = recentMatches.filter((m) => m.status === "matched").length
  const unmatched = recentMatches.filter((m) => m.status === "unmatched" || m.status === "pending").length
  const total = recentMatches.length
  const matchRate = total > 0 ? Math.round((matched / total) * 1000) / 10 : 0
  const events = (auditEvents || []) as AuditEvent[]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Money"
        title="Reconciliation"
        description="Rules that match incoming PayBill and Till payments to the right tenant, and a queue for the ones that need a decision."
        actions={
          <Button variant="outline" size="sm" className="rounded-lg bg-card">
            <Settings2 /> Default rules
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Match rate"
          value={`${matchRate}%`}
          icon={Target}
          accent="emerald"
          hint={`Across the last ${total} payment${total === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Auto-matched"
          value={matched}
          icon={CheckCircle2}
          accent="indigo"
          hint={`of ${total} recent payment${total === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Needs review"
          value={unmatched}
          icon={AlertTriangle}
          accent={unmatched > 0 ? "amber" : "emerald"}
          hint={unmatched > 0 ? "Waiting for a decision" : "Nothing waiting"}
        />
        <StatCard
          label="Active rules"
          value={activeRules || 0}
          icon={ListOrdered}
          accent="slate"
          hint="Enabled in the ruleset"
        />
      </div>

      <Panel
        title="Review queue"
        description="Confirm or reject a match inline. Every decision is logged."
        action={
          unmatched > 0 ? (
            <StatusPill tone="warning" dot>
              {unmatched} awaiting review
            </StatusPill>
          ) : (
            <StatusPill tone="success" dot>
              queue clear
            </StatusPill>
          )
        }
      >
        <ReconciliationReviewQueue matches={recentMatches} tenants={(tenantOptions || []) as TenantOption[]} methodLabel={methodLabel} />
      </Panel>

      <Panel
        title="Reconciliation rules"
        description="Rules run top-down by priority. The first confident match wins; paused rules are skipped."
        action={
          <Button size="sm" className="rounded-lg">
            <ListOrdered /> New rule
          </Button>
        }
      >
        <ReconciliationRules />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Decision history" description="Recent manual and automated decisions, newest first.">
          {events.length === 0 ? (
            <EmptyBlock
              icon={History}
              title="No decisions recorded yet"
              description="Every match, rejection and manual assignment is kept here for review."
            />
          ) : (
            <ul className="space-y-2">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <StatusPill tone={decisionTone(event.decision)}>
                      {String(event.decision).replace(/_/g, " ")}
                    </StatusPill>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {event.notes || "Decision recorded"}
                    </p>
                  </div>
                  <time
                    dateTime={event.created_at}
                    className="shrink-0 text-[11px] tabular text-muted-foreground"
                  >
                    {new Date(event.created_at).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="How matching works" description="The engine stops at the first confident match." bodyClassName="space-y-3">
          <p className="text-[13px] leading-6 text-muted-foreground">
            Each incoming payment is evaluated against the active rule set in priority order. The first
            rule that confidently identifies a tenant wins, and the engine stops there.
          </p>
          <p className="text-[13px] leading-6 text-muted-foreground">
            Unmatched payments wait in this queue until you assign a tenant. They are also listed on the{" "}
            <Link href="/dashboard/paybill" className="font-medium text-primary hover:underline">
              PayBill page
            </Link>
            . You can assign the tenant by hand, or fix the rule and re-run.
          </p>
          <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2.5 text-[13px] leading-5 text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Adjusting rules affects future transactions only. Past matches stay as logged.
          </p>
        </Panel>
      </div>
    </div>
  )
}
