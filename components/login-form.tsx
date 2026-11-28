"use client"

import { useActionState, useEffect, useMemo } from "react"
import { useFormStatus } from "react-dom"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"
import { signIn } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="h-10 w-full rounded-xl">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing in…
        </>
      ) : (
        "Sign in"
      )}
    </Button>
  )
}

export default function LoginForm() {
  const [state, formAction] = useActionState(signIn, null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const justReset = searchParams.get("reset") === "success"
  const justVerified = searchParams.get("verified") === "true"

  const prefillError = useMemo(() => {
    const e = searchParams.get("error")
    if (!e) return null
    if (e === "verification_failed") return "Email verification failed. Please try signing up again."
    return decodeURIComponent(e)
  }, [searchParams])

  // Single redirect on success — middleware already handles session refresh,
  // so we just send the user to the dashboard (or the page they came from).
  useEffect(() => {
    if (state?.success) {
      const raw = new URLSearchParams(window.location.search).get("next") || ""
      // Only accept same-origin relative paths.
      const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard"
      router.push(next)
    }
  }, [state?.success, router])

  return (
    <div>
      <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-foreground">Sign in</h1>
      <p className="mt-1.5 text-[13px] text-muted-foreground">Back to your portfolio.</p>

      <form action={formAction} className="mt-7 space-y-4">
        {justReset && (
          <div className="flex items-start gap-2 rounded-xl border border-success/20 bg-success/[0.07] px-3.5 py-2.5 text-[12.5px] text-success">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>Password reset. Sign in with your new password.</span>
          </div>
        )}
        {justVerified && (
          <div className="flex items-start gap-2 rounded-xl border border-success/20 bg-success/[0.07] px-3.5 py-2.5 text-[12.5px] text-success">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>Email verified. You can sign in now.</span>
          </div>
        )}
        {(state?.error || prefillError) && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-[12.5px] text-destructive">
            {state?.error || prefillError}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[12.5px]">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" className="h-10 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[12.5px]">Password</Label>
            <Link href="/auth/forgot-password" className="text-[11.5px] font-medium text-muted-foreground hover:text-pine">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" required autoComplete="current-password" className="h-10 rounded-xl" />
        </div>

        <SubmitButton />
      </form>


    </div>
  )
}
