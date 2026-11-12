import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Handshake, Quote } from "lucide-react"
import { CtaBand, CheckList, Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Design partners — Bower",
  description:
    "We publish case studies only with written permission and real measurements. Here is how to become a design partner.",
}

export default function CustomersPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Design partners</Pill>
          <h1 className="mt-6 max-w-[20ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            No invented case studies.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            Every number a property business publishes about a customer should be traceable to a real
            portfolio and a person who agreed to it. Until we have those, this page stays honest and
            short.
          </p>
        </div>
      </section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
              Become a design partner.
            </h2>
            <p className="mt-4 max-w-md text-[14px] leading-7 text-muted-foreground">
              A small group of landlords and agencies work with us directly. You get close access to the
              team and influence over what ships next; we get the truth about how the product behaves on
              a real portfolio.
            </p>
            <CheckList
              className="mt-6"
              items={[
                "Direct line to the people building the product",
                "Your workflow shapes the roadmap, not a survey",
                "Full access during the trial and a clear, flat price after",
                "No obligation to be quoted or named publicly",
              ]}
            />
            <Link
              href="/contact"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Ask about partnering <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card sm:p-8">
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
              <Quote className="size-[18px]" />
            </span>
            <p className="mt-5 text-[15px] leading-7 text-foreground">
              “We would rather show you the product than someone else’s quote. If a landlord tells us
              something useful, we ask before repeating it — and we only publish a number when we can
              show how it was measured.”
            </p>
            <p className="mt-4 text-[12px] text-muted-foreground">
              The Bower team · Nairobi
            </p>
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-muted/50 p-4">
              <Handshake className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-[12px] leading-5 text-muted-foreground">
                When we do publish a case study it will name the portfolio, the period and the
                measurement — with written permission on file.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <CtaBand
        title="Judge it on your own portfolio."
        body="Start a trial, add three real properties, and see whether the workspace earns its place in your week."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "Talk to the team", href: "/contact" }}
      />
    </>
  )
}
