import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Mail } from "lucide-react"
import { BRAND } from "@/lib/brand"
import { CtaBand, Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Careers — Bower",
  description: "How we work at Bower, and how to get in touch for future roles.",
}

const principles = [
  {
    title: "Small on purpose",
    body: "A tight team with real ownership of a surface. Fewer people, more context, less coordination overhead.",
  },
  {
    title: "Close to the portfolio",
    body: "Every product decision is tested against a real landlord's week. Opinions are cheap; a reconciliation evening is not.",
  },
  {
    title: "Written by default",
    body: "Decisions live in writing so work does not depend on who was in the room. Async is the default, not a perk.",
  },
  {
    title: "Ship honestly",
    body: "We do not announce features before they work. That applies to our marketing as much as our code.",
  },
]

export default function CareersPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Careers</Pill>
          <h1 className="mt-6 max-w-[18ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            No open roles right now.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            We are a small team and we hire deliberately. If you work on property, payments or
            operations in East Africa and want to be considered when that changes, write to us.
          </p>
          <a
            href={`mailto:${BRAND.supportEmail}?subject=Future%20role%20at%20Bower%20Africa`}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Mail className="size-4" /> Introduce yourself
          </a>
        </div>
      </section>

      <Section>
        <p className="eyebrow">How we work</p>
        <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
          The parts that would matter on day one.
        </h2>
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/70 sm:grid-cols-2">
          {principles.map((principle) => (
            <article key={principle.title} className="bg-card p-6">
              <h3 className="text-[15px] font-semibold text-foreground">{principle.title}</h3>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{principle.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-[12.5px] text-muted-foreground">
          Current team and product context:{" "}
          <Link href="/about" className="font-medium text-foreground underline decoration-border underline-offset-4">
            about Bower
          </Link>
          <span className="mx-2 text-border">·</span>
          <Link href="/changelog" className="font-medium text-foreground underline decoration-border underline-offset-4">
            what we shipped recently
          </Link>
        </p>
      </Section>

      <CtaBand
        title="Not looking for a job — just a better workspace?"
        body="Start a trial, or tell us what would make your week easier."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "Contact us", href: "/contact" }}
      />
    </>
  )
}
