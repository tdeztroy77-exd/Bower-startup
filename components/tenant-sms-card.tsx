"use client"

import { useEffect, useState } from "react"
import { Loader2, MessageSquare, Send } from "lucide-react"
import { Button } from "@/components/ui/button"

type Message = {
  id: string
  body: string
  status: string
  created_at: string
}

/**
 * Manual SMS reminder for one tenant, plus the real delivery log. When the
 * provider is not configured the button explains why instead of pretending.
 */
export function TenantSmsCard({ tenantId }: { tenantId: string }) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/sms/settings")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setConfigured(Boolean(data?.configured)))
      .catch(() => setConfigured(false))
    fetch(`/api/sms?tenant_id=${encodeURIComponent(tenantId)}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setMessages(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => setMessages([]))
  }, [tenantId])

  async function send() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, message: body || undefined }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not send the SMS")
      setNotice("Reminder sent.")
      setBody("")
      const refreshed = await fetch(`/api/sms?tenant_id=${encodeURIComponent(tenantId)}`).then((r) =>
        r.ok ? r.json() : [],
      )
      setMessages(Array.isArray(refreshed) ? refreshed.slice(0, 4) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the SMS")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-6 text-muted-foreground">
        Use this for tenants who have no email on file. One reminder per tenant per 20 hours from the daily
        job; manual sends are logged too.
      </p>

      {configured === false ? (
        <p className="rounded-xl border border-warning/25 bg-warning/[0.06] px-3 py-2 text-[11.5px] text-warning">
          SMS is not configured. Add <code>AFRICASTALKING_USERNAME</code> and{" "}
          <code>AFRICASTALKING_API_KEY</code> to the deployment to enable sending.
        </p>
      ) : null}

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Optional. Leave blank to send the standard balance reminder."
        rows={2}
        maxLength={480}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="rounded-lg" onClick={send} disabled={busy || configured !== true}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          Send reminder
        </Button>
        {notice ? <p className="text-[11.5px] text-success">{notice}</p> : null}
      </div>
      {error ? <p className="text-[11.5px] text-destructive">{error}</p> : null}

      {messages.length > 0 ? (
        <div className="border-t border-border/70 pt-2">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <MessageSquare className="size-3" /> Recent messages
          </p>
          <ul className="mt-1.5 space-y-1">
            {messages.map((message) => (
              <li key={message.id} className="flex items-start justify-between gap-2 text-[11px]">
                <span className="line-clamp-2 text-muted-foreground">{message.body}</span>
                <span
                  className={
                    message.status === "sent"
                      ? "shrink-0 font-semibold text-success"
                      : message.status === "failed"
                        ? "shrink-0 font-semibold text-destructive"
                        : "shrink-0 font-semibold text-warning"
                  }
                >
                  {message.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
