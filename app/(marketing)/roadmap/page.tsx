import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CircleDot, Layers, Wrench } from "lucide-react"
import { CtaBand, Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Roadmap — Bower",
  description: "What we are working on, what is live, and what we are deliberately not building yet.",
}

const columns = [
  {
    key: "development",
    label: "In development",
    icon: Wrench,
    note: "Being built now, no date promised.",
    items: [
      { title: "Public API and webhooks", body: "A documented read/write API with signed event delivery." },
      { title: "Multi-owner agency workspaces", body: "Separate landlord books under one agency login." },
      { title: "Statement exports", body: "Owner statements and arrears reports as a shareable file." },
    ],
  },
  {
    key: "next",
    label: "Next",
    icon: Layers,
    note: "Designed, not started.",
    items: [
      { title: "Tenant receipts by SMS", body: "A delivery channel that does not require the tenant to have email." },
      { title: "Payment plan tracking", body: "Agreed instalments per tenancy, with the shortfall visible." },
    ],
  },
  {
    key: "not-building",
    label: "Not building yet",
    icon: CircleDot,
    note: "Considered and deliberately parked.",
    items: [
      { title: "Airtel Money collection", body: "We will not list a channel until settlement and reconciliation are reliable." },
      { title: "Channel sync (Airbnb, Booking)", body: "A different product surface; it would distract from rent operations." },
      { title: "Accounting ledger replacement", body: "We export clean data instead of trying to be your books." },
    ],
  },
]

export default function RoadmapPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Roadmap</Pill>
          <h1 className="mt-6 max-w-[18ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            What we are building, plainly.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            A short list on purpose. Items move when they are ready, not when a date on a slide says so,
            and the “not building” column is as important as the rest.
          </p>
        </div>
      </section>

      <Section>
        <div className="grid gap-3 lg:grid-cols-3">
          {columns.map((column) => (
            <div key={column.key} className="rounded-2xl border border-border/80 bg-card p-5 shadow-card">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-secondary text-pine">
                  <column.icon className="size-4" />
                </span>
                <div>
                  <h2 className="text-[13.5px] font-semibold text-foreground">{column.label}</h2>
                  <p className="text-[11px] text-muted-foreground">{column.note}</p>
                </div>
              </div>
              <ul className="mt-5 space-y-4">
                {column.items.map((item) => (
                  <li key={item.title} className="border-t border-border/60 pt-3 first:border-0 first:pt-0">
                    <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-border/80 bg-muted/40 p-5 sm:flex-row sm:items-center">
          <p className="text-[12.5px] leading-6 text-muted-foreground">
            Something missing that would change how you run your portfolio? That is the most useful
            message we can get.
          </p>
          <Link
            href="/contact"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Tell us <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </Section>

      <CtaBand
        title="Use what is live today."
        body="Every shipped workflow is available in the trial — properties, tenants, rent, maintenance, documents and reports."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "See features", href: "/features" }}
      />
    </>
  )
}
