import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Globe2, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react"
import { CtaBand, Pill, Section, SectionHeader } from "@/components/marketing/blocks"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: "About — Bower",
  description:
    "Why Bower exists: a calmer operating layer for landlords and property teams who are tired of running a portfolio from spreadsheets and chat threads.",
}

const principles = [
  {
    icon: ShieldCheck,
    eyebrow: "Trust by default",
    title: "Your portfolio data belongs to you.",
    body: "Access is scoped to your account, sensitive records are encrypted at the field level, and every export or deletion is something you initiate — never something we do quietly.",
  },
  {
    icon: Sparkles,
    eyebrow: "Calm by design",
    title: "Software should lower the temperature.",
    body: "One clear number per decision. Fewer screens, less jargon, no dashboards that only look busy.",
  },
  {
    icon: Globe2,
    eyebrow: "Built for this market",
    title: "Local payment habits first.",
    body: "M-Pesa is not an integration we bolted on — it is the way rent actually moves here, so the product is built around it.",
  },
  {
    icon: HeartHandshake,
    eyebrow: "Long relationships",
    title: "No dark patterns.",
    body: "One flat price, cancellation you can do yourself, and no attempt to make leaving harder than staying.",
  },
]

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-14 pt-14 sm:pt-20 lg:pb-20">
          <Pill>About</Pill>
          <h1 className="mt-6 max-w-[20ch] text-[40px] font-semibold leading-[1.0] tracking-[-0.045em] sm:text-[58px]">
            We build for the people who actually run the buildings.
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-[16.5px]">
            Bower is a small, focused product team building the operating layer we wished
            existed when managing property meant juggling spreadsheets, paybill statements and group chats.
          </p>
        </div>
      </section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeader eyebrow="Why we exist" title="Property is a business. It should run like one." />
          <div className="space-y-5 text-[14.5px] leading-7 text-muted-foreground">
            <p>
              A landlord is running an operation: rent has to arrive, repairs have to close, leases have
              to renew, and the numbers have to be defensible. Yet most portfolios are still managed with
              a notebook, a spreadsheet and memory.
            </p>
            <p>
              We started Bower to replace that with one workspace where the tenant record, the
              payment and the report are the same fact, seen from different angles.
            </p>
            <p>
              We are early. That is deliberate: we would rather ship fewer workflows that genuinely work
              than a long feature list that only demos well.
            </p>
          </div>
        </div>
      </Section>

      <Section muted bordered>
        <SectionHeader eyebrow="How we build" title="Four things we will not trade away." />
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/70 sm:grid-cols-2">
          {principles.map((principle) => (
            <article key={principle.title} className="bg-card p-6 sm:p-7">
              <principle.icon className="size-5 text-pine" strokeWidth={1.9} />
              <p className="mt-5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {principle.eyebrow}
              </p>
              <h3 className="mt-2.5 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
                {principle.title}
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{principle.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-8 rounded-3xl border border-border/80 bg-card p-6 shadow-card sm:p-8 lg:grid-cols-[1fr_0.9fr] lg:p-10">
          <div>
            <p className="eyebrow">The team</p>
            <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.03em]">{BRAND.creator}</h2>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">Founder · Product &amp; operations</p>
            <p className="mt-4 max-w-md text-[13.5px] leading-7 text-muted-foreground">
              Brian leads the operating model, the financial discipline and the day-to-day execution behind
              Bower. The product is shaped by direct conversations with landlords and agencies,
              not by a feature checklist borrowed from another market.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px]">
              <a href={`mailto:${BRAND.supportEmail}`} className="font-medium text-foreground hover:text-pine">
                {BRAND.supportEmail}
              </a>
              <a href={BRAND.supportPhoneHref} className="font-medium text-foreground hover:text-pine">
                {BRAND.supportPhone}
              </a>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3 rounded-2xl bg-secondary/70 p-5">
            <p className="text-[13px] font-semibold text-secondary-foreground">Working with us</p>
            <p className="text-[12.5px] leading-6 text-secondary-foreground/70">
              If you run a portfolio and want to shape what gets built next, we want to hear from you.
            </p>
            <Link
              href="/contact"
              className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Start a conversation <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </Section>

      <CtaBand
        title="A clearer way to run the work."
        body="Set up your portfolio in a few minutes and see the whole operation on one screen."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "See the product", href: "/features" }}
        note="14-day trial · no credit card"
      />
    </>
  )
}
