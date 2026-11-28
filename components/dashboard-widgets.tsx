"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Panel } from "@/components/dashboard/panel"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { StatusPill } from "@/components/dashboard/status-pill"
import { Activity, ArrowRight, CalendarClock, CircleDollarSign, StickyNote, Wrench } from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

type ActivityItem = {
  type: "payment" | "expense" | "maintenance" | "note"
  id: string
  timestamp: string
  title: string
  subtitle: string
  href: string
  badge?: string
  badgeTone?: "default" | "success" | "warning" | "destructive" | "muted"
  amount?: number
}

type LeaseAlert = {
  tenant_id: string
  tenant_name: string
  tenant_email?: string | null
  tenant_phone?: string | null
  property_id: string | null
  property_name: string
  lease_end_date: string
  days_until_expiry: number
  severity: "expired" | "critical" | "warning" | "upcoming"
}

export function LeaseExpiryAlerts() {
  const [items, setItems] = useState<LeaseAlert[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/dashboard/leases")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Failed to load")
        return r.json()
      })
      .then((d) => {
        if (!cancelled) setItems(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Panel
      title="Lease expiries"
      description="Tenancies ending in the next 60 days"
      action={
        <Link
          href="/dashboard/tenants"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-pine"
        >
          All tenants <ArrowRight className="size-3.5" />
        </Link>
      }
      bodyClassName="p-3"
    >
      {loading ? (
        <div className="space-y-2 p-1">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="px-2 py-6 text-center text-sm text-destructive">{error}</p>
      ) : !items || items.length === 0 ? (
        <EmptyBlock
          icon={CalendarClock}
          title="No lease actions due"
          description="Your next 60 days are clear."
          className="py-8"
        />
      ) : (
        <div className="space-y-0.5">
          {items.slice(0, 5).map((lease) => {
            const tone =
              lease.severity === "expired" || lease.severity === "critical"
                ? "danger"
                : lease.severity === "warning"
                  ? "warning"
                  : "neutral"
            return (
              <Link
                key={lease.tenant_id}
                href={lease.property_id ? `/dashboard/properties/${lease.property_id}` : "/dashboard/tenants"}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{lease.tenant_name}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{lease.property_name}</p>
                </div>
                <StatusPill tone={tone as "danger" | "warning" | "neutral"} dot>
                  {lease.severity === "expired"
                    ? `${Math.abs(lease.days_until_expiry)}d overdue`
                    : lease.days_until_expiry === 0
                      ? "today"
                      : `${lease.days_until_expiry}d left`}
                </StatusPill>
              </Link>
            )
          })}
          {items.length > 5 ? (
            <Link
              href="/dashboard/tenants"
              className="flex items-center justify-center gap-1 pt-2 text-xs font-medium text-muted-foreground hover:text-pine"
            >
              {items.length - 5} more expiring
              <ArrowRight className="size-3" />
            </Link>
          ) : null}
        </div>
      )}
    </Panel>
  )
}

const typeIcons = {
  payment: CircleDollarSign,
  expense: CircleDollarSign,
  maintenance: Wrench,
  note: StickyNote,
}

const toneTile: Record<string, string> = {
  default: "bg-secondary text-pine",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
}

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/dashboard/activity")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed")
        return r.json()
      })
      .then((d) => {
        if (!cancelled) setItems(d)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Panel
      title="Recent activity"
      description="Payments, expenses, work orders and notes"
      bodyClassName="p-3"
    >
      {loading ? (
        <div className="space-y-2 p-1">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyBlock
          icon={Activity}
          title="No activity yet"
          description="Your workspace events will appear here as you record them."
          className="py-8"
        />
      ) : (
        <div className="space-y-0.5">
          {items.slice(0, 6).map((item) => {
            const Icon = typeIcons[item.type] || Activity
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
                    toneTile[item.badgeTone || "default"],
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-foreground">{item.title}</span>
                    {item.amount !== undefined ? (
                      <span
                        className={cn(
                          "text-[11px] font-semibold tabular",
                          item.amount < 0 ? "text-destructive" : "text-success",
                        )}
                      >
                        {formatCurrency(Math.abs(item.amount))}
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-[11.5px] text-muted-foreground">{item.subtitle}</span>
                </span>
                <span className="shrink-0 text-[10.5px] text-muted-foreground">{formatDate(item.timestamp)}</span>
              </Link>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
