"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { formatPrice } from "@/lib/pricing"

interface Plan {
  code: string
  name: string
  price: number
  cadence: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const search = useSearchParams()
  const planCode = search.get("plan") || "pro"
  const [plan, setPlan] = useState<Plan | null>(null)
  const [phone, setPhone] = useState(search.get("phone") || "")
  const [pushing, setPushing] = useState(false)
  const [stage, setStage] = useState<"idle" | "pushing" | "waiting" | "success" | "failed">("idle")
  const [error, setError] = useState<string | null>(null)
  const [desc, setDesc] = useState<string | null>(null)
  const [pollHandle, setPollHandle] = useState<ReturnType<typeof setInterval> | null>(null)
  const [cardLoading, setCardLoading] = useState(false)

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((payload) => {
        const plans = Array.isArray(payload) ? payload : payload?.data || []
        const match = plans.find((item: Plan) => item.code === planCode)
        setPlan(match || null)
      })
      .catch(() => setError("We could not load the plan details. Refresh and try again."))
  }, [planCode])

  useEffect(() => {
    return () => {
      if (pollHandle) clearInterval(pollHandle)
    }
  }, [pollHandle])

  const payByCard = async () => {
    setError(null)
    setCardLoading(true)
    try {
      const response = await fetch("/api/subscription/stripe-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planCode }),
      })
      const data = await response.json()
      if (!response.ok || !data.url) throw new Error(data.error || "Card checkout is unavailable right now")
      window.location.assign(data.url)
    } catch (e: any) {
      setError(e.message)
      setCardLoading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPushing(true)
    setStage("pushing")
    try {
      const r = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planCode, phone }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "Could not start the payment")
      setStage("waiting")
      const checkout = data.checkout_request_id
      let attempts = 0
      const handle = setInterval(async () => {
        attempts += 1
        if (attempts > 30) {
          clearInterval(handle)
          setStage("failed")
          setDesc("The confirmation took too long. If you were charged, the plan will activate when M-Pesa confirms.")
          return
        }
        try {
          const sr = await fetch(`/api/subscription/checkout-status?checkout=${encodeURIComponent(checkout)}`)
          const sd = await sr.json()
          if (sd.status === "active" || sd.status === "subscribed") {
            clearInterval(handle)
            setStage("success")
            setDesc("Plan active. Taking you to the dashboard…")
            setTimeout(() => router.push("/dashboard"), 1500)
          } else if (sd.status === "failed" || sd.status === "canceled") {
            clearInterval(handle)
            setStage("failed")
            setDesc(sd.result_desc || "The payment was not completed.")
          }
        } catch {
          /* keep polling */
        }
      }, 3000)
      setPollHandle(handle)
    } catch (e: any) {
      setError(e.message)
      setStage("failed")
    } finally {
      setPushing(false)
    }
  }

  const busy = stage === "waiting" || stage === "pushing"

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 h-8 rounded-lg text-muted-foreground">
          <Link href="/dashboard/billing">
            <ArrowLeft className="size-4" /> Billing
          </Link>
        </Button>
        <PageHeader
          eyebrow="Subscription"
          title={`Subscribe to ${plan?.name || "Bower"}`}
          description="Pay by M-Pesa prompt or card. You can cancel from billing at any time."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Order summary" description="Billed monthly">
          <dl className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-semibold text-foreground">{plan?.name || planCode}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Billing</dt>
              <dd className="text-foreground">Monthly</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Trial</dt>
              <dd className="text-foreground">14 days free</dd>
            </div>
            <div className="flex items-center justify-between border-t border-border/70 pt-3">
              <dt className="text-muted-foreground">Due today</dt>
              <dd className="text-[16px] font-semibold tabular text-foreground">KES 0</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Then</dt>
              <dd className="font-semibold tabular text-foreground">
                {plan ? `${formatPrice(plan.price)} / month` : "…"}
              </dd>
            </div>
          </dl>

          <div className="mt-5 space-y-2 border-t border-border/70 pt-4 text-[11.5px] text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-pine" /> Card details never touch our servers
            </p>
            <p className="flex items-center gap-1.5">
              <Lock className="size-3.5 text-pine" /> M-Pesa PIN is entered on your phone
            </p>
          </div>
        </Panel>

        <Panel title="Payment method" description="Choose how you want to pay">
          {stage === "success" ? (
            <div className="flex flex-col items-center py-8 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="size-6" />
              </span>
              <p className="mt-3 text-[14px] font-semibold text-foreground">You are all set</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">{desc || "Your plan is active."}</p>
              <Button asChild size="sm" className="mt-4 rounded-lg">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          ) : busy ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Loader2 className="size-8 animate-spin text-pine" />
              <p className="mt-3 text-[14px] font-semibold text-foreground">
                {stage === "pushing" ? "Sending the request…" : "Check your phone"}
              </p>
              <p className="mt-1 max-w-xs text-[12.5px] leading-5 text-muted-foreground">
                {stage === "pushing"
                  ? "We are asking M-Pesa to raise a payment prompt."
                  : "Enter your M-Pesa PIN on the prompt to authorise the payment. This page updates by itself."}
              </p>
              {stage === "waiting" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 text-muted-foreground"
                  onClick={() => {
                    if (pollHandle) clearInterval(pollHandle)
                    setStage("idle")
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[12.5px]">M-Pesa phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="h-10 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">The number registered to your M-Pesa account.</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-[12.5px] text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {stage === "failed" && desc && !error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-[12.5px] text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>{desc}</span>
                </div>
              )}

              <Button type="submit" className="h-10 w-full rounded-xl" disabled={pushing || !plan}>
                <Smartphone className="size-4" />
                Send the M-Pesa prompt
              </Button>

              <div className="relative py-1 text-center">
                <span className="absolute left-0 right-0 top-1/2 border-t border-border" />
                <span className="relative bg-card px-2 text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                  or
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-xl bg-card"
                onClick={payByCard}
                disabled={cardLoading || !plan}
              >
                {cardLoading ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                Pay by card
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Card payments are processed by Stripe. You stay on Stripe&apos;s page until it completes.
              </p>
            </form>
          )}
        </Panel>
      </div>
    </div>
  )
}
