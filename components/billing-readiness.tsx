"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react"
import { StatusPill } from "@/components/dashboard/status-pill"

type Readiness = {
  mpesa: {
    environment: "sandbox" | "production"
    sandbox: boolean
    configured: boolean
    mock_active: boolean
    shortcode_type: "paybill" | "till"
    callback_host: string | null
    callback_https: boolean
    issues: string[]
  }
  stripe: { configured: boolean }
  billing_database: boolean
}

/**
 * Operational readiness for the money rails. Visible to the account owner so
 * a failed payment can be diagnosed without reading server logs, but it never
 * exposes credentials, the shortcode or the callback secret.
 */
export function BillingReadiness() {
  const [data, setData] = useState<Readiness | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/mpesa/readiness")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setData(payload))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-[12.5px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking payment rails…
      </div>
    )
  }

  if (!data) {
    return (
      <p className="py-4 text-[12.5px] text-muted-foreground">
        Readiness check is unavailable right now.
      </p>
    )
  }

  const rows = [
    {
      label: "M-Pesa environment",
      value: data.mpesa.sandbox ? "Sandbox" : "Production",
      ok: !data.mpesa.sandbox,
      detail: data.mpesa.sandbox
        ? "Test credentials. Real money will not move."
        : "Live Daraja credentials are in use.",
    },
    {
      label: "M-Pesa credentials",
      value: data.mpesa.configured ? "Configured" : "Incomplete",
      ok: data.mpesa.configured,
      detail: `${data.mpesa.shortcode_type === "till" ? "Till" : "PayBill"} · callback ${
        data.mpesa.callback_host || "not set"
      }`,
    },
    {
      label: "Card payments",
      value: data.stripe.configured ? "Configured" : "Not configured",
      ok: data.stripe.configured,
      detail: "Stripe Checkout for monthly card subscriptions.",
    },
  ]

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-foreground">{row.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{row.detail}</p>
            </div>
            <StatusPill tone={row.ok ? "success" : "warning"} dot>
              {row.value}
            </StatusPill>
          </li>
        ))}
      </ul>

      {data.mpesa.mock_active ? (
        <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-2.5 py-2 text-[11px] text-warning">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          Mock transport is active. This build cannot take real payments.
        </p>
      ) : null}

      {data.mpesa.issues.length > 0 ? (
        <details className="rounded-lg border border-border/70 bg-background px-3 py-2">
          <summary className="cursor-pointer text-[11.5px] font-medium text-foreground">
            {data.mpesa.issues.length} configuration issue
            {data.mpesa.issues.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {data.mpesa.issues.map((issue) => (
              <li key={issue} className="flex gap-1.5">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-warning" />
                {issue}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10.5px] text-muted-foreground">
            Follow docs/mpesa-production.md before taking live payments.
          </p>
        </details>
      ) : (
        <p className="flex items-center gap-1.5 text-[11px] text-success">
          <CheckCircle2 className="size-3.5" /> Payment rails look ready.
        </p>
      )}
    </div>
  )
}
