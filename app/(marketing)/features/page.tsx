import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import * as Icons from "lucide-react"
import { features } from "@/lib/content/marketing"
import { CtaBand, Pill, Section, SectionHeader } from "@/components/marketing/blocks"
import { DashboardPreview } from "@/components/marketing/product-preview"

export const metadata: Metadata = {
  title: "Features — Bower",
  description:
    "Rent collection, reconciliation, tenants, maintenance, documents and reporting — the workflows a landlord runs every week, in one workspace.",
}

export default function FeaturesHub() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x grid items-center gap-10 pb-14 pt-14 sm:pt-20 lg:grid-cols-[1fr_0.9fr] lg:pb-20">
          <div>
            <Pill>Product</Pill>
            <h1 className="mt-6 max-w-[18ch] text-[40px] font-semibold leading-[1.0] tracking-[-0.045em] sm:text-[56px]">
              Every workflow, one workspace.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-[16px]">
              Each feature shares the same tenants, properties and money — so a payment, a work order
              and a report can never tell three different stories.
            </p>
          </div>
          <DashboardPreview className="hidden w-full lg:block" />
        </div>
      </section>

      <Section>
        <SectionHeader
          eyebrow="Capabilities"
          title="What the product actually does."
          intro="Documented per workflow, with the detail behind each claim."
        />
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/70 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>)[feature.icon]
            return (
              <Link
                key={feature.slug}
                href={`/features/${feature.slug}`}
                className="group flex flex-col bg-card p-5 transition-colors hover:bg-secondary/40"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                  {Icon ? <Icon className="size-[17px]" strokeWidth={1.9} /> : null}
                </span>
                <p className="mt-4 text-[13.5px] font-semibold text-foreground">{feature.name}</p>
                <p className="mt-1.5 flex-1 text-[12px] leading-5 text-muted-foreground">{feature.tagline}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground transition-colors group-hover:text-primary">
                  Read the detail <ArrowUpRight className="size-3" />
                </span>
              </Link>
            )
          })}
        </div>
      </Section>

      <CtaBand
        title="The fastest way to judge it is to use it."
        body="Every feature is available from the first sign-in, on your real properties."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
        note="14-day trial · no credit card"
      />
    </>
  )
}
