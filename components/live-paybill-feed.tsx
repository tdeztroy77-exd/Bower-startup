"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, Pause, Play, Radio, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Panel } from "@/components/dashboard/panel"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { cn } from "@/lib/utils"

type C2BRow = {
  trans_id: string
  trans_time: string
  trans_amount: number
  business_short_code: string
  bill_ref_number: string
  msisdn: string
  first_name: string
  last_name: string
  match_status: string
  match_method: string | null
  match_confidence: number | null
  matched_tenant_id: string | null
  created_at: string
}

function formatKES(n: number) {
  return `KES ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  } catch {
    return iso
  }
}

function formatPhone(p: string) {
  if (!p) return ""
  return p.startsWith("254") ? `0${p.slice(3, 12)}` : p
}

export function LivePaybillFeed({ initial }: { initial?: C2BRow[] }) {
  const [rows, setRows] = useState<C2BRow[]>(initial ?? [])
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting")
  const [paused, setPaused] = useState(false)
  const [lastEventAt, setLastEventAt] = useState<string | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  function connect() {
    if (sourceRef.current) {
      sourceRef.current.close()
    }
    const es = new EventSource("/api/paybill/stream")
    sourceRef.current = es
    setStatus("connecting")
    es.addEventListener("hello", () => setStatus("open"))
    es.addEventListener("c2b", (e) => {
      if (paused) return
      try {
        const row = JSON.parse((e as MessageEvent).data) as C2BRow
        setRows((prev) => [row, ...prev].slice(0, 50))
        setLastEventAt(row.trans_time)
      } catch {/* ignore */}
    })
    es.onerror = () => {
      setStatus("closed")
      // Auto-reconnect after 5s unless user paused
      if (!paused) setTimeout(() => connect(), 5000)
    }
  }

  useEffect(() => {
    connect()
    return () => sourceRef.current?.close()
  }, [])

  function togglePause() {
    const next = !paused
    setPaused(next)
    if (next) {
      sourceRef.current?.close()
      setStatus("closed")
    } else {
      connect()
    }
  }

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Radio
            className={cn(
              "size-4 shrink-0",
              status === "open" && "animate-pulse text-pine",
              status === "connecting" && "text-warning",
              status === "closed" && "text-muted-foreground",
            )}
            strokeWidth={1.9}
          />
          Live paybill feed
        </span>
      }
      description={
        lastEventAt
          ? `Every C2B confirmation as it lands. Last event at ${formatTime(lastEventAt)}.`
          : "Every C2B confirmation as it lands."
      }
      bodyClassName="p-0"
      action={
        <>
          <StatusPill
            tone={status === "open" ? "success" : status === "connecting" ? "warning" : "neutral"}
            dot
          >
            {status === "open" ? "live" : status}
          </StatusPill>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={togglePause}
            className="text-muted-foreground hover:text-foreground"
            aria-label={paused ? "Resume the feed" : "Pause the feed"}
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={connect}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Reconnect the feed"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </>
      }
    >
      {rows.length === 0 ? (
        <EmptyBlock
          icon={Radio}
          title="Waiting for the first payment"
          description="When a C2B payment lands on one of your numbers, it appears here in real time."
        />
      ) : (
        <ul className="max-h-[420px] divide-y divide-border/60 overflow-y-auto">
          {rows.map((r) => (
            <li
              key={r.trans_id}
              className="flex items-start justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] tabular text-muted-foreground">
                    {formatTime(r.trans_time)}
                  </span>
                  {r.match_status === "matched" ? (
                    <StatusPill tone="success">
                      <CheckCircle2 className="size-3" strokeWidth={2.2} />
                      matched
                    </StatusPill>
                  ) : (
                    <StatusPill tone="warning">
                      <AlertTriangle className="size-3" strokeWidth={2.2} />
                      unmatched
                    </StatusPill>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {r.match_method ?? "no rule"} · confidence {r.match_confidence ?? 0}
                  </span>
                </div>
                <p className="mt-1 truncate text-[13px] font-medium text-foreground">
                  {(r.first_name ?? "") + " " + (r.last_name ?? "")} · {formatPhone(r.msisdn)}
                </p>
                <p className="text-xs text-muted-foreground">Bill ref {r.bill_ref_number || "—"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-semibold tabular text-foreground">{formatKES(r.trans_amount)}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{r.trans_id.slice(-8)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
