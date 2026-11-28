"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { CompanyMember } from "@/lib/company/types"
import { MemberAvatar } from "./member-avatar"
import { usePresence } from "./presence-provider"
import { ProfileSheet } from "@/components/profile/profile-sheet"

/**
 * The company band.
 *
 * A workspace needs ONE surface with weight, or it reads as a settings
 * page. Slack puts its aubergine behind the sidebar; Linear puts
 * near-black behind the canvas. Here the company section gets a deep
 * ink surface with a brand-coloured sweep across it — and everything
 * else on the page stays light, so the contrast does the work.
 *
 * The avatar stack is the human signal: you can see who is here before
 * you read a single number.
 */
export function CompanyBand({
  companyName,
  description,
  members,
  departmentCount,
  viewerMember,
  className,
  children,
}: {
  companyName: string
  description?: string
  members: CompanyMember[]
  departmentCount: number
  /** The person reading the page — their avatar opens their profile. */
  viewerMember?: CompanyMember | null
  className?: string
  /** Actions slot — the bell, the invite button. */
  children?: React.ReactNode
}) {
  const presence = usePresence()
  const [profileOpen, setProfileOpen] = React.useState(false)

  const online = members.filter(
    (member) => member.user_id && presence[member.user_id] === "online",
  )
  const onlineCount = online.length
  const stack = online.slice(0, 5)
  const overflow = Math.max(0, online.length - stack.length)

  return (
    <section
      className={cn(
        "brand-sweep relative overflow-hidden rounded-2xl border border-brand-ink/40 shadow-lift",
        className,
      )}
    >
      {/* Fine grain so the surface is not flat vector. */}
      <div className="brand-grain pointer-events-none absolute inset-0 opacity-[0.035]" aria-hidden="true" />

      {/* A soft bloom in the top-left, the way light falls on a panel. */}
      <div
        className="pointer-events-none absolute -left-24 -top-32 size-80 rounded-full bg-live/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-ink-muted">
            Workspace
          </p>
          <h1 className="mt-2 text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-brand-ink-foreground sm:text-[34px]">
            {companyName}
          </h1>
          {description ? (
            <p className="mt-2 max-w-xl text-[13.5px] leading-6 text-brand-ink-muted">
              {description}
            </p>
          ) : null}

          {/* Who is here, right now. */}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center -space-x-2">
              {stack.map((member) => (
                <div
                  key={member.id}
                  className="relative rounded-full ring-2 ring-brand-ink transition-transform duration-200 ease-spring hover:-translate-y-0.5 hover:z-10"
                  title={member.name}
                >
                  <MemberAvatar member={member} />
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-brand-ink bg-live" />
                </div>
              ))}

              {overflow > 0 ? (
                <span className="grid size-9 place-items-center rounded-full bg-brand-ink-foreground/12 text-[11px] font-semibold text-brand-ink-foreground ring-2 ring-brand-ink">
                  +{overflow}
                </span>
              ) : null}
            </div>

            <div className="min-w-0 text-[12.5px] leading-tight text-brand-ink-muted">
              <p className="font-medium text-brand-ink-foreground">
                {onlineCount > 0
                  ? `${onlineCount} online now`
                  : "Nobody is online right now"}
              </p>
              <p className="mt-0.5 truncate">
                {members.length} {members.length === 1 ? "person" : "people"}
                {departmentCount > 0 ? ` · ${departmentCount} departments` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {viewerMember ? (
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Your profile"
              title="Your profile"
              className="rounded-full ring-2 ring-brand-ink-foreground/20 transition-transform duration-200 ease-spring hover:scale-105 hover:ring-brand-ink-foreground/40"
            >
              <MemberAvatar member={viewerMember} />
            </button>
          ) : null}
          {children}
        </div>
      </div>

      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
    </section>
  )
}
