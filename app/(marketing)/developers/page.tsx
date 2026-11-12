import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Code2, KeyRound, Layers, Webhook } from "lucide-react"
import { CtaBand, Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Developers — Bower",
  description:
    "The Bower public API and webhooks are in development. Request early access and tell us what you need to build.",
}

const planned = [
  {
    icon: KeyRound,
    title: "Scoped API keys",
    body: "Per-workspace keys with explicit scopes, so an integration can read payments without touching identity documents.",
  },
  {
    icon: Code2,
    title: "A documented REST surface",
    body: "Stable resources for properties, tenants, payments, expenses and work orders, versioned from day one.",
  },
  {
    icon: Webhook,
    title: "Signed webhooks",
    body: "Event delivery for payment and maintenance changes, with a signature header and a delivery log.",
  },
  {
    icon: Layers,
    title: "OpenAPI specification",
    body: "A machine-readable spec generated from the same schema, so clients do not drift from reality.",
  },
]

export default function DevelopersPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Developers</Pill>
          <h1 className="mt-6 max-w-[20ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            The public API is in development.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            Today the product’s API is private to the app. A documented, versioned API with scoped keys
            and signed webhooks is being built — this page explains what is planned rather than
            publishing endpoints that do not exist.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link
              href="/contact"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Request early access <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/roadmap"
              className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-[13px] font-semibold text-foreground hover:border-primary/30 hover:text-primary"
            >
              See the roadmap
            </Link>
          </div>
        </div>
      </section>

      <Section>
        <p className="eyebrow">What is planned</p>
        <h2 className="mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
          Designed for integrations that must not leak identity data.
        </h2>
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/70 sm:grid-cols-2">
          {planned.map((item) => (
            <article key={item.title} className="bg-card p-6">
              <item.icon className="size-[18px] text-primary" strokeWidth={1.9} />
              <h3 className="mt-4 text-[14.5px] font-semibold text-foreground">{item.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-6 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border/80 bg-muted/40 p-5">
          <p className="text-[13px] font-semibold text-foreground">What you can do today</p>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-6 text-muted-foreground">
            Use the workspace directly, export a complete JSON or CSV snapshot from Settings, and import
            properties or tenants from CSV. If an integration is genuinely blocking your team, tell us
            what it needs to read or write — that is how the first version of the API gets shaped.
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-[12.5px] font-semibold">
            <Link href="/docs/bulk-import" className="text-primary hover:underline">CSV import guide</Link>
            <Link href="/integrations" className="text-foreground hover:underline">Current integrations</Link>
            <Link href="/contact" className="text-foreground hover:underline">Talk to the team</Link>
          </div>
        </div>
      </Section>

      <CtaBand
        title="Tell us what you would build."
        body="Early access is shaped by the integrations people actually need, not by a generic API wishlist."
        primary={{ label: "Request early access", href: "/contact" }}
        secondary={{ label: "Read the docs", href: "/docs" }}
      />
    </>
  )
}
