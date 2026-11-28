"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  File,
  ImageIcon,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { DeleteButton } from "@/components/delete-button"
import { createClient } from "@/lib/supabase/client"
import { formatDate, formatFileSize, tenantName } from "@/lib/utils"

function fileIcon(mimeType?: string | null, className = "size-4") {
  if (mimeType?.startsWith("image/")) return <ImageIcon className={className} strokeWidth={1.9} />
  if (mimeType?.includes("pdf")) return <FileText className={className} strokeWidth={1.9} />
  return <File className={className} strokeWidth={1.9} />
}

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>()
  const [document, setDocument] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!params?.id) return
    const fetchDocument = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("documents")
          .select(`
            *,
            properties(id, name, address),
            tenants(full_name, first_name, last_name)
          `)
          .eq("id", params.id)
          .maybeSingle()
        if (error) throw error
        if (!data) setNotFound(true)
        else setDocument(data)
      } catch (error) {
        console.error("[bower] fetch document error", error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchDocument()
  }, [params?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-border/70 bg-card py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading document
      </div>
    )
  }

  if (notFound || !document) {
    return (
      <Panel bodyClassName="p-0">
        <EmptyBlock
          icon={FileText}
          title="Document not found"
          description="It may have been deleted, or the link is out of date."
          actionHref="/dashboard/documents"
          actionLabel="Back to documents"
        />
      </Panel>
    )
  }

  const isImage = document.mime_type?.startsWith("image/")

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Vault"
        title={document.name || "Untitled document"}
        description={`Uploaded ${formatDate(document.created_at)}`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm" className="rounded-lg text-muted-foreground hover:text-foreground">
              <Link href="/dashboard/documents">
                <ArrowLeft /> Documents
              </Link>
            </Button>
            {document.file_url ? (
              <>
                <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
                  <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                    <Eye /> View
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
                  <a href={document.file_url} download>
                    <Download /> Download
                  </a>
                </Button>
              </>
            ) : null}
            <DeleteButton
              endpoint={`/api/documents/${document.id}`}
              resource="document"
              redirectTo="/dashboard/documents"
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Preview"
          bodyClassName="p-4"
          action={
            <span className="text-xs text-muted-foreground">
              {document.mime_type || "Unknown type"}
            </span>
          }
        >
          <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30 p-6 text-center">
            {isImage && document.file_url ? (
              <img
                src={document.file_url}
                alt={document.name || "Document preview"}
                className="mx-auto h-auto max-w-full rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-card text-muted-foreground shadow-card">
                  {fileIcon(document.mime_type, "size-5")}
                </span>
                <div>
                  <p className="text-[13px] font-medium text-foreground">
                    {document.name || "Untitled document"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {document.mime_type || "Unknown type"} · {formatFileSize(document.file_size)}
                  </p>
                </div>
                {document.file_url ? (
                  <Button asChild size="sm" className="rounded-lg">
                    <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                      <Eye /> Open document
                    </a>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">No file attached to this record.</p>
                )}
              </div>
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Document details">
            <dl className="divide-y divide-border/70">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[13px] text-muted-foreground">Type</dt>
                <dd>
                  <StatusPill tone="neutral">{document.type || "other"}</StatusPill>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[13px] text-muted-foreground">File size</dt>
                <dd className="text-[13px] font-medium text-foreground tabular">
                  {formatFileSize(document.file_size)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[13px] text-muted-foreground">Uploaded</dt>
                <dd className="text-[13px] font-medium text-foreground tabular">
                  {formatDate(document.created_at)}
                </dd>
              </div>
              {document.expiry_date ? (
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-[13px] text-muted-foreground">Expires</dt>
                  <dd className="text-[13px] font-medium text-foreground tabular">
                    {formatDate(document.expiry_date)}
                  </dd>
                </div>
              ) : null}
            </dl>

            {document.notes ? (
              <div className="mt-3 border-t border-border/70 pt-3">
                <p className="text-xs font-medium text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-foreground">
                  {document.notes}
                </p>
              </div>
            ) : null}
          </Panel>

          {document.properties || document.tenants ? (
            <Panel title="Associated with">
              <div className="space-y-3">
                {document.properties ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Property</p>
                    <Link
                      href={`/dashboard/properties/${document.properties.id}`}
                      className="text-[13px] font-medium text-pine hover:underline"
                    >
                      {document.properties.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{document.properties.address}</p>
                  </div>
                ) : null}
                {document.tenants ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Tenant</p>
                    <p className="text-[13px] font-medium text-foreground">
                      {tenantName(document.tenants)}
                    </p>
                  </div>
                ) : null}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  )
}
