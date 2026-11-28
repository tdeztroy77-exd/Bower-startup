"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addMonths, format, isToday, isTomorrow, startOfMonth } from "date-fns"
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { Panel } from "@/components/dashboard/panel"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { COMPANY_EVENT_TYPES, type CompanyEvent, type CompanyRole } from "@/lib/company/types"
import { canEditEvent } from "@/lib/company/permissions"
import { EventRow } from "./event-row"
import { EventSheet } from "./event-sheet"
import { eventTypeLabel } from "./tokens"

/**
 * The team calendar.
 *
 * An AGENDA, not a month grid. A grid is beautiful for one person's
 * appointments and useless for a team: what a manager needs on Monday
 * morning is "who am I seeing today, in what order" — which is a list.
 *
 * The month is a header and a set of days; days are rows.
 */
export function CompanyCalendar({
  companyId,
  initialEvents,
  initialMonth,
  canCreate,
  viewerUserId,
  viewerRole,
  isCompanyOwner,
}: {
  companyId: string
  initialEvents: CompanyEvent[]
  initialMonth: string
  canCreate: boolean
  viewerUserId: string
  viewerRole: CompanyRole
  isCompanyOwner: boolean
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date(initialMonth)))
  const [events, setEvents] = useState<CompanyEvent[]>(initialEvents)
  const [typeFilter, setTypeFilter] = useState("")
  const [selected, setSelected] = useState<CompanyEvent | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(
    async (target: Date, signal?: AbortSignal) => {
      const from = startOfMonth(target).toISOString()
      const to = new Date(
        startOfMonth(target).getFullYear(),
        startOfMonth(target).getMonth() + 1,
        0,
        23,
        59,
        59,
      ).toISOString()

      const params = new URLSearchParams({ from, to, limit: "200" })
      const response = await fetch(`/api/company/events?${params.toString()}`, { signal })
      if (!response.ok) throw new Error("Could not load the calendar")
      const data = await response.json()
      return (data?.events ?? []) as CompanyEvent[]
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    void load(month, controller.signal)
      .then((next) => setEvents(next))
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [load, month])

  // Live updates: somebody else's event appears without a refresh.
  useEffect(() => {
    if (!companyId) return

    // A calendar that cannot subscribe is still a calendar — it just needs
    // a refresh. A failure here must never take the workspace down.
    try {
      const supabase = createClient()
      const channel = supabase
        .channel(`company-events-${companyId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "company_events",
            filter: `company_id=eq.${companyId}`,
          },
          () => {
            const controller = new AbortController()
            void load(month, controller.signal)
              .then((next) => setEvents(next))
              .catch(() => {})
          },
        )
        .subscribe()

      return () => {
        void supabase.removeChannel(channel)
      }
    } catch {
      return
    }
  }, [companyId, load, month])

  const filtered = useMemo(
    () => (typeFilter ? events.filter((event) => event.type === typeFilter) : events),
    [events, typeFilter],
  )

  const days = useMemo(() => {
    const grouped = new Map<string, CompanyEvent[]>()

    for (const event of filtered) {
      const key = format(new Date(event.starts_at), "yyyy-MM-dd")
      const bucket = grouped.get(key)
      if (bucket) bucket.push(event)
      else grouped.set(key, [event])
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({
        key,
        date: new Date(`${key}T00:00:00`),
        items: items.sort(
          (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
        ),
      }))
  }, [filtered])

  const typesInUse = useMemo(() => {
    const seen = new Set(events.map((event) => event.type))
    return COMPANY_EVENT_TYPES.filter((type) => seen.has(type))
  }, [events])

  function openEvent(event: CompanyEvent) {
    setSelected(event)
    setDialogOpen(true)
  }

  /** May the viewer change THIS event? Own events, or anything for admins. */
  const canEditSelected = selected
    ? canEditEvent(
        { user_id: viewerUserId, role: viewerRole, is_owner: isCompanyOwner },
        selected,
        { isOwnerOfCompany: isCompanyOwner },
      )
    : false

  function openCreate() {
    setSelected(null)
    setDialogOpen(true)
  }

  return (
    <>
      <Panel
        title="Team calendar"
        description="Meetings, viewings, inspections and holidays — in the order they happen."
        bodyClassName="p-0"
        action={
          canCreate ? (
            <Button size="sm" onClick={openCreate} className="h-8 rounded-lg">
              <CalendarPlus className="mr-1.5 size-3.5" />
              Add event
            </Button>
          ) : null
        }
      >
        {/* Month header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous month"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="size-8 rounded-lg"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="min-w-[9rem] text-center text-[14px] font-semibold tracking-[-0.01em] text-foreground">
              {format(month, "MMMM yyyy")}
            </p>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next month"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="size-8 rounded-lg"
            >
              <ChevronRight className="size-4" />
            </Button>
            {format(month, "yyyy-MM") !== format(new Date(), "yyyy-MM") ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMonth(startOfMonth(new Date()))}
                className="ml-1 h-8 rounded-lg text-[12.5px]"
              >
                Today
              </Button>
            ) : null}
          </div>

          {typesInUse.length > 1 ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              <TypeTab active={!typeFilter} onClick={() => setTypeFilter("")}>
                All
              </TypeTab>
              {typesInUse.map((type) => (
                <TypeTab
                  key={type}
                  active={typeFilter === type}
                  onClick={() => setTypeFilter(typeFilter === type ? "" : type)}
                >
                  {eventTypeLabel(type)}
                </TypeTab>
              ))}
            </div>
          ) : null}
        </div>

        {days.length === 0 ? (
          <EmptyBlock
            icon={CalendarPlus}
            title={loading ? "Loading…" : "No events this month"}
            description={
              canCreate
                ? "Add the first one — a meeting, a viewing, an inspection, a holiday."
                : "Nothing is scheduled for this month."
            }
            action={
              canCreate ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 text-[13px] font-semibold text-pine hover:underline"
                >
                  Add event
                </button>
              ) : undefined
            }
          />
        ) : (
          <div>
            {days.map((day) => (
              <section key={day.key}>
                <div className="flex items-baseline gap-2 border-b border-border/60 bg-muted/25 px-4 py-2">
                  <h3 className="text-[12.5px] font-semibold text-foreground">
                    {isToday(day.date) ? "Today" : isTomorrow(day.date) ? "Tomorrow" : format(day.date, "EEE d MMM")}
                  </h3>
                  <span className="text-[11px] text-muted-foreground tabular">
                    {day.items.length} {day.items.length === 1 ? "event" : "events"}
                  </span>
                </div>
                {day.items.map((event) => (
                  <EventRow key={event.id} event={event} onOpen={openEvent} />
                ))}
              </section>
            ))}
          </div>
        )}
      </Panel>

      <EventSheet
        event={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        canCreate={canCreate}
        canEdit={canEditSelected}
        onSaved={() => {
          const controller = new AbortController()
          void load(month, controller.signal)
            .then((next) => setEvents(next))
            .catch(() => {})
        }}
      />
    </>
  )
}

function TypeTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
        active
          ? "bg-primary/10 text-pine"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
