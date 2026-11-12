import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react"
import * as Icons from "lucide-react"
import { features } from "@/lib/content/marketing"
import { CtaBand, Section } from "@/components/marketing/blocks"
import {
  DashboardPreview,
  MaintenancePreview,
  MpesaPromptPreview,
  ReconciliationPreview,
} from "@/components/marketing/product-preview"

export function generateStaticParams() {
  return features.map((f) => ({ slug: f.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const feature = features.find((f) => f.slug === slug)
  if (!feature) return { title: "Feature — Bower" }
  return {
    title: `${feature.name} — Bower`,
    description: feature.summary,
  }
}

function previewFor(slug: string) {
  if (slug.includes("paybill") || slug.includes("rent")) return <ReconciliationPreview />
  if (slug.includes("maintenance") || slug.includes("quotation") || slug.includes("damage")) return <MaintenancePreview />
  if (slug.includes("tenant")) return <MpesaPromptPreview />
  return <DashboardPreview />
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const feature = features.find((f) => f.slug === slug)
  if (!feature) notFound()

  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>)[feature.icon]
  const others = features.filter((f) => f.slug !== feature.slug).slice(0, 3)

  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-10 sm:pt-14">
          <Link
            href="/features"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All features
          </Link>

          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1fr_0.85fr]">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
                  {Icon ? <Icon className="size-5" strokeWidth={1.9} /> : null}
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Feature</p>
              </div>
              <h1 className="mt-5 max-w-[20ch] text-[36px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[50px]">
                {feature.name}
              </h1>
              <p className="mt-4 max-w-xl text-[16px] font-medium leading-7 text-foreground/80">{feature.tagline}</p>
              <p className="mt-4 max-w-xl text-[14.5px] leading-7 text-muted-foreground">{feature.summary}</p>
              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                <Link
                  href="/auth/sign-up"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Try it free <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  See pricing
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">{previewFor(feature.slug)}</div>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <p className="eyebrow">Included</p>
            <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
              What you get with {feature.name.toLowerCase()}.
            </h2>
            <p className="mt-4 max-w-sm text-[13.5px] leading-6 text-muted-foreground">
              Part of the same workspace — no add-on, no separate seat.
            </p>
          </div>
          <ul className="divide-y divide-border/70 border-y border-border/70">
            {feature.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 py-4">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                  <Check className="size-3" strokeWidth={2.8} />
                </span>
                <span className="text-[14px] leading-6 text-foreground">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section muted bordered>
        <p className="eyebrow">Related</p>
        <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
          Pairs well with {feature.name.toLowerCase()}.
        </h2>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {others.map((other) => {
            const OtherIcon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>)[other.icon]
            return (
              <Link
                key={other.slug}
                href={`/features/${other.slug}`}
                className="group rounded-2xl border border-border/80 bg-card p-5 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary/30"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                  {OtherIcon ? <OtherIcon className="size-[17px]" strokeWidth={1.9} /> : null}
                </span>
                <p className="mt-4 text-[14px] font-semibold text-foreground">{other.name}</p>
                <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{other.tagline}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                  Read more <ArrowUpRight className="size-3.5" />
                </span>
              </Link>
            )
          })}
        </div>
      </Section>

      <CtaBand
        title="Put your own portfolio through it."
        body="Fourteen days of full access, on real records. If it does not save you a reconciliation evening, do not pay for it."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "Talk to the team", href: "/contact" }}
      />
    </>
  )
}
