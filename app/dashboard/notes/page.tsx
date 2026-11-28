import Link from "next/link"
import { CalendarClock, Loader2, MapPin, Pin, Plus, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { createClient } from "@/lib/supabase/server"
import { formatDate, tenantName } from "@/lib/utils"

export const dynamic = "force-dynamic"

const categoryTone: Record<string, "danger" | "warning" | "success" | "info" | "brand" | "neutral"> = {
  important: "danger",
  reminder: "warning",
  maintenance: "info",
  financial: "success",
  tenant: "brand",
  general: "neutral",
}

function NoteCard({ note }: { note: any }) {
  return (
    <article className="flex flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-card transition-colors hover:border-pine/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex min-w-0 items-center gap-1.5 text-[14px] font-semibold leading-5 tracking-[-0.01em]">
            {note.is_pinned ? (
              <Pin className="size-3.5 shrink-0 text-pine" strokeWidth={2.2} />
            ) : null}
            <Link
              href={`/dashboard/notes/${note.id}`}
              className="truncate text-foreground transition-colors hover:text-pine"
            >
              {note.title || "Untitled note"}
            </Link>
          </h3>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {note.properties ? (
              <p className="flex items-center gap-1 truncate">
                <MapPin className="size-3 shrink-0" strokeWidth={2} />
                <span className="truncate">{note.properties.name}</span>
              </p>
            ) : null}
            {note.tenants ? <p className="truncate">{tenantName(note.tenants)}</p> : null}
            <p className="tabular">{formatDate(note.created_at)}</p>
          </div>
        </div>
        <StatusPill tone={categoryTone[note.category || "general"] ?? "neutral"}>
          {note.category || "general"}
        </StatusPill>
      </div>

      <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-[13px] leading-6 text-muted-foreground">
        {note.content}
      </p>

      <div className="mt-3 flex items-center gap-1.5 border-t border-border/70 pt-3">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 flex-1 rounded-lg bg-card text-[12.5px]"
        >
          <Link href={`/dashboard/notes/${note.id}`}>View note</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 flex-1 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground"
        >
          <Link href={`/dashboard/notes/${note.id}/edit`}>Edit</Link>
        </Button>
      </div>
    </article>
  )
}

export default async function NotesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-border/70 bg-card py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading notes
      </div>
    )
  }

  const { data: notes, error } = await supabase
    .from("notes")
    .select(`
      *,
      properties (name, address),
      tenants (full_name, first_name, last_name)
    `)
    .eq("user_id", user.id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[bower] notes fetch error", error)
  }

  const pinnedNotes = notes?.filter((note: any) => note.is_pinned) || []
  const regularNotes = notes?.filter((note: any) => !note.is_pinned) || []
  const recentNotes =
    notes?.filter((note: any) => {
      const noteDate = new Date(note.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return noteDate > weekAgo
    }) || []

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace"
        title="Notes"
        description="Private notes, reminders and context kept next to the property and tenant they belong to."
        actions={
          <Button asChild size="sm" className="rounded-lg">
            <Link href="/dashboard/notes/new">
              <Plus /> New note
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="All notes"
          value={notes?.length || 0}
          icon={StickyNote}
          accent="emerald"
          hint="Including pinned notes"
        />
        <StatCard
          label="Pinned"
          value={pinnedNotes.length}
          icon={Pin}
          accent="indigo"
          hint={pinnedNotes.length === 0 ? "Nothing pinned yet" : "Kept at the top of the page"}
        />
        <StatCard
          label="Last 7 days"
          value={recentNotes.length}
          icon={CalendarClock}
          accent="amber"
          hint="Notes created this week"
        />
      </div>

      {pinnedNotes.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Pin className="size-3.5 text-pine" strokeWidth={2.2} />
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Pinned
            </h2>
            <span className="text-xs text-muted-foreground tabular">{pinnedNotes.length}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pinnedNotes.map((note: any) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </section>
      ) : null}

      {notes && notes.length > 0 && regularNotes.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            All notes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {regularNotes.map((note: any) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </section>
      ) : null}

      {!notes || notes.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyBlock
            icon={StickyNote}
            title="No notes yet"
            description="Keep a reminder, a tenant conversation or a repair detail — notes stay private to you and can be pinned."
            actionHref="/dashboard/notes/new"
            actionLabel="Create your first note"
          />
        </Panel>
      ) : null}
    </div>
  )
}
