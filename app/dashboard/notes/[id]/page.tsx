"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, Loader2, MapPin, Pin } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DeleteButton } from "@/components/delete-button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatusPill } from "@/components/dashboard/status-pill"
import { formatDate, tenantName } from "@/lib/utils"

const categoryTone: Record<string, "danger" | "warning" | "success" | "info" | "brand" | "neutral"> = {
  important: "danger",
  reminder: "warning",
  maintenance: "info",
  financial: "success",
  tenant: "brand",
  legal: "info",
  general: "neutral",
}

export default function NoteDetailPage() {
  const params = useParams<{ id: string }>()
  const [note, setNote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!params?.id) return
    const fetchNote = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("notes")
          .select(`
            *,
            properties (id, name, address),
            tenants (full_name, first_name, last_name)
          `)
          .eq("id", params.id)
          .maybeSingle()
        if (error) throw error
        if (!data) setNotFound(true)
        else setNote(data)
      } catch (err) {
        console.error("[bower] fetch note error", err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchNote()
  }, [params?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound || !note) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/80 bg-card py-14 text-center">
        <p className="text-sm text-muted-foreground">This note no longer exists.</p>
        <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
          <Link href="/dashboard/notes">Back to notes</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 h-8 rounded-lg text-muted-foreground">
          <Link href="/dashboard/notes">
            <ArrowLeft className="size-4" /> Notes
          </Link>
        </Button>
        <PageHeader
          eyebrow={`Note · created ${formatDate(note.created_at)}`}
          title={note.title || "Untitled note"}
          description={
            note.updated_at && note.updated_at !== note.created_at
              ? `Updated ${formatDate(note.updated_at)}`
              : undefined
          }
          actions={
            <>
              {note.is_pinned ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
                  <Pin className="size-3" /> Pinned
                </span>
              ) : null}
              <StatusPill tone={categoryTone[note.category || "general"] ?? "neutral"}>
                {note.category || "general"}
              </StatusPill>
              <Button asChild size="sm" className="rounded-lg">
                <Link href={`/dashboard/notes/${note.id}/edit`}>
                  <Edit /> Edit
                </Link>
              </Button>
              <DeleteButton endpoint={`/api/notes/${note.id}`} resource="note" redirectTo="/dashboard/notes" />
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Content">
          <p className="whitespace-pre-wrap text-[14px] leading-7 text-foreground">{note.content}</p>
        </Panel>

        <Panel title="Context" description="What this note is attached to">
          <dl className="space-y-4 text-[13px]">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Property</dt>
              <dd className="mt-1">
                {note.properties ? (
                  <Link
                    href={`/dashboard/properties/${note.properties.id}`}
                    className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary"
                  >
                    <MapPin className="size-3.5 text-muted-foreground" />
                    {note.properties.name}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Not linked</span>
                )}
              </dd>
              {note.properties?.address ? (
                <p className="mt-1 text-[11.5px] text-muted-foreground">{note.properties.address}</p>
              ) : null}
            </div>

            <div>
              <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Tenant</dt>
              <dd className="mt-1 font-medium text-foreground">
                {note.tenants ? tenantName(note.tenants) : <span className="text-muted-foreground">Not linked</span>}
              </dd>
            </div>

            <div>
              <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Priority</dt>
              <dd className="mt-1">
                <StatusPill
                  tone={note.priority === "high" ? "danger" : note.priority === "low" ? "neutral" : "brand"}
                >
                  {note.priority || "normal"}
                </StatusPill>
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </div>
  )
}
