"use client"

import { useState } from "react"
import { Loader2, Mail, UserPlus } from "lucide-react"
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
import { COMPANY_DEPARTMENTS, COMPANY_ROLES } from "@/lib/company/types"
import { roleLabel } from "./tokens"

/**
 * Invite a teammate.
 *
 * The invitee does not become a member yet — this creates a PENDING
 * invitation with a single-use, expiring token. They join when they
 * redeem the link.
 */
export function InviteDialog({
  open,
  onOpenChange,
  companyName,
  onInvited,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyName: string
  onInvited?: () => void
}) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("agent")
  const [department, setDepartment] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch("/api/company/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          role,
          department: department || undefined,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data?.error ?? "Could not create the invitation")
        return
      }

      setNotice(
        data?.email?.delivered
          ? `Invitation sent to ${email.trim()}.`
          : `Invitation created for ${email.trim()}. The invite link is in the server log until email delivery is configured.`,
      )
      setEmail("")
      setName("")
      onInvited?.()
    } catch {
      setError("Could not reach the server")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>
            They will get a link to join {companyName}. The link works once and expires after
            seven days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3.5">
          {error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[12.5px] text-destructive">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-lg border border-success/20 bg-success/[0.07] px-3 py-2 text-[12.5px] text-success">
              {notice}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="invite-email" className="text-[12.5px]">
              Work email
            </Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="off"
              className="h-9 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-name" className="text-[12.5px]">
              Name <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Ada Kamau"
              className="h-9 rounded-lg"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-role" className="text-[12.5px]">
                Role
              </Label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-input px-2.5 text-[13px] text-foreground"
              >
                {COMPANY_ROLES.map((option) => (
                  <option key={option} value={option}>
                    {roleLabel(option)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-department" className="text-[12.5px]">
                Department
              </Label>
              <select
                id="invite-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-input px-2.5 text-[13px] capitalize text-foreground"
              >
                <option value="">Select…</option>
                {COMPANY_DEPARTMENTS.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="pt-1">
            <Button
              type="submit"
              disabled={saving}
              className="h-9 rounded-lg"
            >
              {saving ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <UserPlus className="mr-1.5 size-3.5" />
              )}
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { Mail }
