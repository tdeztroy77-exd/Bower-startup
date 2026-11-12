"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Loader2, Search, XCircle } from "lucide-react"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { cn, formatCurrency } from "@/lib/utils"

type Match = { id: string; billRef: string; amount: number; tenant: string; tenantId?: string; method: string; confidence: number; status: string }
type Tenant = { id: string; full_name: string }

type Props = { matches: Match[]; tenants: Tenant[]; methodLabel: Record<string, string> }

const filters = [
  { value: "all", label: "All" },
  { value: "review", label: "Needs review" },
  { value: "matched", label: "Matched" },
] as const

export function ReconciliationReviewQueue({ matches, tenants, methodLabel }: Props) {
  const [query, setQuery] = useState("")
  const [selectedTenant, setSelectedTenant] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<"all" | "matched" | "review">("all")
  const [working, setWorking] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const visible = useMemo(() => matches.filter((match) => {
    const haystack = `${match.id} ${match.billRef} ${match.tenant}`.toLowerCase()
    const statusMatches = status === "all" || (status === "matched" ? match.status === "matched" : match.status !== "matched")
    return statusMatches && haystack.includes(query.toLowerCase())
  }), [matches, query, status])

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  async function rejectSelected() {
    if (!selected.length) return
    setWorking("bulk")
    setMessage("")
    const response = await fetch("/api/reconciliation/bulk", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transaction_ids: selected, decision: "rejected" }) })
    const body = await response.json().catch(() => ({}))
    setWorking(null)
    if (response.ok) setSelected([])
    setMessage(response.ok ? `${body.processed || selected.length} transactions rejected and audited.` : body.error || "Unable to update transactions.")
  }

  async function resolve(id: string, decision: "matched" | "rejected") {
    setWorking(id)
    setMessage("")
    const response = await fetch("/api/reconciliation/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ trans_id: id, decision, tenant_id: selectedTenant[id] || undefined }) })
    const body = await response.json().catch(() => ({}))
    setWorking(null)
    setMessage(response.ok ? "Decision recorded. Refresh to see the updated queue." : body.error || "Unable to record decision.")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search transaction, reference, tenant"
              className="h-8 rounded-lg bg-card pl-8 text-[13px]"
            />
          </div>
          <div className="inline-flex w-fit items-center gap-0.5 rounded-lg bg-muted p-1" role="group" aria-label="Filter reconciliation decisions">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={status === item.value}
                onClick={() => setStatus(item.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  status === item.value
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-lg bg-card"
          disabled={!selected.length || working === "bulk"}
          onClick={rejectSelected}
        >
          {working === "bulk" ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Reject selected ({selected.length})
        </Button>
      </div>

      {message ? (
        <p role="status" className="rounded-xl bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          {message}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyBlock
            icon={Search}
            title="No transactions match this view"
            description="Try a different search term, or switch the filter back to all decisions."
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/80">
          <table className="pd-table min-w-[880px]">
            <thead>
              <tr>
                <th className="w-10">
                  <span className="sr-only">Select</span>
                </th>
                <th>Transaction</th>
                <th>Bill ref</th>
                <th className="text-right">Amount</th>
                <th>Tenant</th>
                <th>Method</th>
                <th className="text-right">Confidence</th>
                <th>Decision</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((match) => (
                <tr key={match.id}>
                  <td>
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border accent-primary"
                      aria-label={`Select ${match.id}`}
                      checked={selected.includes(match.id)}
                      onChange={() => toggleSelected(match.id)}
                      disabled={match.status === "matched"}
                    />
                  </td>
                  <td className="font-mono text-xs text-foreground">{match.id}</td>
                  <td className="font-mono text-xs text-muted-foreground">{match.billRef}</td>
                  <td className="text-right text-[13px] font-semibold tabular text-foreground">
                    {formatCurrency(match.amount)}
                  </td>
                  <td className="text-[13px] text-foreground">{match.tenant}</td>
                  <td className="text-xs text-muted-foreground">{methodLabel[match.method] || match.method}</td>
                  <td className="text-right text-xs tabular text-muted-foreground">
                    {match.confidence > 0 ? `${Math.round(match.confidence * 100)}%` : "—"}
                  </td>
                  <td>
                    {match.status === "matched" ? (
                      <StatusPill tone="success">
                        <CheckCircle2 className="size-3" strokeWidth={2.2} />
                        Matched
                      </StatusPill>
                    ) : (
                      <StatusPill tone="warning">
                        <XCircle className="size-3" strokeWidth={2.2} />
                        Needs review
                      </StatusPill>
                    )}
                  </td>
                  <td className="text-right">
                    {match.status !== "matched" ? (
                      <div className="flex items-center justify-end gap-2">
                        <select
                          aria-label={`Tenant for ${match.id}`}
                          value={selectedTenant[match.id] || match.tenantId || ""}
                          onChange={(event) =>
                            setSelectedTenant((current) => ({ ...current, [match.id]: event.target.value }))
                          }
                          className="h-8 max-w-[180px] rounded-lg border border-border bg-card px-2 text-xs text-foreground"
                        >
                          <option value="">Select tenant</option>
                          {tenants.map((tenant) => (
                            <option key={tenant.id} value={tenant.id}>
                              {tenant.full_name}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg bg-card"
                          disabled={working === match.id}
                          onClick={() => resolve(match.id, "rejected")}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-lg"
                          disabled={working === match.id || !(selectedTenant[match.id] || match.tenantId)}
                          onClick={() => resolve(match.id, "matched")}
                        >
                          {working === match.id ? <Loader2 className="size-3 animate-spin" /> : "Confirm"}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
