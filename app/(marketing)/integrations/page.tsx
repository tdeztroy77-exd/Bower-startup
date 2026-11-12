import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, CreditCard, Plug, Smartphone } from "lucide-react"
import { integrations } from "@/lib/content/site"
import { CtaBand, Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Integrations — Bower",
  description: "M-Pesa collection and Stripe subscription payments — the integrations that exist today.",
}

const iconFor = (name: string) => (name.toLowerCase().includes("stripe") ? CreditCard : Smartphone)

export default function IntegrationsPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Integrations</Pill>
          <h1 className="mt-6 max-w-[18ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            Two integrations. Both real.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            Rent moves through M-Pesa, and subscriptions can be paid by card through Stripe. We will add
            another integration when it is genuinely finished — not to fill a logo wall.
          </p>
        </div>
      </section>

      <Section>
        <div className="grid gap-3 sm:grid-cols-2">
          {integrations.map((integration) => {
            const Icon = iconFor(integration.name)
            return (
              <article
                key={integration.name}
                className="rounded-2xl border border-border/80 bg-card p-6 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-[19px]" strokeWidth={1.9} />
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10.5px] font-semibold text-success ring-1 ring-inset ring-success/15">
                    <span className="size-1.5 rounded-full bg-success" /> Live
                  </span>
                </div>
                <h2 className="mt-5 text-[15px] font-semibold text-foreground">{integration.name}</h2>
                <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{integration.description}</p>
                <a
                  href={integration.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
                >
                  Provider documentation <ArrowUpRight className="size-3.5" />
                </a>
              </article>
            )
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-border/80 bg-muted/40 p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <Plug className="size-4 text-muted-foreground" /> Not integrated yet
          </p>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-6 text-muted-foreground">
            Airtel Money, Xero, QuickBooks, WhatsApp and accounting sync are not available today. You can
            export your data as JSON or CSV and bring it into whatever tool you already use. If one of
            those integrations is blocking you, tell us — it is useful signal.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/contact" className="text-[12.5px] font-semibold text-primary hover:underline">
              Request an integration
            </Link>
            <Link href="/docs/bulk-import" className="text-[12.5px] font-semibold text-foreground hover:underline">
              Import from CSV instead
            </Link>
          </div>
        </div>
      </Section>

      <CtaBand
        title="Connect the two that matter first."
        body="M-Pesa for rent, card for your subscription. Everything else can wait until it is done properly."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
      />
    </>
  )
}
