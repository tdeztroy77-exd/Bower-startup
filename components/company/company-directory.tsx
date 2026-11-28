"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Users } from "lucide-react"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { Panel } from "@/components/dashboard/panel"
import { can } from "@/lib/company/permissions"
import type { CompanyMember } from "@/lib/company/types"
import { DirectoryToolbar } from "./directory-toolbar"
import { InviteDialog } from "./invite-dialog"
import { MemberRow } from "./member-row"
import { MemberSheet } from "./member-sheet"
import { departmentsOf } from "@/lib/company/directory"
import { usePresence } from "./presence-provider"
import { ProfileSheet } from "@/components/profile/profile-sheet"

/**
 * The company directory.
 *
 * A dense list of people — rows, not cards. The server renders the
 * first page so the list is on screen immediately; filtering then talks
 * to `GET /api/company/members` so a large directory never ships every
 * member to the browser just to hide most of them.
 *
 * Above 100 members the list is windowed: only the rows on screen are
 * mounted, so a 2,000-person directory still scrolls at 60fps.
 */

const ROW_HEIGHT = 56
const WINDOW_THRESHOLD = 100
const OVERSCAN = 6

export function CompanyDirectory({
  initialMembers,
  companyName,
  viewerRole,
  viewerUserId,
  canInvite,
  canManage,
  totalMembers,
}: {
  initialMembers: CompanyMember[]
  companyName: string
  viewerRole: CompanyMember["role"]
  viewerUserId: string | null
  canInvite: boolean
  canManage: boolean
  totalMembers: number
}) {
  const presence = usePresence()

  const [members, setMembers] = useState<CompanyMember[]>(initialMembers)
  const [search, setSearch] = useState("")
  const [department, setDepartment] = useState("")
  const [role, setRole] = useState("")
  const [status, setStatus] = useState("active")
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<CompanyMember | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(640)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const firstRender = useRef(true)

  /* --- data ------------------------------------------------------------- */

  const load = useCallback(async (signal: AbortSignal) => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (department) params.set("department", department)
    if (role) params.set("role", role)
    if (status) params.set("status", status)
    params.set("limit", "200")

    const response = await fetch(`/api/company/members?${params.toString()}`, { signal })
    if (!response.ok) throw new Error("Could not load the directory")
    const data = await response.json()
    return (data?.members ?? []) as CompanyMember[]
  }, [search, department, role, status])

  useEffect(() => {
    // The server already rendered the unfiltered first page.
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const next = await load(controller.signal)
        setMembers(next)
      } catch {
        // Keep the current list rather than blanking it on a transient failure.
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [load])

  /* --- departments ------------------------------------------------------ */

  // The filter tabs follow the whole team, not the filtered slice — a
  // tab that disappears when you filter by it would be maddening.
  const departments = useMemo(() => {
    if (initialMembers.length > 0) return departmentsOf(initialMembers)
    return departmentsOf(members)
  }, [initialMembers, members])

  /* --- windowing -------------------------------------------------------- */

  const windowed = members.length > WINDOW_THRESHOLD

  const { start, end } = useMemo(() => {
    if (!windowed) return { start: 0, end: members.length }
    const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
    const last = Math.min(
      members.length,
      Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
    )
    return { start: first, end: last }
  }, [windowed, members.length, scrollTop, viewportHeight])

  const visible = windowed ? members.slice(start, end) : members

  /* --- actions ---------------------------------------------------------- */

  function openMember(member: CompanyMember) {
    setSelected(member)
    setSheetOpen(true)
  }

  function onScroll(event: React.UIEvent<HTMLDivElement>) {
    setScrollTop(event.currentTarget.scrollTop)
  }

  return (
    <>
      <Panel
        title="Team"
        description="Everyone with access to this company workspace."
        bodyClassName="p-0"
        action={
          canInvite && !can(viewerRole, "invite_members") ? null : null
        }
      >
        <div className="px-4 pt-3">
          <DirectoryToolbar
            search={search}
            onSearchChange={setSearch}
            department={department}
            onDepartmentChange={setDepartment}
            departments={departments}
            role={role}
            onRoleChange={setRole}
            status={status}
            onStatusChange={setStatus}
            onInvite={() => setInviteOpen(true)}
            canInvite={canInvite}
            total={totalMembers}
            shown={members.length}
            loading={loading}
          />
        </div>

        {members.length === 0 ? (
          <EmptyBlock
            icon={Users}
            title={search || department || role ? `No members match these filters` : "No team members yet"}
            description={
              search || department || role
                ? "Try a different search, or clear the filters to see everybody."
                : "Invite your team so everybody can see the same portfolio."
            }
            action={
              search || department || role ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("")
                    setDepartment("")
                    setRole("")
                    setStatus("active")
                  }}
                  className="mt-4 text-[13px] font-semibold text-pine hover:underline"
                >
                  Clear filters
                </button>
              ) : canInvite ? (
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="mt-4 text-[13px] font-semibold text-pine hover:underline"
                >
                  Invite a teammate
                </button>
              ) : undefined
            }
          />
        ) : (
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className={
              windowed
                ? "max-h-[calc(100vh-20rem)] overflow-y-auto border-t border-border/60"
                : "border-t border-border/60"
            }
          >
            {windowed ? <div style={{ height: start * ROW_HEIGHT }} /> : null}

            {visible.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                presence={member.user_id ? (presence[member.user_id] ?? "offline") : "offline"}
                onOpen={openMember}
              />
            ))}

            {windowed ? (
              <div style={{ height: Math.max(0, (members.length - end) * ROW_HEIGHT) }} />
            ) : null}
          </div>
        )}
      </Panel>

      <MemberSheet
        member={selected}
        presence={selected?.user_id ? (presence[selected.user_id] ?? "offline") : "offline"}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        canManage={canManage}
        viewerUserId={viewerUserId}
        onEditSelf={() => {
          setSheetOpen(false)
          setProfileOpen(true)
        }}
        onChanged={() => {
          // Re-read the directory so the row reflects the new role.
          const controller = new AbortController()
          void load(controller.signal)
            .then((next) => setMembers(next))
            .catch(() => {})
        }}
      />

      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        companyName={companyName}
        onInvited={() => {
          const controller = new AbortController()
          void load(controller.signal)
            .then((next) => setMembers(next))
            .catch(() => {})
        }}
      />
    </>
  )
}
