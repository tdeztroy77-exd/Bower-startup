"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Loader2, Pause, Play, Repeat } from "lucide-react"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { StatusPill } from "@/components/dashboard/status-pill"
import { apiFetch, ApiError } from "@/lib/api/client"
import { formatCurrency, formatDate } from "@/lib/utils"

interface RecurringTemplate {
  id: string
  description: string
  category: string
  amount: number
  vendor: string | null
  recurring_frequency: string
  next_occurrence: string | null
  property_name: string | null
}

export function RecurringExpensesPanel({ templates }: { templates: RecurringTemplate[] }) {
  const [running, setRunning] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const router = useRouter()

  const runAll = async () => {
    setMsg(null)
    setRunning(true)
    try {
      const r = await fetch("/api/expenses/recurring/run", { method: "POST" })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error((data as any).error || "Run failed")
      setMsg({
        type: "success",
        text: `Generated ${data.inserted || 0} expense${data.inserted === 1 ? "" : "s"}.`,
      })
      router.refresh()
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "Run failed" })
    } finally {
      setRunning(false)
    }
  }

  const toggle = async (t: RecurringTemplate) => {
    setMsg(null)
    setTogglingId(t.id)
    try {
      // Pause = set is_recurring=false. Resume = true.
      const newState = false // we only have "pause" from this panel; resume via the per-row form on the recurring page
      await apiFetch(`/api/expenses/${t.id}`, {
        method: "PUT",
        body: { is_recurring: newState, recurring_frequency: null, next_occurrence: null },
      })
      setMsg({ type: "success", text: "Paused." })
      router.refresh()
    } catch (e: any) {
      const text = e instanceof ApiError ? e.message : e?.message || "Pause failed"
      setMsg({ type: "error", text })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-6 tracking-[-0.01em] text-foreground">
            Recurring templates
          </h3>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Copies are generated daily at 07:05 UTC, or on demand.
          </p>
        </div>
        <Button
          onClick={runAll}
          disabled={running || templates.length === 0}
          size="sm"
          variant="outline"
          className="rounded-lg bg-card"
        >
          {running ? <Loader2 className="animate-spin" /> : <Play />}
          Generate now
        </Button>
      </div>

      {msg ? (
        <div
          role="status"
          className={
            msg.type === "error"
              ? "flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/[0.05] px-4 py-3 text-sm text-destructive"
              : "flex items-start gap-2 rounded-xl border border-success/25 bg-success/[0.06] px-4 py-3 text-sm text-success"
          }
        >
          {msg.type === "error" ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      ) : null}

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyBlock
            icon={Repeat}
            title="No recurring expenses yet"
            description="Turn on “Make this expense recurring” when you add an expense, and the template is listed here."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/70 rounded-xl border border-border/80">
          {templates.map((t) => {
            const isOverdue = t.next_occurrence && new Date(t.next_occurrence) <= new Date()
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[13.5px] font-medium text-foreground">{t.description}</span>
                    <StatusPill tone="brand">{t.recurring_frequency || "recurring"}</StatusPill>
                    {isOverdue ? <StatusPill tone="danger" dot>due</StatusPill> : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {t.category}
                    {t.vendor ? ` · ${t.vendor}` : ""}
                    {t.property_name ? ` · ${t.property_name}` : ""}
                    {t.next_occurrence ? ` · next ${formatDate(t.next_occurrence)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[13px] font-semibold tabular text-foreground">{formatCurrency(t.amount)}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => toggle(t)}
                    disabled={togglingId === t.id}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Pause template"
                  >
                    {togglingId === t.id ? <Loader2 className="size-3.5 animate-spin" /> : <Pause className="size-3.5" />}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
