import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, Mail, ShieldCheck } from "lucide-react"
import { BrandWordmark } from "@/components/brand-mark"
import { PortalActions } from "@/components/portal/portal-actions"
import { loadPortalData } from "@/lib/portal/data"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Tenant portal — Bower",
  robots: { index: false, follow: false },
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value)

const dateLabel = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"

export default async function TenantPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await loadPortalData(token)

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 text-center shadow-card">
          <BrandWordmark href="/" size="md" />
          <div className="mx-auto mt-6 grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-foreground">This link is not active</h1>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            It may have expired after 30 days, or your landlord may have replaced it with a new one. Ask
            them to send a fresh link.
          </p>
          <Link href="/" className="mt-5 inline-flex text-[12.5px] font-semibold text-pine hover:underline">
            About Bower
          </Link>
        </div>
      </div>
    )
  }

  const unpaid = data.payments.filter((payment) => !payment.settled && payment.status !== "cancelled")
  const settled = data.payments.filter((payment) => payment.settled)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
          <BrandWordmark href="/" size="sm" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tenant portal
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-4 py-6">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pine">
            {data.owner.company}
          </p>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-foreground">
            Hello, {data.tenant.name.split(" ")[0]}.
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {data.property?.name || "Your property"}
            {data.property?.address ? ` · ${data.property.address}` : ""}
          </p>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Balance outstanding</p>
              <p className="mt-1 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular text-foreground">
                {currency(data.balance)}
              </p>
            </div>
            <span
              className={
                data.balance > 0
                  ? "rounded-full bg-warning/10 px-2 py-0.5 text-[10.5px] font-semibold text-warning"
                  : "rounded-full bg-success/10 px-2 py-0.5 text-[10.5px] font-semibold text-success"
              }
            >
              {data.balance > 0 ? `${unpaid.length} unpaid` : "Up to date"}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-3 text-[12px]">
            <div>
              <dt className="text-muted-foreground">Monthly rent</dt>
              <dd className="mt-0.5 font-semibold tabular text-foreground">
                {data.tenant.monthly_rent ? currency(Number(data.tenant.monthly_rent)) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Lease ends</dt>
              <dd className="mt-0.5 inline-flex items-center gap-1 font-semibold text-foreground">
                <CalendarDays className="size-3 text-muted-foreground" />
                {dateLabel(data.tenant.lease_end)}
              </dd>
            </div>
          </dl>
        </section>

        <PortalActions token={token} invoices={data.payments} />

        {settled.length > 0 ? (
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Payment history
            </p>
            <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-card">
              {settled.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold tabular text-foreground">{currency(payment.total ?? payment.amount)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {payment.paid_date ? dateLabel(payment.paid_date) : dateLabel(payment.due_date)}
                      {payment.method ? ` · ${payment.method}` : ""}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                    paid
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-2xl border border-border/80 bg-muted/40 p-4">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
            <Mail className="size-4 text-muted-foreground" /> Need to reach {data.owner.company}?
          </p>
          <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
            {data.owner.contact_name ? `${data.owner.contact_name} · ` : ""}
            {data.owner.phone || "Use the contact details your landlord gave you."}
          </p>
        </section>

        <p className="pb-4 text-center text-[10.5px] leading-4 text-muted-foreground">
          This private link expires {dateLabel(data.expires_at)}. Do not share it — it shows your rent
          account. Powered by{" "}
          <Link href="/" className="font-medium text-foreground underline decoration-border underline-offset-2">
            Bower
          </Link>
          .
        </p>
      </main>
    </div>
  )
}
