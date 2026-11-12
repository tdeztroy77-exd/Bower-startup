"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, RefreshCcw, TriangleAlert } from "lucide-react"

/**
 * Subscription controls that are safe for the browser: they call the API,
 * which performs the actual mutation with the service role. The browser never
 * writes the subscription row directly.
 */
export function BillingControls({
  autoRenew,
  paymentPhone,
  canRenewWithMpesa,
  checkoutHref,
}: {
  autoRenew: boolean
  paymentPhone: string | null
  canRenewWithMpesa: boolean
  checkoutHref: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [phone, setPhone] = useState(paymentPhone || "")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [savingPhone, setSavingPhone] = useState(false)

  async function patch(body: Record<string, unknown>, success: string) {
    setError(null)
    setNotice(null)
    const response = await fetch("/api/subscription", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.error || "Could not update billing")
      return false
    }
    setNotice(success)
    startTransition(() => router.refresh())
    return true
  }

  async function savePhone() {
    setSavingPhone(true)
    const ok = await patch({ payment_phone: phone }, "M-Pesa number saved")
    setSavingPhone(false)
    return ok
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-background p-3.5">
        <div>
          <p className="text-[12.5px] font-semibold text-foreground">Auto-renew</p>
          <p className="mt-0.5 text-[11.5px] leading-5 text-muted-foreground">
            {autoRenew
              ? "We will send an M-Pesa prompt two days before each renewal."
              : "You will need to renew manually from this page."}
          </p>
        </div>
        <Switch
          checked={autoRenew}
          disabled={pending}
          onCheckedChange={(checked) =>
            patch(
              { auto_renew: checked },
              checked ? "Auto-renew turned on" : "Auto-renew turned off",
            )
          }
          aria-label="Auto-renew subscription"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="payment_phone" className="text-[12.5px]">M-Pesa number for renewals</Label>
        <div className="flex gap-2">
          <Input
            id="payment_phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="0712 345 678"
            className="h-10 rounded-xl"
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 rounded-xl bg-card"
            disabled={savingPhone || phone === (paymentPhone || "")}
            onClick={savePhone}
          >
            {savingPhone ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Used only to send renewal prompts. It never sees your M-Pesa PIN.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
        {canRenewWithMpesa ? (
          <Button asChild size="sm" className="rounded-lg">
            <Link href={checkoutHref}>
              <RefreshCcw className="size-3.5" /> Renew now
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="rounded-lg bg-card">
            <Link href={checkoutHref}>Payment options</Link>
          </Button>
        )}
        {notice ? <p className="text-[11.5px] text-success">{notice}</p> : null}
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[11.5px] text-destructive">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  )
}
