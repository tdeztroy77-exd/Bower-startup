"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2 } from "lucide-react"

type State = { status: "idle" | "success" | "error"; message?: string }

export function MarketingSalesForm() {
  const [state, setState] = useState<State>({ status: "idle" })
  const [pending, startTransition] = useTransition()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget).entries())
    startTransition(async () => {
      try {
        const r = await fetch("/api/pricing/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        const body = await r.json().catch(() => ({}))
        if (!r.ok) {
          setState({ status: "error", message: body?.error ?? "Couldn't send. Try again?" })
          return
        }
        setState({ status: "success", message: body?.message ?? "We will reply by email." })
        e.currentTarget.reset()
      } catch {
        setState({ status: "error", message: "Network error. Please try again." })
      }
    })
  }

  if (state.status === "success") {
    return (
      <div className="mt-7 rounded-2xl border border-success/20 bg-success/[0.06] p-5">
        <div className="flex items-center gap-3 text-success">
          <CheckCircle2 className="size-5" />
          <p className="font-medium">Request received.</p>
        </div>
        <p className="mt-2 text-[12.5px] leading-6 text-foreground/80">{state.message}</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {state.status === "error" && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-[12.5px] text-destructive">
          {state.message}
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-[12.5px]">Your name</Label>
          <Input id="name" name="name" type="text" required placeholder="Your name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[12.5px]">Work email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@company.com" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="company" className="text-[12.5px]">Company</Label>
        <Input id="company" name="company" type="text" placeholder="e.g. Kiarie Holdings" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="portfolio_size" className="text-[12.5px]">How many units do you manage?</Label>
        <select
          id="portfolio_size"
          name="portfolio_size"
          className="h-10 w-full rounded-xl border border-input bg-input px-3 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          defaultValue=""
        >
          <option value="" disabled>Select a range…</option>
          <option value="1-10">1–10</option>
          <option value="11-50">11–50</option>
          <option value="51-200">51–200</option>
          <option value="201-500">201–500</option>
          <option value="500+">500+</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-[12.5px]">Anything we should know?</Label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="What you're using today, biggest pain, timeline."
          className="min-h-[100px] w-full rounded-xl border border-input bg-input px-3 py-2 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-10 w-full rounded-xl sm:w-auto sm:px-5"
      >
        {pending ? <><Loader2 className="mr-2 size-4 animate-spin" /> Sending…</> : "Book a call"}
      </Button>
    </form>
  )
}
