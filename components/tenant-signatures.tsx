"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, FileSignature, Loader2, XCircle } from "lucide-react"
import { StatusPill } from "@/components/dashboard/status-pill"
import { Button } from "@/components/ui/button"

type Request = {
  id: string
  template_id: string
  status: "sent" | "viewed" | "signed" | "void"
  created_at: string
  signed_at: string | null
  signer_name: string | null
}

const TEMPLATE_LABELS: Record<string, string> = {
  lease: "Tenancy agreement",
  receipt: "Rent receipt",
  "key-handover": "Key handover record",
  inspection: "Condition report",
  maintenance: "Maintenance request",
  termination: "Notice to quit",
  "rent-increase": "Rent review notice",
  complaint: "Complaint report",
  checklist: "Landlord checklist",
  "expense-log": "Expense log",
  "demand-letter": "Arrears demand letter",
  "deposit-refund": "Deposit refund statement",
  "tenant-statement": "Statement of account",
}

const tone = (status: Request["status"]) =>
  status === "signed" ? "success" : status === "viewed" ? "warning" : status === "void" ? "neutral" : "brand"

/**
 * Signature history for one tenant: what was sent, whether it was viewed,
 * whether it is signed, and the signed copy. Voiding withdraws a live link.
 */
export function TenantSignatures({ tenantId }: { tenantId: string }) {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/esign?tenant_id=${encodeURIComponent(tenantId)}`)
      const data = response.ok ? await response.json() : []
      setRequests(Array.isArray(data) ? data : [])
    } catch {
      setError("Could not load signature requests")
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    load()
  }, [load])

  async function voidRequest(id: string) {
    if (!window.confirm("Withdraw this signing link? The tenant will not be able to sign it.")) return
    setBusy(id)
    setError(null)
    try {
      const response = await fetch(`/api/esign/${id}/void`, { method: "POST" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not withdraw the link")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not withdraw the link")
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-[12.5px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading signatures…
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <p className="text-[12.5px] leading-6 text-muted-foreground">
        No documents have been sent for signature yet. Use <span className="font-medium text-foreground">Documents → Send for signature</span>.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {requests.map((request) => (
        <div key={request.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
            <FileSignature className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-foreground">
              {TEMPLATE_LABELS[request.template_id] || request.template_id}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Sent {new Date(request.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              {request.signed_at
                ? ` · signed ${new Date(request.signed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}${request.signer_name ? ` by ${request.signer_name}` : ""}`
                : ""}
            </p>
          </div>
          <StatusPill tone={tone(request.status)} dot>
            {request.status}
          </StatusPill>
          {request.status === "signed" ? (
            <Button asChild size="sm" variant="outline" className="h-8 rounded-lg bg-card text-[11.5px]">
              <a href={`/api/esign/${request.id}/document`}>
                <Download className="size-3.5" /> Signed copy
              </a>
            </Button>
          ) : request.status === "sent" || request.status === "viewed" ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg text-[11.5px] text-muted-foreground hover:text-destructive"
              disabled={busy === request.id}
              onClick={() => voidRequest(request.id)}
            >
              {busy === request.id ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
              Withdraw
            </Button>
          ) : null}
        </div>
      ))}
      {error ? <p className="text-[11.5px] text-destructive">{error}</p> : null}
    </div>
  )
}
