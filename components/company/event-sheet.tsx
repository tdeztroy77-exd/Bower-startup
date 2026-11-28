"use client"

import { useEffect, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { COMPANY_EVENT_TYPES, type CompanyEvent } from "@/lib/company/types"
import { eventTypeLabel } from "./tokens"

/**
 * The event dialog — create, edit and delete.
 *
 * A popover over the agenda rather than a route: the calendar stays
 * where it is while you add or fix an entry.
 */

/** ISO → the value a `datetime-local` input expects, in local time. */
export function toLocalInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

/** A `datetime-local` value → an ISO string the API can store. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function defaultStart(): string {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getMinutes() % 30, 0, 0)
  date.setHours(date.getHours() + 1)
  return toLocalInput(date.toISOString())
}

function defaultEnd(): string {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getMinutes() % 30, 0, 0)
  date.setHours(date.getHours() + 2)
  return toLocalInput(date.toISOString())
}

export function EventSheet({
  event,
  open,
  onOpenChange,
  canCreate = false,
  canEdit = false,
  onSaved,
}: {
  /** null opens the dialog in CREATE mode. */
  event: CompanyEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canCreate?: boolean
  canEdit?: boolean
  onSaved?: (event: CompanyEvent | null) => void
}) {
  const creating = !event

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<string>("meeting")
  const [startsAt, setStartsAt] = useState(defaultStart)
  const [endsAt, setEndsAt] = useState(defaultEnd)
  const [location, setLocation] = useState("")
  const [visibility, setVisibility] = useState<string>("company")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setConfirmingDelete(false)

    if (event) {
      setTitle(event.title)
      setDescription(event.description ?? "")
      setType(event.type)
      setStartsAt(toLocalInput(event.starts_at))
      setEndsAt(toLocalInput(event.ends_at))
      setLocation(event.location ?? "")
      setVisibility(event.visibility)
    } else {
      setTitle("")
      setDescription("")
      setType("meeting")
      setStartsAt(defaultStart())
      setEndsAt(defaultEnd())
      setLocation("")
      setVisibility("company")
    }
  }, [open, event])

  async function save() {
    setSaving(true)
    setError(null)

    const startsIso = fromLocalInput(startsAt)
    const endsIso = fromLocalInput(endsAt)

    if (!startsIso || !endsIso) {
      setError("Give the event a start and an end time")
      setSaving(false)
      return
    }
    if (new Date(endsIso).getTime() <= new Date(startsIso).getTime()) {
      setError("The end time must be after the start time")
      setSaving(false)
      return
    }

    const body = {
      title: title.trim(),
      description: description.trim() || null,
      type,
      starts_at: startsIso,
      ends_at: endsIso,
      location: location.trim() || null,
      visibility,
    }

    try {
      const response = await fetch(
        creating ? "/api/company/events" : `/api/company/events/${event!.id}`,
        {
          method: creating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      )

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data?.error ?? "Could not save this event")
        return
      }

      onSaved?.((data?.event as CompanyEvent) ?? null)
      onOpenChange(false)
    } catch {
      setError("Could not reach the server")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!event) return
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/company/events/${event.id}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data?.error ?? "Could not delete this event")
        setConfirmingDelete(false)
        return
      }
      onSaved?.(null)
      onOpenChange(false)
    } catch {
      setError("Could not reach the server")
    } finally {
      setSaving(false)
    }
  }

  const readOnly = !creating && !canEdit

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{creating ? "Add to the calendar" : event?.title}</DialogTitle>
          <DialogDescription>
            {creating
              ? "Meetings, viewings, inspections and holidays — anything the team should see."
              : readOnly
                ? "You do not have permission to change this event."
                : "Changes are visible to the whole team straight away."}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[12.5px] text-destructive">
            {error}
          </div>
        ) : null}

        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="event-title" className="text-[12.5px]">
              Title
            </Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={readOnly}
              maxLength={160}
              placeholder="Landlord meeting — Kileleshi"
              className="h-9 rounded-lg"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-start" className="text-[12.5px]">
                Starts
              </Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                disabled={readOnly}
                className="h-9 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-end" className="text-[12.5px]">
                Ends
              </Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                disabled={readOnly}
                className="h-9 rounded-lg"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-type" className="text-[12.5px]">
                Type
              </Label>
              <select
                id="event-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={readOnly}
                className="h-9 w-full rounded-lg border border-input bg-input px-2.5 text-[13px] text-foreground disabled:opacity-60"
              >
                {COMPANY_EVENT_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {eventTypeLabel(option)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-visibility" className="text-[12.5px]">
                Visibility
              </Label>
              <select
                id="event-visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                disabled={readOnly}
                className="h-9 w-full rounded-lg border border-input bg-input px-2.5 text-[13px] text-foreground disabled:opacity-60"
              >
                <option value="company">Everyone</option>
                <option value="private">Only me</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-location" className="text-[12.5px]">
              Location <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="event-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={readOnly}
              maxLength={160}
              placeholder="Office, or a property address"
              className="h-9 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-description" className="text-[12.5px]">
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly}
              rows={3}
              maxLength={2000}
              placeholder="What is this about?"
              className="rounded-lg"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {creating ? (
            <span />
          ) : confirmingDelete ? (
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={remove}
                disabled={saving}
                className="h-9 rounded-lg"
              >
                Delete event
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={saving}
                className="h-9 rounded-lg"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(true)}
              disabled={readOnly || saving}
              className="h-9 rounded-lg text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Delete
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-lg"
            >
              Close
            </Button>
            {creating ? (canCreate ? (
              <Button size="sm" onClick={save} disabled={saving} className="h-9 rounded-lg">
                {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
                Add event
              </Button>
            ) : null) : canEdit ? (
              <Button size="sm" onClick={save} disabled={saving} className="h-9 rounded-lg">
                {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
                Save changes
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
