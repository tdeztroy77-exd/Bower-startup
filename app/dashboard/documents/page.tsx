"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowUpRight,
  CalendarClock,
  Download,
  Eye,
  FileText,
  FileWarning,
  Files,
  ImageIcon,
  Loader2,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { createClient } from "@/lib/supabase/client"
import { cn, formatDate, formatFileSize, tenantName } from "@/lib/utils"

interface DocumentRow {
  id: string
  name: string | null
  type: string | null
  file_url: string | null
  file_size: number | null
  mime_type: string | null
  notes: string | null
  expiry_date: string | null
  reminder_days_before: number | null
  created_at: string | null
  properties?: { name?: string | null; address?: string | null } | null
  tenants?: { full_name?: string | null; first_name?: string | null; last_name?: string | null } | null
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "lease", label: "Leases" },
  { value: "insurance", label: "Insurance" },
  { value: "inspection", label: "Inspections" },
  { value: "photo", label: "Photos" },
  { value: "other", label: "Other" },
] as const

type FilterValue = (typeof FILTERS)[number]["value"]

const typeTone: Record<string, "brand" | "info" | "neutral"> = {
  lease: "brand",
  insurance: "info",
}

/** Whole days from today until the expiry date; null when there is no date. */
function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expiry = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((expiry.getTime() - today.getTime()) / 86400000)
}

function ExpiryCell({ document }: { document: DocumentRow }) {
  const days = daysUntil(document.expiry_date)
  if (days === null) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  if (days < 0) {
    return (
      <div className="flex flex-col items-start gap-1">
        <StatusPill tone="danger" dot>
          Expired
        </StatusPill>
        <span className="text-[11px] text-muted-foreground tabular">
          {formatDate(document.expiry_date)}
        </span>
      </div>
    )
  }
  const window = document.reminder_days_before ?? 30
  if (days <= window) {
    return (
      <div className="flex flex-col items-start gap-1">
        <StatusPill tone="warning" dot>
          {days === 0 ? "Expires today" : `${days} days left`}
        </StatusPill>
        <span className="text-[11px] text-muted-foreground tabular">
          {formatDate(document.expiry_date)}
        </span>
      </div>
    )
  }
  return (
    <span className="text-[13px] text-muted-foreground tabular">
      {formatDate(document.expiry_date)}
    </span>
  )
}

