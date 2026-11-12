import { NoteForm } from "@/components/note-form"
import { PageHeader } from "@/components/dashboard/page-header"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function EditNotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: note } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Notes" title="Edit note" description="Update the note details." />
      {note ? (
        <NoteForm note={note} isEditing={true} />
      ) : (
        <p className="rounded-xl border border-border/80 bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Note not found.
        </p>
      )}
    </div>
  )
}
