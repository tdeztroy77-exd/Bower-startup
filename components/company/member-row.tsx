"use client"

import { cn } from "@/lib/utils"
import type { CompanyMember, PresenceStatus } from "@/lib/company/types"
import { StatusPill } from "@/components/dashboard/status-pill"
import { MemberAvatar } from "./member-avatar"
import { PresenceDot } from "./presence-dot"
import {
  PRESENCE_RAIL,
  departmentDot,
  departmentTone,
  roleLabel,
  timeAgo,
} from "./tokens"

/**
 * One person in the company directory.
 *
 * A ROW, not a card. 56px tall, a hairline underneath, one line of
 * metadata. A directory of forty people is a list you can scan — not
 * forty boxes.
 *
 * The whole row is one button: it opens the member's profile sheet.
 * There is deliberately no second button inside it — nested buttons are
 * invalid HTML and break keyboard navigation — so every action lives in
 * the sheet instead.
 */
export function MemberRow({
  member,
  presence = "offline",
  onOpen,
  index = 0,
  className,
}: {
  member: CompanyMember
  presence?: PresenceStatus
  onOpen: (member: CompanyMember) => void
  /** Position in the list — used to stagger the entrance. */
  index?: number
  className?: string
}) {
  const secondary = member.job_title?.trim() || roleLabel(member.role)
  const online = presence === "online"

  return (
    <button
      type="button"
      onClick={() => onOpen(member)}
      style={{ animationDelay: `${Math.min(index, 14) * 26}ms` }}
      className={cn(
        "group anim-row-in relative flex h-14 w-full items-center gap-3 border-b border-border/60 px-4 text-left",
        "transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
        className,
      )}
    >
      {/* The presence rail — the quietest possible way to make a list
          feel alive. 3px of colour on the leading edge. Green means
          working now; amber means here but stepped away; offline gets
          no rail at all, or every row would carry one. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-[3px] transition-opacity duration-300",
          PRESENCE_RAIL[presence],
          presence === "offline" ? "opacity-0" : "opacity-100",
        )}
      />

      <div className="relative shrink-0">
        <MemberAvatar
          member={member}
          className={cn(
            "transition-transform duration-200 ease-spring",
            "group-hover:scale-[1.06]",
            online && "ring-2 ring-live/35",
            presence === "away" && "ring-2 ring-warning/30",
          )}
        />
        <PresenceDot status={presence} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-medium text-foreground">
            {member.name}
          </span>
          {member.is_owner ? (
            <StatusPill tone="brand" className="shrink-0">
              Owner
            </StatusPill>
          ) : null}
          {online ? (
            <span className="hidden shrink-0 text-[11px] font-medium text-live sm:inline">
              Active now
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {secondary}
          {member.email ? (
            <span className="hidden sm:inline">
              <span className="mx-1.5 text-border">·</span>
              {member.email}
            </span>
          ) : null}
        </p>
      </div>

      {member.department ? (
        <span
          className={cn(
            "hidden shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize md:inline-flex",
            departmentTone(member.department),
          )}
        >
          <span className={cn("size-1.5 rounded-full", departmentDot(member.department))} />
          {member.department}
        </span>
      ) : null}

      <span className="hidden shrink-0 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground lg:block">
        {roleLabel(member.role)}
      </span>

      <span className="hidden w-16 shrink-0 text-right text-[11px] text-muted-foreground xl:block">
        {timeAgo(member.last_seen_at)}
      </span>
    </button>
  )
}