function FileIcon({ mimeType }: { mimeType?: string | null }) {
  if (mimeType?.startsWith("image/")) {
    return <ImageIcon className="size-4" strokeWidth={1.9} />
  }
  return <FileText className="size-4" strokeWidth={1.9} />
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterValue>("all")

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("documents")
          .select(`
            *,
            properties (name, address),
            tenants (full_name, first_name, last_name)
          `)
          .order("created_at", { ascending: false })

        if (error) throw error
        setDocuments((data || []) as DocumentRow[])
      } catch (err: any) {
        console.error("[bower] documents fetch error", err)
        setError(err.message || "Failed to load documents")
      } finally {
        setLoading(false)
      }
    }
    fetchDocuments()
  }, [])

  const leaseDocuments = documents.filter((doc) => doc.type === "lease")
  const insuranceDocuments = documents.filter((doc) => doc.type === "insurance")
  const inspectionDocuments = documents.filter((doc) => doc.type === "inspection")
  const photoDocuments = documents.filter((doc) => doc.type === "photo")
  const otherDocuments = documents.filter(
    (doc) => !["lease", "insurance", "inspection", "photo"].includes(doc.type ?? ""),
  )

  const expiringSoon = documents.filter((doc) => {
    const days = daysUntil(doc.expiry_date)
    if (days === null || days < 0) return false
    return days <= (doc.reminder_days_before ?? 30)
  })
  const expired = documents.filter((doc) => {
    const days = daysUntil(doc.expiry_date)
    return days !== null && days < 0
  })

  const counts: Record<FilterValue, number> = {
    all: documents.length,
    lease: leaseDocuments.length,
    insurance: insuranceDocuments.length,
    inspection: inspectionDocuments.length,
    photo: photoDocuments.length,
    other: otherDocuments.length,
  }

  const visible =
    filter === "all"
      ? documents
      : filter === "lease"
        ? leaseDocuments
        : filter === "insurance"
          ? insuranceDocuments
          : filter === "inspection"
            ? inspectionDocuments
            : filter === "photo"
              ? photoDocuments
              : otherDocuments

  const activeLabel = FILTERS.find((item) => item.value === filter)?.label ?? "All"

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Vault"
        title="Documents"
        description="Leases, insurance, inspections and photos — one secure library, linked to the property and the tenant."
        actions={
          <Button asChild size="sm" className="rounded-lg">
            <Link href="/dashboard/documents/upload">
              <Plus /> Upload document
            </Link>
          </Button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/[0.05] px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[124px] animate-pulse rounded-2xl border border-border/70 bg-card"
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-border/70 bg-card py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading documents
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="All documents"
              value={documents.length}
              icon={Files}
              accent="emerald"
              hint={`${leaseDocuments.length} leases · ${insuranceDocuments.length} insurance`}
            />
            <StatCard
              label="Leases"
              value={leaseDocuments.length}
              icon={FileText}
              accent="indigo"
              hint="Tenancy agreements on file"
            />
            <StatCard
              label="Expiring soon"
              value={expiringSoon.length}
              icon={CalendarClock}
              accent="amber"
              hint={
                expiringSoon.length === 0
                  ? "Nothing expiring in the reminder window"
                  : "Inside the reminder window"
              }
            />
            <StatCard
              label="Expired"
              value={expired.length}
              icon={FileWarning}
              accent="coral"
              hint={expired.length === 0 ? "All documents current" : "Replace or renew"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((item) => {
              const isActive = filter === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  aria-pressed={isActive}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium transition-colors",
                    isActive
                      ? "border-pine/20 bg-secondary text-secondary-foreground"
                      : "border-border/80 bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                  <span className="text-[11px] tabular opacity-70">{counts[item.value]}</span>
                </button>
              )
            })}
          </div>

          <Panel
            title={activeLabel === "All" ? "All files" : activeLabel}
            description={`${visible.length} ${visible.length === 1 ? "document" : "documents"}`}
            bodyClassName="p-0"
          >
            {visible.length === 0 ? (
              documents.length === 0 ? (
                <EmptyBlock
                  icon={FileText}
                  title="No documents yet"
                  description="Upload a lease, insurance policy or inspection report and it will be filed here with its expiry date."
                  actionHref="/dashboard/documents/upload"
                  actionLabel="Upload first document"
                />
              ) : (
                <EmptyBlock
                  icon={FileText}
                  title={`No ${activeLabel.toLowerCase()} documents`}
                  description="Nothing in the library matches this filter yet."
                  actionHref="/dashboard/documents/upload"
                  actionLabel="Upload a document"
                />
              )
            ) : (
              <div className="overflow-x-auto">
                <table className="pd-table min-w-[900px]">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Type</th>
                      <th>Property</th>
                      <th>Size</th>
                      <th>Uploaded</th>
                      <th>Expiry</th>
                      <th className="text-right">File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((document) => (
                      <tr key={document.id}>
                        <td className="max-w-[300px]">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted/70 text-muted-foreground">
                              <FileIcon mimeType={document.mime_type} />
                            </span>
                            <div className="min-w-0">
                              <Link
                                href={`/dashboard/documents/${document.id}`}
                                className="block truncate text-[13px] font-medium text-foreground hover:text-pine hover:underline"
                              >
                                {document.name || "Untitled document"}
                              </Link>
                              {document.tenants ? (
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {tenantName(document.tenants)}
                                </p>
                              ) : document.notes ? (
                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                  {document.notes}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusPill tone={typeTone[document.type ?? ""] ?? "neutral"}>
                            {document.type || "other"}
                          </StatusPill>
                        </td>
                        <td className="max-w-[180px]">
                          <p className="truncate text-[13px] text-muted-foreground">
                            {document.properties?.name || "—"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap text-[13px] text-muted-foreground tabular">
                          {formatFileSize(document.file_size)}
                        </td>
                        <td className="whitespace-nowrap text-[13px] text-muted-foreground tabular">
                          {formatDate(document.created_at)}
                        </td>
                        <td>
                          <ExpiryCell document={document} />
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-0.5">
                            {document.file_url ? (
                              <>
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon-sm"
                                  className="rounded-lg text-muted-foreground hover:text-pine"
                                >
                                  <a
                                    href={document.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`View ${document.name || "document"}`}
                                  >
                                    <Eye />
                                  </a>
                                </Button>
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon-sm"
                                  className="rounded-lg text-muted-foreground hover:text-pine"
                                >
                                  <a
                                    href={document.file_url}
                                    download
                                    aria-label={`Download ${document.name || "document"}`}
                                  >
                                    <Download />
                                  </a>
                                </Button>
                              </>
                            ) : (
                              <span className="px-1.5 text-xs text-muted-foreground">No file</span>
                            )}
                            <Button
                              asChild
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-lg text-muted-foreground hover:text-pine"
                            >
                              <Link
                                href={`/dashboard/documents/${document.id}`}
                                aria-label={`Open ${document.name || "document"}`}
                              >
                                <ArrowUpRight />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}
