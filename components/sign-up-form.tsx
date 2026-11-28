"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { signUp } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="h-10 w-full rounded-xl">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating your workspace…
        </>
      ) : (
        "Create your workspace"
      )}
    </Button>
  )
}

export default function SignUpForm() {
  const [state, formAction] = useActionState(signUp, null)

  return (
    <div>
      <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-foreground">
        Start your free trial
      </h1>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        14 days of full access. No card required.
      </p>

      <form action={formAction} className="mt-7 space-y-4">
        {state?.error && (
          <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-[12.5px] text-destructive">
            {state.error}
          </div>
        )}

        {state?.success && (
          <div role="status" className="rounded-xl border border-success/20 bg-success/[0.07] px-3.5 py-2.5 text-[12.5px] text-success">
            <p>{state.message || "Check your inbox for a confirmation link."}</p>
            <Link href="/auth/login" className="mt-2 inline-flex font-semibold underline underline-offset-2">
              Go to sign in
            </Link>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[12.5px]">Work email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" autoCapitalize="none" className="h-10 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[12.5px]">Password</Label>
          <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={6} className="h-10 rounded-xl" />
          <p className="text-[11px] text-muted-foreground">At least 6 characters.</p>
        </div>

        <SubmitButton />

        <p className="text-[11px] leading-5 text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link href="/legal/terms" className="underline decoration-border underline-offset-2 hover:text-foreground">terms</Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline decoration-border underline-offset-2 hover:text-foreground">privacy policy</Link>.
        </p>
      </form>


    </div>
  )
}
