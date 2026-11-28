import { cn } from "@/lib/utils"
import { CalendarDays, Users } from "lucide-react"

/**
 * The company workspace, as the marketing site shows it.
 *
 * This is a drawing of the real screen — the ink band, the presence
 * dots, the department chips — not a stock image. A product preview
 * that lies about the product is worse than no preview at all.
 */

type PreviewMember = {
  name: string
  title: string
  department: string
  initials: string
  tint: string
  presence: "online" | "away" | "offline"
}

const MEMBERS: PreviewMember[] = [
  {
    name: "Brian Kiarie",
    title: "Founder",
    department: "admin",
    initials: "BK",
    tint: "bg-orange-500 text-orange-950 dark:bg-orange-500/30 dark:text-orange-200",
    presence: "online",
  },
  {
    name: "Ada Kamau",
    title: "Property manager",
    department: "lettings",
    initials: "AK",
    tint: "bg-emerald-500 text-emerald-950 dark:bg-emerald-500/30 dark:text-emerald-200",
    presence: "online",
  },
  {
    name: "Joseph Mutiso",
    title: "Field agent",
    department: "maintenance",
    initials: "JM",
    tint: "bg-rose-500 text-rose-950 dark:bg-rose-500/30 dark:text-rose-200",
    presence: "away",
  },
  {
    name: "Wanjiru Njeri",
    title: "Accounts clerk",
    department: "finance",
    initials: "WN",
    tint: "bg-sky-500 text-sky-950 dark:bg-sky-500/30 dark:text-sky-200",
    presence: "offline",
  },
]

const DEPT_TONE: Record<string, string> = {
  admin: "bg-violet-500/12 text-violet-800 dark:text-violet-300",
  lettings: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
  maintenance: "bg-amber-500/14 text-amber-800 dark:text-amber-300",
  finance: "bg-sky-500/12 text-sky-800 dark:text-sky-300",
}

const DEPT_DOT: Record<string, string> = {
  admin: "bg-violet-500",
  lettings: "bg-emerald-500",
  maintenance: "bg-amber-500",
  finance: "bg-sky-500",
}

const PRESENCE: Record<string, string> = {
  online: "bg-live",
  away: "bg-warning",
  offline: "bg-muted-foreground/40",
}

export function CompanyPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lift",
        className,
      )}
    >
      {/* The company band — the same ink surface the product uses. */}
      <div className="brand-sweep relative overflow-hidden px-5 py-5">
        <div className="brand-grain pointer-events-none absolute inset-0 opacity-[0.05]" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-brand-ink-muted">
              Workspace
            </p>
            <p className="mt-1.5 truncate text-[19px] font-semibold tracking-[-0.025em] text-brand-ink-foreground">
              Acme Property Co
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {MEMBERS.filter((m) => m.presence === "online").map((member) => (
                  <span
                    key={member.initials}
                    className={cn(
                      "grid size-6 place-items-center rounded-full text-[8.5px] font-bold ring-2 ring-brand-ink",
                      member.tint,
                    )}
                  >
                    {member.initials}
                  </span>
                ))}
              </div>
              <span className="text-[10.5px] font-medium text-brand-ink-foreground">
                2 online now
              </span>
            </div>
          </div>

          <span className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-ink-foreground/10 px-2 py-1 text-[10px] font-medium text-brand-ink-foreground">
            <CalendarDays className="size-3" />
            Calendar
          </span>
        </div>
      </div>

      {/* The directory */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between px-1 pb-2 pt-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Team
          </p>
          <span className="text-[10px] text-muted-foreground">4 people</span>
        </div>

        <ul>
          {MEMBERS.map((member) => (
            <li
              key={member.initials}
              className="flex h-11 items-center gap-3 border-t border-border/60 px-1"
            >
              <div className="relative shrink-0">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-[9.5px] font-bold",
                    member.tint,
                  )}
                >
                  {member.initials}
                </span>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card",
                    PRESENCE[member.presence],
                  )}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-medium text-foreground">
                  {member.name}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">{member.title}</p>
              </div>

              <span
                className={cn(
                  "hidden shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold capitalize sm:inline-flex",
                  DEPT_TONE[member.department],
                )}
              >
                <span
                  className={cn("size-1 rounded-full", DEPT_DOT[member.department])}
                />
                {member.department}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* The calendar strip */}
      <div className="border-t border-border/70 bg-muted/25 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Today
        </p>
        <div className="mt-2 space-y-1.5">
          {[
            { time: "10:00", title: "Landlord meeting", tone: "bg-sky-500" },
            { time: "13:30", title: "Tenant viewing", tone: "bg-emerald-500" },
            { time: "15:00", title: "Annual inspection", tone: "bg-amber-500" },
          ].map((event) => (
            <div key={event.time} className="flex items-center gap-2.5">
              <span className="w-9 shrink-0 text-[9.5px] text-muted-foreground tabular">
                {event.time}
              </span>
              <span className={cn("h-3.5 w-[3px] shrink-0 rounded-full", event.tone)} />
              <span className="truncate text-[11px] font-medium text-foreground">
                {event.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border/70 px-4 py-2.5 text-[10px] text-muted-foreground">
        <Users className="size-3" />
        Everyone sees the same thing, at the same time.
      </div>
    </div>
  )
}
