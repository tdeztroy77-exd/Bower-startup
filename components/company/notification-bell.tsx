"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  Check,
  Loader2,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { CompanyNotification } from "@/lib/company/types"

/**
 * The company notification bell.
 *
 * Company notifications live in the same `notifications` table as
 * everything else in Bower, tagged with a `company_id`. This bell shows
 * the company-scoped ones; the workspace bell in the header shows the
 * lot, so nothing is hidden by being in the wrong place.
 *
 * Updates arrive over Supabase Realtime — no polling.
 *
 * The feed is grouped by day, because a wall of unlabelled timestamps
 * is a wall nobody reads. Each row carries the icon of the thing that
 * happened and a coloured rail for how urgent it is.
 */

const SEVERITY_RAIL: Record<string, string> = {
  info: "bg-sky-500",
  success: "bg-live",
  warning: "bg-amber-500",
  critical: "bg-destructive",
}

const SEVERITY_TONE: Record<string, string> = {
  info: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  success: "bg-live/12 text-live",
  warning: "bg-amber-500/14 text-amber-700 dark:text-amber-300",
  critical: "bg-destructive/12 text-destructive",
}

const TYPE_ICON: Record<string, typeof Bell> = {
  invite_accepted: UserCheck,
  invite_revoked: UserX,
  event_created: CalendarPlus,
  event_updated: CalendarClock,
  event_deleted: CalendarX2,
  role_changed: ShieldCheck,
  member_removed: UserMinus,
  member_added: UserPlus,
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

/** "Today", "Yesterday", or a date. */
function dayLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(date, today)) return "Today"
  if (sameDay(date, yesterday)) return "Yesterday"
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short" })
}

export function NotificationBell({
  companyId,
  userId,
}: {
  companyId: string
  userId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<CompanyNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set())
  const knownIds = useRef<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/company/notifications?limit=50")
      if (!response.ok) return
      const data = await response.json()
      const next = (Array.isArray(data?.notifications) ? data.notifications : []) as CompanyNotification[]

      // Anything we have not seen before gets the arrival animation.
      const arriving = next.filter((item) => !knownIds.current.has(item.id)).map((item) => item.id)
      if (arriving.length > 0 && knownIds.current.size > 0) {
        setFreshIds(new Set(arriving))
        window.setTimeout(() => setFreshIds(new Set()), 1200)
      }
      knownIds.current = new Set(next.map((item) => item.id))

      setItems(next)
      setUnread(Number(data?.unread ?? 0))
    } catch {
      // Leave whatever is on screen.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Live updates.
  useEffect(() => {
    if (!companyId || !userId) return

    // Live updates are a nicety. If the channel cannot be opened, the bell
    // still works — it just needs a refresh. It must never take the page
    // down with it.
    try {
      const supabase = createClient()
      const channel = supabase
        .channel(`company-notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => void load(),
        )
        .subscribe()

      return () => {
        void supabase.removeChannel(channel)
      }
    } catch {
      return
    }
  }, [companyId, userId, load])

  async function markRead(notification: CompanyNotification) {
    if (notification.is_read) {
      if (notification.link) router.push(notification.link)
      return
    }

    setItems((prev) =>
      prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
    )
    setUnread((count) => Math.max(0, count - 1))

    try {
      await fetch(`/api/company/notifications/${notification.id}/read`, { method: "PATCH" })
    } catch {
      // Optimistic: the next load will reconcile it.
    }

    if (notification.link) {
      setOpen(false)
      router.push(notification.link)
    }
  }

  async function markAllRead() {
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })))
    setUnread(0)

    try {
      await fetch("/api/company/notifications/read-all", { method: "PATCH" })
    } catch {
      void load()
    }
  }

  const groups = useMemo(() => {
    const map = new Map<string, CompanyNotification[]>()
    for (const item of items) {
      const key = dayLabel(item.created_at)
      const bucket = map.get(key)
      if (bucket) bucket.push(item)
      else map.set(key, [item])
    }
    return [...map.entries()]
  }, [items])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Company notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative rounded-full text-brand-ink-foreground/80 transition-colors hover:bg-brand-ink-foreground/10 hover:text-brand-ink-foreground"
        onClick={() => setOpen(true)}
      >
        <Bell className="size-[18px]" />
        {unread > 0 ? (
          <span className="anim-pop absolute top-0.5 right-0.5 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-live px-1 text-[10px] font-semibold text-live-foreground ring-2 ring-brand-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader className="text-left">
            <SheetTitle className="text-[15px] font-semibold tracking-[-0.01em]">
              Company notifications
            </SheetTitle>
            <SheetDescription className="text-xs">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </SheetDescription>
          </SheetHeader>

          {/* The list is exactly as wide as the sheet. An earlier version
              pulled it 24px wider on each side with a negative margin, which
              pushed the severity rail off the left edge of the sheet and
              clipped the timestamps off the right — on a phone, the unread
              dot was cut in half. Only the sticky day header bleeds now,
              and the container clips it. */}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <span className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-muted/70 text-muted-foreground">
                  <Bell className="size-5" strokeWidth={1.8} />
                </span>
                <p className="text-sm font-semibold text-foreground">Nothing yet.</p>
                <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  Invitations, role changes and calendar updates land here.
                </p>
              </div>
            ) : (
              groups.map(([day, groupItems]) => (
                <section key={day}>
                  <div className="sticky top-0 z-10 -mx-6 border-y border-border/60 bg-background/90 px-6 py-1.5 backdrop-blur-md">
                    <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {day}
                    </h3>
                  </div>
                  <ul className="divide-y divide-border/60">
                    {groupItems.map((item) => {
                      const Icon = TYPE_ICON[item.type] ?? Bell
                      const fresh = freshIds.has(item.id)

                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => markRead(item)}
                            className={cn(
                              "group relative flex w-full items-start gap-3 px-6 py-3 text-left transition-colors hover:bg-muted/40",
                              !item.is_read && "bg-muted/20",
                              fresh && "anim-notify-in",
                            )}
                          >
                            {/* Severity rail */}
                            <span
                              aria-hidden="true"
                              className={cn(
                                "absolute inset-y-0 left-0 w-[3px] transition-opacity",
                                item.is_read ? "opacity-0" : "opacity-100",
                                SEVERITY_RAIL[item.severity] ?? SEVERITY_RAIL.info,
                              )}
                            />

                            <span
                              className={cn(
                                "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
                                SEVERITY_TONE[item.severity] ?? SEVERITY_TONE.info,
                              )}
                            >
                              <Icon className="size-3.5" strokeWidth={2} />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-[13px] font-medium text-foreground">
                                  {item.title}
                                </span>
                                <span className="shrink-0 text-[10px] text-muted-foreground">
                                  {timeAgo(item.created_at)}
                                </span>
                              </span>
                              <span className="mt-0.5 block text-[11.5px] leading-5 text-muted-foreground">
                                {item.message}
                              </span>
                            </span>

                            {!item.is_read ? (
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>

          {unread > 0 ? (
            <div className="border-t border-border/70 px-6 py-3">
              <Button variant="ghost" size="sm" onClick={markAllRead} className="h-8 w-full rounded-lg">
                <Check className="mr-1.5 size-3.5" />
                Mark all read
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
