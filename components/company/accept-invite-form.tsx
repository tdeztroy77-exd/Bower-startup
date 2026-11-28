"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { COMPANY_DEPARTMENTS } from "@/lib/company/types"

/**
 * The invitation acceptance form.
 *
 * The token is already validated by the server component that renders
 * this form — it only has to be posted back so the server can redeem it.
 */
export function AcceptInviteForm({
  token,
  email,
  defaultName,
  companyName,
  role,
}: {
  token: string
  email: string
  defaultName?: string | null
  companyName: string
  role: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: String(form.get("name") || "").trim() || undefined,
          password: String(form.get("password") || "") || undefined,
          department: String(form.get("department") || "") || undefined,
          job_title: String(form.get("job_title") || "").trim() || undefined,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data?.error ?? "Could not accept this invitation")
        setPending(false)
        return
      }

      // The session cookie is set by the accept route, so the workspace
      // is already live — a refresh picks up the new membership.
      router.push("/dashboard/company")
      router.refresh()
    } catch {
      setError("Could not reach the server. Check your connection and try again.")
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-7 space-y-4">
      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-[12.5px] text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[12.5px]">Work email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          readOnly
          disabled
          className="h-10 rounded-xl bg-muted/50"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-[12.5px]">Your name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultName ?? ""}
          required
          maxLength={120}
          placeholder="Ada Kamau"
          autoComplete="name"
          className="h-10 rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-[12.5px]">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-10 rounded-xl"
        />
        <p className="text-[11px] leading-5 text-muted-foreground">
          At least 8 characters. If you already have a Bower account, use your current password.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="department" className="text-[12.5px]">Department</Label>
          <select
            id="department"
            name="department"
            defaultValue=""
            className="h-10 w-full rounded-xl border border-input bg-input px-3 text-[13.5px] text-foreground"
          >
            <option value="">Select…</option>
            {COMPANY_DEPARTMENTS.map((department) => (
              <option key={department} value={department}>
                {department.charAt(0).toUpperCase() + department.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="job_title" className="text-[12.5px]">Job title</Label>
          <Input
            id="job_title"
            name="job_title"
            maxLength={120}
            placeholder="Property manager"
            className="h-10 rounded-xl"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending} className="h-10 w-full rounded-xl">
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Joining {companyName}…
          </>
        ) : (
          `Join ${companyName}`
        )}
      </Button>

      <p className="text-[11px] leading-5 text-muted-foreground">
        You will join <span className="font-medium text-foreground">{companyName}</span> as{" "}
        <span className="font-medium text-foreground">{role}</span>.
      </p>
    </form>
  )
}
