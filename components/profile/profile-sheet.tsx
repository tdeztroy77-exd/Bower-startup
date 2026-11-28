"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, Loader2, Save } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { initials, roleLabel } from "@/components/company/tokens"

/**
 * Your own profile.
 *
 * A person may change their own name, photo, phone number and job
 * title. Their role, their status and their company are set by whoever
 * runs the team — the sheet says so rather than hiding it.
 */

interface Profile {
  user_id: string
  email: string | null
  full_name: string | null
  phone: string | null
  job_title: string | null
  avatar_url: string | null
  department: string | null
  role: string | null
  company_name: string | null
}

export function ProfileSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/profile")
      if (!response.ok) return
      const data = await response.json()
      const next = (data?.profile ?? null) as Profile | null
      if (!next) return
      setProfile(next)
      setFullName(next.full_name ?? "")
      setPhone(next.phone ?? "")
      setJobTitle(next.job_title ?? "")
      setAvatarUrl(next.avatar_url ?? null)
    } catch {
      // Leave the form as it is.
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  async function save() {
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim() || undefined,
          phone: phone.trim() || null,
          job_title: jobTitle.trim() || null,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data?.error ?? "Could not save your profile")
        return
      }

      setNotice("Saved.")
      void load()
    } catch {
      setError("Could not reach the server")
    } finally {
      setSaving(false)
    }
  }

  async function upload(file: File) {
    setUploading(true)
    setError(null)

    try {
      const body = new FormData()
      body.append("file", file)

      const response = await fetch("/api/profile/avatar", { method: "POST", body })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data?.error ?? "Could not upload that image")
        return
      }

      setAvatarUrl(data?.avatar_url ?? null)
      void load()
    } catch {
      setError("Could not reach the server")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="text-[15px] font-semibold tracking-[-0.01em]">My profile</SheetTitle>
          <SheetDescription className="text-xs">
            Your name, photo and contact details. Your role is set by your company.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {/* Avatar, sitting on an ink header — the same move the
              company band makes, at a smaller scale. */}
          <div className="brand-sweep relative -mx-6 -mt-6 mb-6 h-28 rounded-br-2xl">
            <div className="brand-grain pointer-events-none absolute inset-0 opacity-[0.05]" />
          </div>

          <div className="-mt-14 flex items-end gap-4">
            <div className="relative">
              <Avatar className="size-20 ring-4 ring-background">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                <AvatarFallback
                  className={cn(
                    "bg-secondary text-lg font-semibold text-pine",
                  )}
                >
                  {initials(fullName || profile?.email)}
                </AvatarFallback>
              </Avatar>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="Change your photo"
                className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform duration-200 ease-spring hover:scale-105 disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void upload(file)
                  event.target.value = ""
                }}
              />
            </div>

            <div className="min-w-0 pb-1">
              <p className="truncate text-[15px] font-semibold text-foreground">
                {fullName || "Your name"}
              </p>
              <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                {profile?.email}
              </p>
              {profile?.role ? (
                <p className="mt-1.5 text-[11.5px] font-medium text-muted-foreground">
                  {roleLabel(profile.role)}
                  {profile.company_name ? ` · ${profile.company_name}` : ""}
                </p>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-lg border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[12.5px] text-destructive">
              {error}
            </div>
          ) : null}
          {notice && !error ? (
            <div className="mt-5 rounded-lg border border-success/20 bg-success/[0.07] px-3 py-2 text-[12.5px] text-success">
              {notice}
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name" className="text-[12.5px]">
                Full name
              </Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={120}
                placeholder="Ada Kamau"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-job" className="text-[12.5px]">
                Job title
              </Label>
              <Input
                id="profile-job"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                maxLength={120}
                placeholder="Property manager"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-phone" className="text-[12.5px]">
                Phone
              </Label>
              <Input
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
                placeholder="+254 712 000 000"
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <Button onClick={save} disabled={saving} className="mt-6 h-10 w-full rounded-xl">
            {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
            Save changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
