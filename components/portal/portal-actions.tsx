"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, Smartphone, Wrench } from "lucide-react"

type Invoice = {
  id: string
  amount: number
  late_fee?: number
  total?: number
  due_date: string | null
  status: string | null
  settled: boolean
}

const CATEGORIES = [
  ["general", "General"],
  ["plumbing", "Plumbing"],
  ["electrical", "Electrical"],
  ["appliances", "Appliance"],
  ["structural", "Structural"],
  ["pest_control", "Pest control"],
  ["security", "Security"],
  ["other", "Other"],
] as const

const currency = (value: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value)

/**
 * Tenant-facing actions: pay an invoice with M-Pesa, or raise a maintenance
 * request. Everything goes through the token-scoped API; the amount comes from
 * the invoice on the server.
 */
export function PortalActions({ token, invoices }: { token: string; invoices: Invoice[] }) {
  const router = useRouter()
  const [paying, setPaying] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [maintenanceOpen, setMaintenanceOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("general")
  const [submitting, setSubmitting] = useState(false)
  const [reference, setReference] = useState<string | null>(null)

  async function pay(invoice: Invoice) {
    setPaying(invoice.id)
    setError(null)
    setMessage("Sending the M-Pesa prompt…")
    try {
      const response = await fetch(`/api/portal/${token}/pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payment_id: invoice.id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not start the payment")

      setMessage("Check your phone and enter your M-Pesa PIN.")
      const checkout = data.checkout_request_id as string
      for (let attempt = 0; attempt < 24; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 4000))
        const statusResponse = await fetch(
          `/api/portal/${token}/status?checkout=${encodeURIComponent(checkout)}`,
        )
        if (!statusResponse.ok) continue
        const status = await statusResponse.json()
        if (status.status === "completed") {
          setMessage(`Payment received${status.receipt ? ` · receipt ${status.receipt}` : ""}.`)
          router.refresh()
          return
        }
        if (status.status === "failed") {
          throw new Error(status.message || "The payment was not completed.")
        }
      }
      setMessage("Still waiting for M-Pesa. Refresh this page in a minute to check.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed")
      setMessage(null)
    } finally {
      setPaying(null)
    }
  }

  async function submitMaintenance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setReference(null)
    try {
      const response = await fetch(`/api/portal/${token}/maintenance`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, description, category }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not send the request")
      setReference(data.reference || "Sent")
      setTitle("")
      setDescription("")
      setCategory("general")
      setMaintenanceOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the request")
    } finally {
      setSubmitting(false)
    }
  }

  const unpaid = invoices.filter((invoice) => !invoice.settled && invoice.status !== "cancelled")

  return (
    <div className="space-y-5">
      {message ? (
        <div className="flex items-start gap-2 rounded-xl border border-success/20 bg-success/[0.06] px-3.5 py-2.5 text-[12.5px] text-success">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{message}</span>
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-[12.5px] text-destructive">
          {error}
        </div>
      ) : null}

      {unpaid.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Due now
          </p>
          {unpaid.map((invoice) => (
            <div
              key={invoice.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-3.5 py-3"
            >
              <div>
                '<p className="text-[14px] font-semibold tabular text-foreground">
                {currency(invoice.total ?? invoice.amount)}
              </p>
              {invoice.late_fee ? (
                <p className="text-[10.5px] text-warning">
                  includes {currency(invoice.late_fee)} late fee
                </p>
              ) : null}'
                <p className="text-[11.5px] text-muted-foreground">
                  {invoice.due_date
                    ? `Due ${new Date(invoice.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                    : "Due now"}
                  {invoice.status ? ` · ${invoice.status}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => pay(invoice)}
                disabled={paying !== null}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[12.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {paying === invoice.id ? <Loader2 className="size-3.5 animate-spin" /> : <Smartphone className="size-3.5" />}
                Pay with M-Pesa
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-success/20 bg-success/[0.06] px-3.5 py-3 text-[12.5px] text-success">
          Nothing outstanding. You are up to date.
        </p>
      )}

      <div className="rounded-xl border border-border/80 bg-card p-3.5">
        <button
          type="button"
          onClick={() => setMaintenanceOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <Wrench className="size-4 text-primary" /> Report a repair
          </span>
          <span className="text-[12px] text-muted-foreground">{maintenanceOpen ? "Close" : "Open"}</span>
        </button>

        {reference ? (
          <p className="mt-2 rounded-lg bg-success/10 px-2.5 py-2 text-[11.5px] text-success">
            Request sent · reference {reference}
          </p>
        ) : null}

        {maintenanceOpen ? (
          <form onSubmit={submitMaintenance} className="mt-3 space-y-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What is the issue? e.g. Leaking kitchen tap"
              required
              minLength={3}
              maxLength={120}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="When did it start, and what should the landlord know before visiting?"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Send request
            </button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
