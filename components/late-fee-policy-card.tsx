"use client"

import { useEffect, useState } from "react"
import { Loader2, Percent, Play, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Panel } from "@/components/dashboard/panel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Policy = {
  enabled: boolean
  grace_days: number
  fee_type: "flat" | "percent"
  amount: number
  percent: number
  cap: number
}

type Charge = {
  id: string
  amount: number
  applied_at: string
  waived: boolean
  tenants?: { full_name?: string | null; first_name?: string | null; last_name?: string | null } | null
}

const money = (value: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value)

const DEFAULT: Policy = { enabled: false, grace_days: 5, fee_type: "flat", amount: 500, percent: 5, cap: 5000 }

/**
 * Late fee policy. Off by default: a portfolio that does not charge fees should
 * never have one applied silently. One fee per invoice, capped, after grace.
 */
export function LateFeePolicyCard() {
  const [policy, setPolicy] = useState<Policy>(DEFAULT)
  const [charges, setCharges] = useState<Charge[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/late-fees")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return
        setPolicy({ ...DEFAULT, ...data.policy })
        setCharges(data.charges || [])
      })
      .catch(() => setError("Could not load the late fee policy"))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch("/api/late-fees", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(policy),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not save the policy")
      setPolicy({ ...DEFAULT, ...data })
      setNotice("Policy saved.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the policy")
    } finally {
      setSaving(false)
    }
  }

  async function applyNow() {
    setRunning(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch("/api/late-fees", { method: "POST" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not apply late fees")
      setNotice(
        data.applied > 0
          ? `Applied ${data.applied} fee${data.applied === 1 ? "" : "s"} · ${money(data.total)}.`
          : "No invoices qualified — nothing applied.",
      )
      const refresh = await fetch("/api/late-fees").then((r) => (r.ok ? r.json() : null))
      if (refresh) setCharges(refresh.charges || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply late fees")
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <Panel title="Late fees" description="Policy and charges">
        <div className="flex items-center gap-2 py-6 text-[12.5px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading policy…
        </div>
      </Panel>
    )
  }

  return (
    <Panel
      title="Late fees"
      description="One capped fee per invoice, after the grace period"
      action={
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <Scale className="size-3" /> {policy.enabled ? "On" : "Off"}
        </span>
      }
    >
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-background p-3.5">
        <div>
          <p className="text-[12.5px] font-semibold text-foreground">Apply late fees automatically</p>
          <p className="mt-0.5 max-w-lg text-[11.5px] leading-5 text-muted-foreground">
            Only unpaid rent past the grace period is charged. Fees are capped and never compound. Check that
            your tenancy agreement allows a fee before switching this on.
          </p>
        </div>
        <Switch
          checked={policy.enabled}
          onCheckedChange={(enabled) => setPolicy((current) => ({ ...current, enabled }))}
          aria-label="Enable late fees"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="grace" className="text-[12px]">Grace days</Label>
          <Input
            id="grace"
            type="number"
            min={0}
            max={30}
            value={policy.grace_days}
            onChange={(event) => setPolicy((current) => ({ ...current, grace_days: Number(event.target.value) }))}
            className="h-9 rounded-lg"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Fee type</Label>
          <Select
            value={policy.fee_type}
            onValueChange={(value) => setPolicy((current) => ({ ...current, fee_type: value as Policy["fee_type"] }))}
          >
            <SelectTrigger className="h-9 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat amount</SelectItem>
              <SelectItem value="percent">Percent of rent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fee-value" className="text-[12px]">
            {policy.fee_type === "flat" ? "Fee (KES)" : "Fee (%)"}
          </Label>
          <div className="relative">
            <Input
              id="fee-value"
              type="number"
              min={0}
              value={policy.fee_type === "flat" ? policy.amount : policy.percent}
              onChange={(event) =>
                setPolicy((current) =>
                  current.fee_type === "flat"
                    ? { ...current, amount: Number(event.target.value) }
                    : { ...current, percent: Number(event.target.value) },
                )
              }
              className="h-9 rounded-lg pr-8"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
              {policy.fee_type === "flat" ? "KES" : <Percent className="size-3" />}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cap" className="text-[12px]">Cap (KES)</Label>
          <Input
            id="cap"
            type="number"
            min={0}
            value={policy.cap}
            onChange={(event) => setPolicy((current) => ({ ...current, cap: Number(event.target.value) }))}
            className="h-9 rounded-lg"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
        <Button size="sm" className="rounded-lg" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Save policy
        </Button>
        <Button size="sm" variant="outline" className="rounded-lg bg-card" onClick={applyNow} disabled={running || !policy.enabled}>
          {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
          Apply now
        </Button>
        {notice ? <p className="text-[11.5px] text-success">{notice}</p> : null}
      </div>

      {error ? <p className="mt-2 text-[11.5px] text-destructive">{error}</p> : null}

      {charges.length > 0 ? (
        <div className="mt-4 border-t border-border/70 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Recent charges</p>
          <ul className="mt-2 divide-y divide-border/60">
            {charges.map((charge) => {
              const tenant = charge.tenants
              const name =
                tenant?.full_name ||
                [tenant?.first_name, tenant?.last_name].filter(Boolean).join(" ") ||
                "Tenant"
              return (
                <li key={charge.id} className="flex items-center justify-between gap-3 py-2 text-[12px]">
                  <span className="truncate text-foreground">{name}</span>
                  <span className="text-muted-foreground">
                    {new Date(charge.applied_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ·{" "}
                    <span className="font-semibold text-foreground">{money(Number(charge.amount))}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </Panel>
  )
}
