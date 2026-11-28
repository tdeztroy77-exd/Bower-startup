"use client"

import { useEffect, useState } from "react"
import { Mail, MessageSquare, Phone, ShieldAlert, Loader2 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusPill } from "@/components/dashboard/status-pill"
import { cn } from "@/lib/utils"
import { COMPANY_ROLES, type CompanyMember, type PresenceStatus } from "@/lib/company/types"
import { MemberAvatar } from "./member-avatar"
import { PresenceDot } from "./presence-dot"
import { departmentDot, departmentTone, roleLabel, timeAgo } from "./tokens"

/**
 * A member's profile.
 *
 * Opened by clicking a row in the directory. One sheet, one person —
 * the header is the identity, the body is the contact details, and the
 * actions are for whoever is allowed to act.
 */
export function MemberSheet({
  member,
  presence = "offline",
  open,
  onOpenChange,
  canManage = false,
  viewerUserId,
  onChanged,
  onEditSelf,
}: {
  member: CompanyMember | null
  presence?: PresenceStatus
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The viewer may change roles and remove members. */
  canManage?: boolean
  /** The viewer's own user id — used to stop them editing themselves. */
  viewerUserId?: string | null
  /** Called after a successful change so the list can refresh. */
  onChanged?: () => void
  /** Open the caller's own profile sheet. */
  onEditSelf?: () => void
}) {
  const [role, setRole] = useState(member?.role ?? "viewer")
  const [department, setDepartment] = useState(member?.department ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  useEffect(() => {
    setRole(member?.role ?? "viewer")
    setDepartment(member?.department ?? "")
    setError(null)
    setConfirmingRemove(false)
  }, [member])

  if (!member) return null

  // The API refuses to let anyone change their own role, so the UI
  // must not offer it either.
  const isSelf = Boolean(member.user_id && viewerUserId && member.user_id === viewerUserId)
  const editable = canManage && !member.is_owner

  async function save() {
    if (!member) return
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/company/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          department: department.trim() ? department.trim().toLowerCase() : null,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data?.error ?? "Could not save this member")
        return
      }

      onChanged?.()
    } catch {
      setError("Could not reach the server")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!member) return
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/company/members/${member.id}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data?.error ?? "Could not remove this member")
        setConfirmingRemove(false)
        return
      }

      onChanged?.()
      onOpenChange(false)
    } catch {
      setError("Could not reach the server")
    } finally {
      setSaving(false)
    }
  }

  const nairobiTime = new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date())

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="sr-only">Member profile</SheetTitle>
          <SheetDescription className="sr-only">
            Profile and permissions for {member.name}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {/* The presence ring: the one place the colour is allowed
                  to be loud, because it is the thing you look for. */}
              <div
                className={cn(
                  "rounded-full p-[2px] transition-shadow duration-300",
                  presence === "online"
                    ? "bg-live/45 shadow-[0_0_0_4px_color-mix(in_srgb,var(--live)_14%,transparent)]"
                    : presence === "away"
                      ? "bg-warning/45"
                      : "bg-border",
                )}
              >
                <MemberAvatar member={member} size="sheet" className="ring-2 ring-background" />
              </div>
              <PresenceDot status={presence} className="-bottom-1 -right-1 size-3" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[17px] font-semibold tracking-[-0.02em] text-foreground">
                {member.name}
              </p>
              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                {member.job_title?.trim() || roleLabel(member.role)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusPill tone={member.is_owner ? "brand" : "neutral"}>
                  {member.is_owner ? "Owner" : roleLabel(member.role)}
                </StatusPill>
                {member.department ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                      departmentTone(member.department),
                    )}
                  >
                    {member.department}
                  </span>
                ) : null}
                <StatusPill tone={presence === "online" ? "success" : presence === "away" ? "warning" : "neutral"}>
                  {presence}
                </StatusPill>
              </div>
            </div>
          </div>

          {/* Facts */}
          <dl className="mt-6 divide-y divide-border/60 border-y border-border/60">
            {member.department ? (
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[12.5px] text-muted-foreground">Department</dt>
                <dd>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                      departmentTone(member.department),
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", departmentDot(member.department))} />
                    {member.department}
                  </span>
                </dd>
              </div>
            ) : null}
            {member.email ? (
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                  <Mail className="size-3.5" />
                  Email
                </dt>
                <dd className="truncate text-[13px] text-foreground">{member.email}</dd>
              </div>
            ) : null}

            {member.phone ? (
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                  <Phone className="size-3.5" />
                  Phone
                </dt>
                <dd className="truncate text-[13px] text-foreground">{member.phone}</dd>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[12.5px] text-muted-foreground">Last seen</dt>
              <dd className="text-[13px] text-foreground">{timeAgo(member.last_seen_at)}</dd>
            </div>

            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[12.5px] text-muted-foreground">Company time</dt>
              <dd className="text-[13px] text-foreground tabular">{nairobiTime}</dd>
            </div>

            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[12.5px] text-muted-foreground">Status</dt>
              <dd className="text-[13px] capitalize text-foreground">{member.status}</dd>
            </div>
          </dl>

          {/* Admin actions */}
          {editable ? (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Manage
              </p>

              {error ? (
                <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[12.5px] text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="member-role" className="text-[12.5px]">
                    Role
                  </Label>
                  <select
                    id="member-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as CompanyMember["role"])}
                    disabled={isSelf}
                    className="h-9 w-full rounded-lg border border-input bg-input px-2.5 text-[13px] capitalize text-foreground disabled:opacity-60"
                  >
                    {COMPANY_ROLES.map((option) => (
                      <option key={option} value={option}>
                        {roleLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="member-department" className="text-[12.5px]">
                    Department
                  </Label>
                  <Input
                    id="member-department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="lettings"
                    maxLength={80}
                    className="h-9 rounded-lg"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={save}
                  disabled={saving || isSelf}
                  className="h-9 rounded-lg"
                >
                  {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
                  Save changes
                </Button>

                {confirmingRemove ? (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={remove}
                      disabled={saving}
                      className="h-9 rounded-lg"
                    >
                      Remove {member.name.split(" ")[0]}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmingRemove(false)}
                      disabled={saving}
                      className="h-9 rounded-lg"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmingRemove(true)}
                    disabled={saving || isSelf}
                    className="h-9 rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <ShieldAlert className="mr-1.5 size-3.5" />
                    Remove
                  </Button>
                )}
              </div>

              {isSelf ? (
                <div className="mt-3">
                  <p className="text-[11.5px] leading-5 text-muted-foreground">
                    This is your own profile — another admin has to change your role.
                  </p>
                  {onEditSelf ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onEditSelf}
                      className="mt-2 h-8 rounded-lg"
                    >
                      Edit my details
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-border/70 px-6 py-4">
          {member.email ? (
            <Button asChild variant="outline" size="sm" className="h-9 rounded-lg">
              <a href={`mailto:${member.email}`}>
                <Mail className="mr-1.5 size-3.5" />
                Message
              </a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled className="h-9 rounded-lg">
              <MessageSquare className="mr-1.5 size-3.5" />
              Message
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
