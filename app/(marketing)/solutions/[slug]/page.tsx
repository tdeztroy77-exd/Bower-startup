import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { solutions } from "@/lib/content/marketing"
import { CtaBand, Section } from "@/components/marketing/blocks"
import { DashboardPreview } from "@/components/marketing/product-preview"

export function generateStaticParams() {
  return solutions.map((solution) => ({ slug: solution.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const solution = solutions.find((item) => item.slug === slug)
  if (!solution) return { title: "Solution — Bower" }
  return { title: `${solution.name} — Bower`, description: solution.summary }
}

const included = [
  "A single register of properties, units and their status",
  "Tenant and lease records with documents attached",
  "Rent due, collected and outstanding by month",
  "Maintenance requests tracked to completion",
  "Owner-ready reports without rebuilding a spreadsheet",
]

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const solution = solutions.find((item) => item.slug === slug)
  if (!solution) notFound()

  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-10 sm:pt-14">
          <Link
            href="/solutions"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All solutions
          </Link>
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1fr_0.85fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{solution.audience}</p>
              <h1 className="mt-3 max-w-[18ch] text-[36px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[50px]">
                {solution.name}
              </h1>
              <p className="mt-4 max-w-xl text-[16px] font-medium leading-7 text-foreground/80">{solution.tagline}</p>
              <p className="mt-4 max-w-xl text-[14.5px] leading-7 text-muted-foreground">{solution.summary}</p>
              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                <Link
                  href="/auth/sign-up"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Start free <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  Ask about fit
                </Link>
              </div>
            </div>
            <DashboardPreview className="hidden lg:block" />
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <p className="eyebrow">What changes</p>
            <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
              The same workspace, tuned to this portfolio.
            </h2>
          </div>
          <ul className="divide-y divide-border/70 border-y border-border/70">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-3 py-4">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                  <Check className="size-3" strokeWidth={2.8} />
                </span>
                <span className="text-[14px] leading-6 text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <CtaBand
        title="Use it on your real portfolio."
        body="Fourteen days of full access. If it does not fit the way you work, you will know quickly."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
      />
    </>
  )
}
