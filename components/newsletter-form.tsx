"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Loader2 } from "lucide-react"

type State = { status: "idle" | "success" | "error"; message?: string }

export function NewsletterForm({ source = "footer" }: { source?: string }) {
  const [state, setState] = useState<State>({ status: "idle" })
  const [pending, startTransition] = useTransition()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    startTransition(async () => {
      try {
        const res = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, source }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          setState({ status: "error", message: body?.error || "Could not subscribe. Please try again." })
          return
        }
        setState({ status: "success", message: body?.message || "You are on the list." })
        form.reset()
      } catch {
        setState({ status: "error", message: "Network error. Please try again." })
      }
    })
  }

  if (state.status === "success") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-success/20 bg-success/[0.06] px-3.5 py-3 text-[12.5px] text-success">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <span>{state.message}</span>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          className="h-10 rounded-xl bg-card"
        />
        <Button type="submit" disabled={pending} className="h-10 shrink-0 rounded-xl px-5">
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Subscribe"}
        </Button>
      </div>
      {state.status === "error" && (
        <p role="alert" className="mt-2 text-[11.5px] text-destructive">
          {state.message}
        </p>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Occasional product notes and field articles. Unsubscribe any time.
      </p>
    </form>
  )
}
