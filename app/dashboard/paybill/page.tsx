"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Radio,
  Receipt,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { LivePaybillFeed } from "@/components/live-paybill-feed"
import { PaybillAccountForm } from "@/components/paybill-account-form"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"

const steps = [
  {
    n: 1,
    title: "Pick one route",
    body: "PayBill when every payment carries an account reference. Till when tenants pay straight to one number.",
  },
  {
    n: 2,
    title: "Share the instructions",
    body: "Give tenants the number, the amount and — on PayBill only — the account reference to key in.",
  },
  {
    n: 3,
    title: "Match what arrives",
    body: "Incoming payments land in this workspace, ready to be matched to a tenant.",
  },
]

export default function PaybillPage() {
  const [paybills, setPaybills] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const [paybillsResult, transactionsResult] = await Promise.all([
        supabase.from("paybills").select("id, label, number, type, active, created_at").order("created_at", { ascending: false }),
        supabase.from("c2b_transactions").select("id, paybill_id, trans_amount, match_status, created_at").order("created_at", { ascending: false }),
      ])
      if (paybillsResult.error || transactionsResult.error) {
        setError("Could not load paybill data")
      } else {
        setPaybills(paybillsResult.data || [])
        setTransactions(transactionsResult.data || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const matched = transactions.filter((t) => t.match_status === "matched")
  const unmatched = transactions.filter((t) => t.match_status !== "matched")
  const totalCollected = transactions.reduce((sum, t) => sum + Number(t.trans_amount || 0), 0)
  const matchRate = transactions.length ? Math.round((matched.length / transactions.length) * 1000) / 10 : 0

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Money"
        title="Payment destinations"
        description="The PayBill and Till numbers your tenants pay into, and what has landed so far."
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
            <Link href="/dashboard/reconciliation">
              Reconciliation <ArrowRight />
            </Link>
          </Button>
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
              label="Transactions"
              value={transactions.length}
              icon={Receipt}
              accent="slate"
              hint="Recorded C2B payments"
            />
            <StatCard
              label="Auto-matched"
              value={`${matchRate}%`}
              icon={CheckCircle2}
              accent="indigo"
              href="/dashboard/reconciliation"
              hint={`${matched.length} of ${transactions.length} payments`}
            />
            <StatCard
              label="Total collected"
              value={formatCurrency(totalCollected)}
              icon={CircleDollarSign}
              accent="emerald"
              hint="Across all payment accounts"
            />
            <StatCard
              label="Unmatched"
              value={unmatched.length}
              icon={Radio}
              accent={unmatched.length > 0 ? "coral" : "emerald"}
              href="/dashboard/reconciliation"
              hint={unmatched.length > 0 ? "Waiting for a match" : "Everything matched"}
            />
          </>
        )}
      </div>

      <Panel
        title="How it works"
        description="PayBill and Till are different destinations. Set up the one your tenants already use."
        bodyClassName="space-y-5"
      >
        <ol className="grid gap-3 lg:grid-cols-3">
          {steps.map((step) => (
            <li key={step.n} className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <span className="grid size-6 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-primary">
                {step.n}
              </span>
              <p className="mt-2.5 text-[13.5px] font-semibold text-foreground">{step.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13.5px] font-semibold text-foreground">PayBill</p>
              <StatusPill tone="brand">reference required</StatusPill>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              Best when each payment needs a unique account reference.
            </p>
            <p className="mt-2 text-xs leading-5 text-foreground">
              Tenant enters: business number, account reference and amount.
            </p>
          </div>
          <div className="rounded-xl border border-border/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13.5px] font-semibold text-foreground">Till</p>
              <StatusPill tone="neutral">no reference</StatusPill>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              Best for direct payments to a single Till number.
            </p>
            <p className="mt-2 text-xs leading-5 text-foreground">Tenant enters: Till number and amount.</p>
          </div>
        </div>
      </Panel>

      <PaybillAccountForm />

      <Panel
        title="Payment accounts"
        description="PayBill business numbers and Till numbers are kept separate because tenants use them differently."
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="divide-y divide-border/60">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-4 py-4">
                <div className="size-9 animate-pulse rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
                  <div className="h-2.5 w-24 animate-pulse rounded-full bg-muted/70" />
                </div>
                <div className="ml-auto h-3 w-16 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        ) : paybills.length === 0 ? (
          <EmptyBlock
            icon={Wallet}
            title="No payment destinations yet"
            description="Add a PayBill or Till number above and it will be listed here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Destination</th>
                  <th>Route</th>
                  <th className="text-right">Matched</th>
                  <th>Last payment</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {paybills.map((p) => {
                  const paybillTransactions = transactions.filter((t) => t.paybill_id === p.id)
                  const paybillUnmatched = paybillTransactions.filter((t) => t.match_status !== "matched").length
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                            <Wallet className="size-4" strokeWidth={1.9} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-medium text-foreground">{p.label}</p>
                            <p className="font-mono text-xs text-muted-foreground">{p.number}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusPill tone={p.type === "paybill" ? "brand" : "neutral"}>
                          {p.type === "paybill" ? "PayBill" : "Till"}
                        </StatusPill>
                      </td>
                      <td className="text-right">
                        <p className="text-[13px] font-semibold tabular text-foreground">
                          {paybillTransactions.length - paybillUnmatched}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {paybillUnmatched > 0 ? `${paybillUnmatched} unmatched` : "All matched"}
                        </p>
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {paybillTransactions[0]?.created_at
                          ? new Date(paybillTransactions[0].created_at).toLocaleString()
                          : "No payments yet"}
                      </td>
                      <td>
                        {paybillUnmatched === 0 ? (
                          <StatusPill tone="success" dot>
                            healthy
                          </StatusPill>
                        ) : (
                          <StatusPill tone="warning" dot>
                            needs attention
                          </StatusPill>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <LivePaybillFeed />
    </div>
  )
}
