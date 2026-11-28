"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react"
import { BRAND } from "@/lib/brand"

type FormState = { status: "idle" | "success" | "error"; message?: string }

export function ContactForm() {
  const [state, setState] = useState<FormState>({ status: "idle" })
  const [topic, setTopic] = useState("sales")
  const [pending, startTransition] = useTransition()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = { ...Object.fromEntries(form.entries()), topic }

    startTransition(async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          setState({ status: "error", message: body?.error || "Something went wrong. Please try again." })
          return
        }
        setState({
          status: "success",
          message:
            body?.message ||
            `Your email app should now be open with the message ready. Press send and it reaches ${BRAND.company}.`,
        })
        form.reset()
        if (body?.mailto) window.location.assign(body.mailto)
      } catch {
        setState({ status: "error", message: "Network error. Please try again." })
      }
    })
  }

  if (state.status === "success") {
    return (
      <div className="mt-6 rounded-2xl border border-success/20 bg-success/[0.06] p-6">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="size-4" />
          <p className="text-[13px] font-semibold">Message ready to send</p>
        </div>
        <p className="mt-2 text-[12.5px] leading-6 text-foreground/80">{state.message}</p>
        <p className="mt-3 text-[12px] text-muted-foreground">
          If your email app did not open, write to{" "}
          <a href={`mailto:${BRAND.supportEmail}`} className="font-medium text-foreground underline">
            {BRAND.supportEmail}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => setState({ status: "idle" })}
          className="mt-4 text-[12.5px] font-semibold text-pine hover:underline"
        >
          Write another message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {state.status === "error" && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-[12.5px] text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="first_name" className="text-[12.5px]">First name</Label>
          <Input id="first_name" name="first_name" type="text" required placeholder="Aisha" className="h-10 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name" className="text-[12.5px]">Last name</Label>
          <Input id="last_name" name="last_name" type="text" required placeholder="Otieno" className="h-10 rounded-xl" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[12.5px]">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="you@example.com" className="h-10 rounded-xl" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company" className="text-[12.5px]">Company / portfolio <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Input id="company" name="company" type="text" placeholder="e.g. Kiarie Holdings" className="h-10 rounded-xl" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="topic" className="text-[12.5px]">What is this about?</Label>
        <input type="hidden" name="topic" value={topic} />
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger id="topic" className="h-10 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sales">Pricing or sales question</SelectItem>
            <SelectItem value="demo">Book a walkthrough</SelectItem>
            <SelectItem value="support">Existing customer support</SelectItem>
            <SelectItem value="partnership">Partnership or agency</SelectItem>
            <SelectItem value="other">Something else</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message" className="text-[12.5px]">Message</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Tell us about your portfolio and what you would like help with."
          className="min-h-[120px] rounded-xl"
        />
      </div>

      {/* Honeypot for bots */}
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <Button type="submit" disabled={pending} className="h-10 w-full rounded-xl sm:w-auto sm:px-5">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Preparing…
          </>
        ) : (
          "Send message"
        )}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        This opens your email app with the message filled in — press send there to deliver it.
      </p>
    </form>
  )
}
