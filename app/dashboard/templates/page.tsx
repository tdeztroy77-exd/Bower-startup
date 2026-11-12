"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatusPill } from "@/components/dashboard/status-pill"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  FileText, Download, Loader2, AlertCircle, CheckCircle2, Sparkles,
} from "lucide-react"

interface Template {
  id: string
  title: string
  description: string
  category: string
  pages: number
  fields: string[]
}

const FIELD_LABELS: Record<string, string> = {
  landlordName: "Landlord / Agency name",
  landlordAddress: "Landlord address",
  landlordId: "Landlord ID / Company reg",
  tenantName: "Tenant full name",
  tenantId: "Tenant ID number",
  tenantPhone: "Tenant phone",
  propertyName: "Property name",
  propertyAddress: "Property address",
  leaseStart: "Lease start date",
  leaseEnd: "Lease end date",
  rentAmount: "Monthly rent (KES)",
  deposit: "Refundable deposit (KES)",
  periodCovered: "Period covered",
  amountPaid: "Amount paid (KES)",
  paymentMethod: "Payment method",
  reference: "M-Pesa reference",
  handoverDate: "Handover date",
  inspectionDate: "Inspection date",
  inspectionType: "Inspection type",
  category: "Category",
  priority: "Priority",
  description: "Description",
  preferredTime: "Preferred access time",
  requestDate: "Request date",
  terminationDate: "Termination effective date",
  reason: "Reason (optional)",
  currentRent: "Current rent (KES)",
  newRent: "New rent (KES)",
  effectiveDate: "Effective date",
  incidentDate: "Incident date",
}

const FIELD_TYPES: Record<string, "text" | "date" | "number" | "textarea" | "select"> = {
  leaseStart: "date",
  leaseEnd: "date",
  handoverDate: "date",
  inspectionDate: "date",
  inspectionType: "select",
  rentAmount: "number",
  deposit: "number",
  amountPaid: "number",
  currentRent: "number",
  newRent: "number",
  priority: "select",
  category: "select",
  description: "textarea",
  reason: "textarea",
  paymentMethod: "select",
  preferredTime: "text",
  requestDate: "date",
  terminationDate: "date",
  effectiveDate: "date",
  incidentDate: "date",
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [preview, setPreview] = useState<any | null>(null)

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []))
      .catch(() => setTemplates([]))
  }, [])

  const selected = useMemo(() => templates?.find((t) => t.id === selectedId) || null, [templates, selectedId])

  const handleDownload = async () => {
    if (!selected) return
    setError(null)
    setSuccess(null)
    setDownloading(true)
    try {
      const r = await fetch(`/api/templates/${selected.id}/docx`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fields }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        throw new Error((data as any).error || "Download failed")
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${selected.id}-${new Date().toISOString().slice(0, 10)}.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setSuccess(`Downloaded ${selected.title}.`)
    } catch (e: any) {
      setError(e.message || "Download failed")
    } finally {
      setDownloading(false)
    }
  }

  const handlePreview = async () => {
    if (!selected) return
    setPreview(null)
    setError(null)
    const r = await fetch(`/api/templates/${selected.id}/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fields }),
    })
    const d = await r.json().catch(() => null)
    if (!r.ok) {
      setError(d?.error || "Preview unavailable")
      return
    }
    setPreview(d?.data || d)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Documents"
        title="Templates"
        description="Kenya-specific leases, receipts, inspections and notices. Fill the fields and download a real .docx."
      />

      {!templates ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[132px] w-full rounded-2xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Panel bodyClassName="p-0">
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <FileText className="size-5 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">No templates available</p>
            <p className="text-xs text-muted-foreground">The template library could not be loaded.</p>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelectedId(t.id); setFields({}); setPreview(null); setSuccess(null); setError(null) }}
              className={`rounded-2xl border p-4 text-left shadow-card transition-[border-color,transform] hover:-translate-y-0.5 ${
                selectedId === t.id
                  ? "border-primary/40 bg-secondary/40"
                  : "border-border/80 bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[13.5px] font-semibold leading-5 text-foreground">{t.title}</h3>
                <StatusPill tone="neutral">{t.category}</StatusPill>
              </div>
              <p className="mt-2 line-clamp-3 text-[12px] leading-5 text-muted-foreground">{t.description}</p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {t.pages} page{t.pages === 1 ? "" : "s"} · {t.fields.length} field{t.fields.length === 1 ? "" : "s"}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Panel
          title={selected.title}
          description={selected.description}
          action={<StatusPill tone="brand">{selected.category}</StatusPill>}
        >
          <div className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-[12.5px] text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 rounded-xl border border-success/20 bg-success/[0.07] px-3.5 py-2.5 text-[12.5px] text-success">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {selected.fields.map((f) => {
                const label = FIELD_LABELS[f] || f
                const type = FIELD_TYPES[f] || "text"
                const value = fields[f] || ""
                const setValue = (v: string) => setFields((prev) => ({ ...prev, [f]: v }))
                return (
                  <div key={f} className="space-y-1.5">
                    <Label htmlFor={f} className="text-[12.5px]">{label}</Label>
                    {type === "textarea" ? (
                      <Textarea id={f} rows={3} value={value} onChange={(e) => setValue(e.target.value)} />
                    ) : type === "select" ? (
                      <Select value={value} onValueChange={setValue}>
                        <SelectTrigger id={f} className="h-10 rounded-xl"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {f === "priority" && (
                            <>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </>
                          )}
                          {f === "category" && (
                            <>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="plumbing">Plumbing</SelectItem>
                              <SelectItem value="electrical">Electrical</SelectItem>
                              <SelectItem value="appliance">Appliance</SelectItem>
                              <SelectItem value="structural">Structural</SelectItem>
                              <SelectItem value="pest">Pest control</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </>
                          )}
                          {f === "inspectionType" && (
                            <>
                              <SelectItem value="Move-in">Move-in</SelectItem>
                              <SelectItem value="Move-out">Move-out</SelectItem>
                            </>
                          )}
                          {f === "paymentMethod" && (
                            <>
                              <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                              <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Cheque">Cheque</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input id={f} type={type} value={value} onChange={(e) => setValue(e.target.value)} className="h-10 rounded-xl" />
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
              <Button onClick={handleDownload} disabled={downloading} className="rounded-lg">
                {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Download .docx
              </Button>
              <Button variant="outline" className="rounded-lg bg-card" onClick={handlePreview} disabled={!selected}>
                <Sparkles className="size-4" /> Preview
              </Button>
              <Button variant="ghost" className="rounded-lg" onClick={() => { setFields({}); setPreview(null) }}>
                Clear
              </Button>
            </div>

            {preview && (
              <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-[13px]">
                {preview.sections?.map((s: any, i: number) => (
                  <div key={i}>
                    <h4 className="mb-1 text-[12.5px] font-semibold text-foreground">{s.heading}</h4>
                    <ul className="space-y-0.5 text-muted-foreground">
                      {s.lines.map((l: string, j: number) => (
                        <li key={j}>· {l}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="text-[11px] italic text-muted-foreground">
                  Quick preview. The downloaded .docx has full page layout, headers, signature blocks and page numbers.
                </p>
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}
