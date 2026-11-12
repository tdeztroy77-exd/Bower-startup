"use client"

import { useMemo, useState } from "react"
import { Download, FileText, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Panel } from "@/components/dashboard/panel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Payment = {
  amount?: number | string | null
  status?: string | null
  due_date?: string | null
  paid_date?: string | null
  payment_method?: string | null
  reference_number?: string | null
}

const TEMPLATES = [
  { id: "tenant-statement", label: "Statement of account" },
  { id: "receipt", label: "Rent receipt" },
  { id: "lease", label: "Tenancy agreement" },
  { id: "demand-letter", label: "Arrears demand letter" },
  { id: "deposit-refund", label: "Deposit refund statement" },
] as const

const settled = (status?: string | null) => status === "paid" || status === "completed"
const money = (value: unknown) => (value === null || value === undefined || value === "" ? "" : String(value))
const monthLabel = (iso?: string | null) => {
  const date = iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`) : new Date()
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
}

/**
 * Generates a real document from the tenant record.
 *
 * The values are taken from the record and are editable before download, so a
 * receipt or statement cannot drift from the payment history by accident.
 */
export function TenantDocuments({ tenant, payments, tenantId }: { tenant: any; payments: Payment[]; tenantId?: string }) {
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]["id"]>("tenant-statement")
  const [landlordName, setLandlordName] = useState("")
  const [amountOverride, setAmountOverride] = useState("")
  const [deductions, setDeductions] = useState("")
  const [busy, setBusy] = useState<"preview" | "download" | null>(null)
  const [preview, setPreview] = useState<{ heading: string; lines: string[] }[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [signLink, setSignLink] = useState<string | null>(null)
  const [signedCopied, setSignedCopied] = useState(false)

  const rent = Number(tenant?.monthly_rent ?? tenant?.properties?.rent_amount ?? 0)
  const latestPaid = payments.find((payment) => settled(payment.status))
  const paidThisMonth = payments
    .filter((payment) => settled(payment.status) && payment.due_date && monthLabel(payment.due_date) === monthLabel())
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const outstanding = payments
    .filter((payment) => !settled(payment.status) && !["cancelled", "canceled"].includes(payment.status || ""))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

  const period = monthLabel(latestPaid?.due_date)

  const fields = useMemo(() => {
    const common = {
      landlordName,
      tenantName: tenant?.full_name || [tenant?.first_name, tenant?.last_name].filter(Boolean).join(" "),
      tenantId: tenant?.national_id || tenant?.id_number || "",
      tenantPhone: tenant?.phone || "",
      propertyName: tenant?.properties?.name || "",
      propertyAddress: tenant?.properties?.address || tenant?.properties?.name || "",
    }

    switch (template) {
      case "receipt":
        return {
          ...common,
          periodCovered: period,
          amountPaid: amountOverride || money(latestPaid?.amount ?? rent),
          paymentMethod: latestPaid?.payment_method || "M-Pesa",
          reference: latestPaid?.reference_number || "",
        }
      case "lease":
        return {
          ...common,
          leaseStart: tenant?.lease_start_date || "",
          leaseEnd: tenant?.lease_end_date || "",
          rentAmount: money(rent),
          deposit: money(Number(rent) * 2 || tenant?.deposit_amount || ""),
        }
      case "demand-letter":
        return {
          ...common,
          periodCovered: period,
          amountDue: amountOverride || money(outstanding || rent),
          demandDate: new Date().toISOString().slice(0, 10),
          dueDateHint: "Seven (7) days from the date of this letter",
        }
      case "deposit-refund":
        return {
          ...common,
          deposit: money(tenant?.deposit_amount ?? Number(rent) * 2),
          deductions,
          refundAmount: amountOverride || money(Number(tenant?.deposit_amount ?? Number(rent) * 2) - Number(deductions || 0)),
          handoverDate: tenant?.lease_end_date || "",
        }
      default:
        return {
          ...common,
          periodCovered: monthLabel(),
          rentAmount: money(rent),
          amountPaid: amountOverride || money(paidThisMonth),
          balance: money(Math.max(0, rent - paidThisMonth)),
        }
    }
  }, [template, landlordName, amountOverride, deductions, tenant, rent, latestPaid, paidThisMonth, outstanding, period])

  async function previewDocument() {
    setBusy("preview")
    setError(null)
    try {
      const response = await fetch(`/api/templates/${template}/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fields }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Preview failed")
      setPreview(data.sections || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed")
    } finally {
      setBusy(null)
    }
  }

  async function download() {
    setBusy("download")
    setError(null)
    try {
      const response = await fetch(`/api/templates/${template}/docx`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fields }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Could not generate the document")
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${template}-${new Date().toISOString().slice(0, 10)}.docx`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the document")
    } finally {
      setBusy(null)
    }
  }

  async function sendForSignature() {
    if (!tenantId) return
    setSigning(true)
    setError(null)
    setSignLink(null)
    try {
      const response = await fetch("/api/esign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, template_id: template, fields }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not create the signing link")
      setSignLink(data.url)
      try {
        await navigator.clipboard.writeText(data.url)
        setSignedCopied(true)
      } catch {
        setSignedCopied(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the signing link")
    } finally {
      setSigning(false)
    }
  }

  return (
    <Panel
      title="Documents"
      description="Generated from this record — not a blank template"
      action={
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
          <Sparkles className="size-3" /> Auto-filled
        </span>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[12.5px]">Document</Label>
          <Select
            value={template}
            onValueChange={(value) => {
              setTemplate(value as typeof template)
              setPreview(null)
              setAmountOverride("")
            }}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doc-landlord" className="text-[12.5px]">Landlord / agency name</Label>
          <Input
            id="doc-landlord"
            value={landlordName}
            onChange={(event) => setLandlordName(event.target.value)}
            placeholder="e.g. Kiarie Holdings"
            className="h-10 rounded-xl"
          />
        </div>

        {template === "receipt" || template === "demand-letter" || template === "tenant-statement" || template === "deposit-refund" ? (
          <div className="space-y-1.5">
            <Label htmlFor="doc-amount" className="text-[12.5px]">
              {template === "receipt"
                ? "Amount received (KES)"
                : template === "demand-letter"
                  ? "Amount due (KES)"
                  : template === "deposit-refund"
                    ? "Refund amount (KES)"
                    : "Amount paid (KES)"}
            </Label>
            <Input
              id="doc-amount"
              inputMode="decimal"
              value={amountOverride}
              onChange={(event) => setAmountOverride(event.target.value)}
              placeholder={template === "receipt" ? money(latestPaid?.amount ?? rent) : money(rent)}
              className="h-10 rounded-xl"
            />
          </div>
        ) : null}

        {template === "deposit-refund" ? (
          <div className="space-y-1.5">
            <Label htmlFor="doc-deductions" className="text-[12.5px]">Deductions (KES)</Label>
            <Input
              id="doc-deductions"
              inputMode="decimal"
              value={deductions}
              onChange={(event) => setDeductions(event.target.value)}
              placeholder="0"
              className="h-10 rounded-xl"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" className="rounded-lg" onClick={download} disabled={busy !== null}>
          {busy === "download" ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          Download .docx
        </Button>
        <Button size="sm" variant="outline" className="rounded-lg bg-card" onClick={previewDocument} disabled={busy !== null}>
          {busy === "preview" ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
          Preview
        </Button>
        {tenantId ? (
          <Button size="sm" variant="outline" className="rounded-lg bg-card" onClick={sendForSignature} disabled={signing}>
            {signing ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Send for signature
          </Button>
        ) : null}
      </div>

      {signLink ? (
        <div className="mt-3 rounded-xl border border-border/70 bg-background p-3">
          <p className="text-[11px] font-semibold text-foreground">Signing link created</p>
          <p className="mt-1 break-all font-mono text-[10px] leading-4 text-muted-foreground">{signLink}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Expires in 14 days. {signedCopied ? "Copied to clipboard." : "Copy it and send it to the tenant."}
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-[11.5px] text-destructive">{error}</p> : null}

      {preview ? (
        <div className="mt-4 space-y-3 rounded-xl border border-dashed border-border bg-muted/30 p-3.5">
          {preview.map((section) => (
            <div key={section.heading}>
              <p className="text-[11.5px] font-semibold text-foreground">{section.heading}</p>
              <ul className="mt-1 space-y-0.5">
                {section.lines.map((line) => (
                  <li key={line} className="text-[11.5px] leading-5 text-muted-foreground">
                    · {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-[10.5px] text-muted-foreground">
            Preview only. The downloaded .docx carries the full layout, clauses and signature blocks.
          </p>
        </div>
      ) : null}
    </Panel>
  )
}
