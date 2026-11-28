"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X, Sparkles } from "lucide-react"

interface SubStatus {
  is_active: boolean
  is_trialing: boolean
  trial_expired: boolean
  days_left: number
  plan: string | null
  plan_name: string | null
  reason: string
}

/**
 * A single quiet strip — not a full-width alert box. It only exists while a
 * decision is genuinely due, and it can be dismissed while the trial runs.
 */
export function TrialBanner() {
  const [status, setStatus] = useState<SubStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStatus(d)
      })
      .catch(() => {})
  }, [])

  if (!status || dismissed) return null

  const blocked =
    status.trial_expired ||
    status.reason === "canceled" ||
    status.reason === "expired" ||
    status.reason === "past_due"

  if (!blocked && !(status.is_trialing && status.days_left > 0)) return null

  return (
    <div
      className={
        blocked
          ? "mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-4 py-2.5 text-[13px]"
          : "mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-pine/15 bg-secondary/70 px-4 py-2.5 text-[13px]"
      }
    >
      <Sparkles className={blocked ? "size-4 shrink-0 text-destructive" : "size-4 shrink-0 text-pine"} />
      <p className="min-w-0 flex-1 text-foreground">
        {blocked ? (
          <>
            <span className="font-semibold">Your access is paused.</span>{" "}
            <span className="text-muted-foreground">Choose a plan to pick up where you left off.</span>
          </>
        ) : (
          <>
            <span className="font-semibold">{status.days_left} day{status.days_left === 1 ? "" : "s"} left</span>{" "}
            <span className="text-muted-foreground">
              on your {status.plan_name || "Pro"} trial — keep every workflow running.
            </span>
          </>
        )}
      </p>
      <Link
        href="/dashboard/billing"
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {blocked ? "Choose a plan" : "Upgrade"}
      </Link>
      {!blocked && status.days_left > 3 ? (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss trial notice"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
