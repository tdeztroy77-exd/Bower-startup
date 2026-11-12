"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type Settings = { enabled: boolean; days_before: number; sender_id: string | null }

/** Daily SMS reminder settings for tenants without email. */
export function SmsSettingsCard() {
  const [settings, setSettings] = useState<Settings>({ enabled: false, days_before: 3, sender_id: null })
  const [configured, setConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/sms/settings")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return
        setSettings({
          enabled: Boolean(data.settings?.enabled),
          days_before: Number(data.settings?.days_before ?? 3),
          sender_id: data.settings?.sender_id ?? null,
        })
        setConfigured(Boolean(data.configured))
      })
      .catch(() => setError("Could not load SMS settings"))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch("/api/sms/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not save SMS settings")
      setNotice("Reminder settings saved.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save SMS settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-[12.5px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading SMS settings…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-background p-3.5">
        <div>
          <p className="text-[12.5px] font-semibold text-foreground">SMS reminders</p>
          <p className="mt-0.5 text-[11.5px] leading-5 text-muted-foreground">
            Daily reminder to tenants with no email, {settings.days_before} day
            {settings.days_before === 1 ? "" : "s"} before rent is due (and while it is overdue).
          </p>
          {!configured ? (
            <p className="mt-1.5 text-[11px] text-warning">
              Provider not configured — messages will be logged as skipped, not sent.
            </p>
          ) : null}
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(enabled) => setSettings((current) => ({ ...current, enabled }))}
          aria-label="Enable SMS reminders"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sms-days" className="text-[12px]">Days before due</Label>
          <Input
            id="sms-days"
            type="number"
            min={0}
            max={14}
            value={settings.days_before}
            onChange={(event) => setSettings((current) => ({ ...current, days_before: Number(event.target.value) }))}
            className="h-9 rounded-lg"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sms-sender" className="text-[12px]">Sender ID (optional)</Label>
          <Input
            id="sms-sender"
            value={settings.sender_id || ""}
            onChange={(event) => setSettings((current) => ({ ...current, sender_id: event.target.value }))}
            placeholder="e.g. BOWER"
            className="h-9 rounded-lg"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="rounded-lg" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Save reminder settings
        </Button>
        {notice ? <p className="text-[11.5px] text-success">{notice}</p> : null}
      </div>
      {error ? <p className="text-[11.5px] text-destructive">{error}</p> : null}
    </div>
  )
}
