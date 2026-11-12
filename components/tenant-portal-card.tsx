"use client"

import { useState } from "react"
import { Check, Copy, Link2, Loader2, RefreshCw, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Issues and revokes a tenant's portal link. The raw token exists only in the
 * response, so the link is shown once and can be copied immediately.
 */
export function TenantPortalCard({ tenantId }: { tenantId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [busy, setBusy] = useState<"create" | "revoke" | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    setBusy("create")
    setError(null)
    setCopied(false)
    try {
      const response = await fetch(`/api/tenants/${tenantId}/portal-link`, { method: "POST" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not create the link")
      setUrl(data.url)
      setExpiresAt(data.expires_at)
      try {
        await navigator.clipboard.writeText(data.url)
        setCopied(true)
      } catch {
        /* clipboard may be blocked; the link is still visible */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the link")
    } finally {
      setBusy(null)
    }
  }

  async function revoke() {
    if (!window.confirm("Revoke this tenant's portal link? They will need a new one.")) return
    setBusy("revoke")
    setError(null)
    try {
      const response = await fetch(`/api/tenants/${tenantId}/portal-link`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not revoke the link")
      setUrl(null)
      setExpiresAt(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revoke the link")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-6 text-muted-foreground">
        Give this tenant a private link to see their balance, pay by M-Pesa and report a repair — no
        account or password needed.
      </p>

      {url ? (
        <div className="space-y-2 rounded-xl border border-border/70 bg-background p-3">
          <p className="break-all font-mono text-[10.5px] leading-4 text-foreground">{url}</p>
          <p className="text-[10.5px] text-muted-foreground">
            Expires {expiresAt ? new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "in 30 days"}.
            Anyone with this link can see the tenant&apos;s rent account.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg bg-card text-[11.5px]"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url)
                  setCopied(true)
                } catch {
                  setError("Copy blocked by the browser — select the link above.")
                }
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg text-[11.5px] text-muted-foreground"
              onClick={revoke}
              disabled={busy !== null}
            >
              {busy === "revoke" ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldOff className="size-3.5" />}
              Revoke
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" className="rounded-lg" onClick={create} disabled={busy !== null}>
          {busy === "create" ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
          Create portal link
        </Button>
      )}

      {url ? (
        <Button size="sm" variant="outline" className="h-8 rounded-lg bg-card text-[11.5px]" onClick={create} disabled={busy !== null}>
          {busy === "create" ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Replace with a new link
        </Button>
      ) : null}

      {error ? <p className="text-[11.5px] text-destructive">{error}</p> : null}
    </div>
  )
}
