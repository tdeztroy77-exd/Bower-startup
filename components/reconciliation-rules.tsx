"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Pause, Play, Settings2 } from "lucide-react"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { cn } from "@/lib/utils"

type Rule = {
  id: string
  name: string
  match_by: "phone" | "account_ref" | "amount_property" | "amount_tenant" | "closest_amount"
  priority: number
  active: boolean
  description: string
}

const methodLabel: Record<Rule["match_by"], string> = {
  account_ref: "Account ref",
  phone: "Phone",
  amount_property: "Amount / property",
  amount_tenant: "Amount / tenant",
  closest_amount: "Closest amount",
}

export function ReconciliationRules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await createClient()
        .from("reconciliation_rules")
        .select("id, name, match_by, priority, active, config")
        .order("priority", { ascending: false })
      setRules((data || []).map((rule: any) => ({ ...rule, description: rule.config?.description || "Configured database rule" })))
      setLoading(false)
    }
    load()
  }, [])

  async function toggle(id: string) {
    const rule = rules.find((item) => item.id === id)
    if (!rule) return
    const active = !rule.active
    const { error } = await createClient().from("reconciliation_rules").update({ active }).eq("id", id)
    if (!error) setRules((prev) => prev.map((r) => (r.id === id ? { ...r, active } : r)))
  }

  function move(id: string, dir: -1 | 1) {
    setRules((prev) => {
      const sorted = [...prev].sort((a, b) => b.priority - a.priority)
      const idx = sorted.findIndex((r) => r.id === id)
      const target = idx + dir
      if (idx < 0 || target < 0 || target >= sorted.length) return prev
      const a = sorted[idx]
      const b = sorted[target]
      // swap priorities
      const tmp = a.priority
      return prev.map((r) => {
        if (r.id === a.id) return { ...r, priority: b.priority }
        if (r.id === b.id) return { ...r, priority: tmp }
        return r
      })
    })
  }

  const sorted = [...rules].sort((a, b) => b.priority - a.priority)

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-4">
            <div className="size-6 animate-pulse rounded-md bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-40 animate-pulse rounded-full bg-muted" />
              <div className="h-2.5 w-56 animate-pulse rounded-full bg-muted/70" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border">
        <EmptyBlock
          icon={Settings2}
          title="No reconciliation rules yet"
          description="Rules run top-down on each incoming payment. Configured rules are listed here in priority order."
        />
      </div>
    )
  }

  return (
    <ol className="space-y-2">
      {sorted.map((r, i) => (
        <li
          key={r.id}
          className={cn(
            "flex items-start gap-3 rounded-xl border border-border/70 px-3 py-3 transition-colors hover:border-primary/20 hover:bg-muted/30",
            !r.active && "opacity-70",
          )}
        >
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-secondary text-[11px] font-semibold tabular text-primary">
            {r.priority}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13.5px] font-medium text-foreground">{r.name}</p>
              <StatusPill tone="neutral">{methodLabel[r.match_by]}</StatusPill>
              {!r.active ? <StatusPill tone="warning">paused</StatusPill> : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{r.description}</p>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <div className="mr-1 flex flex-col items-center">
              <button
                type="button"
                onClick={() => move(r.id, -1)}
                disabled={i === 0}
                className="rounded text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                aria-label="Move up"
              >
                <ChevronUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(r.id, 1)}
                disabled={i === sorted.length - 1}
                className="rounded text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                aria-label="Move down"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => toggle(r.id)}
              aria-label={r.active ? "Pause rule" : "Resume rule"}
            >
              {r.active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" aria-label="Edit rule">
              <Settings2 className="size-3.5" />
            </Button>
          </div>
        </li>
      ))}
    </ol>
  )
}
