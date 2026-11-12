import { NoteForm } from "@/components/note-form"
import { PageHeader } from "@/components/dashboard/page-header"

export default function NewNotePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Notes"
        title="New note"
        description="Keep a reminder, a conversation or a repair detail next to the property it belongs to."
      />
      <NoteForm />
    </div>
  )
}
