"use client"

import { cn } from "@/lib/utils"
import type { CompanyEvent } from "@/lib/company/types"
import { EVENT_TYPE_RAIL, durationLabel, eventTypeLabel, eventTypeTone } from "./tokens"

/**
 * One entry on the team calendar.
 *
 * A row, not a card: 56px, a hairline underneath, and the time on the
 * left so a column of times reads as a schedule. Clicking opens the
 * event — it never navigates away from the agenda.
 */
export function EventRow({
  event,
  onOpen,
  className,
}: {
  event: CompanyEvent
  onOpen: (event: CompanyEvent) => void
  className?: string
}) {
  const start = new Date(event.starts_at)
  const duration = durationLabel(event.starts_at, event.ends_at)

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className={cn(
        "group relative flex h-14 w-full items-center gap-3 border-b border-border/60 px-4 text-left",
        "transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
        className,
      )}
    >
      {/* The event type, as a rail. Colour you can read at a glance
          from across the room, without reading a word. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          EVENT_TYPE_RAIL[event.type] ?? EVENT_TYPE_RAIL.meeting,
        )}
      />

      {/* Time */}
      <div className="w-[54px] shrink-0 pl-1">
        <p className="text-[13.5px] font-semibold leading-tight text-foreground tabular">
          {start.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", hour12: false })}
        </p>
        {duration ? (
          <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground tabular">{duration}</p>
        ) : null}
      </div>

      {/* What */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-foreground transition-colors group-hover:text-pine">
          {event.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {event.property_name?.trim() || event.location?.trim() || event.created_by_name || "—"}
        </p>
      </div>

      {/* Type */}
      <span
        className={cn(
          "hidden shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline-flex",
          eventTypeTone(event.type),
        )}
      >
        {eventTypeLabel(event.type)}
      </span>

      {event.visibility === "private" ? (
        <span className="shrink-0 text-[11px] text-muted-foreground">Private</span>
      ) : null}
    </button>
  )
}
