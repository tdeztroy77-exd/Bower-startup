import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, Building2, Store, Users } from "lucide-react"
import { solutions } from "@/lib/content/marketing"
import { CtaBand, Pill, Section, SectionHeader } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Solutions — Bower",
  description: "Bower for solo landlords, property agencies and commercial operators.",
}

const icons = [Building2, Users, Store]

export default function SolutionsHub() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-14 pt-14 sm:pt-20 lg:pb-20">
          <Pill>Solutions</Pill>
          <h1 className="mt-6 max-w-[18ch] text-[40px] font-semibold leading-[1.0] tracking-[-0.045em] sm:text-[56px]">
            Built for the way you actually work.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-[16px]">
            Three portfolio shapes, one workspace. Each page describes what the product does for that
            operator today — not what we hope to build later.
          </p>
        </div>
      </section>

      <Section>
        <div className="grid gap-3 md:grid-cols-3">
          {solutions.map((solution, index) => {
            const Icon = icons[index] ?? Building2
            return (
              <Link
                key={solution.slug}
                href={`/solutions/${solution.slug}`}
                className="group flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary/30"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                  <Icon className="size-[19px]" strokeWidth={1.9} />
                </span>
                <p className="mt-5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {solution.audience}
                </p>
                <h2 className="mt-2 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
                  {solution.name}
                </h2>
                <p className="mt-1 text-[12.5px] font-medium text-primary">{solution.tagline}</p>
                <p className="mt-3 flex-1 text-[13px] leading-6 text-muted-foreground">{solution.summary}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary">
                  Read the detail <ArrowUpRight className="size-3.5" />
                </span>
              </Link>
            )
          })}
        </div>
      </Section>

      <Section muted bordered>
        <SectionHeader
          eyebrow="Same product"
          title="No tier decides which features you get."
          intro="Every workspace has the full set of workflows. The difference between operators is the size of the portfolio, not the plan."
          action={{ label: "See what is included", href: "/features" }}
        />
      </Section>

      <CtaBand
        title="Not sure where you fit?"
        body="Tell us how your portfolio is structured and we will tell you honestly whether Bower is a good fit today."
        primary={{ label: "Talk to the team", href: "/contact" }}
        secondary={{ label: "Start free", href: "/auth/sign-up" }}
      />
    </>
  )
}
