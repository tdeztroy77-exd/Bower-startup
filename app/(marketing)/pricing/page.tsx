import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { PLANS, MONTHLY_PRICE_KES, TRIAL_DAYS, formatPrice } from "@/lib/pricing"
import { CheckList, CtaBand, FaqList, Pill, Section, SectionHeader } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Pricing — Bower",
  description:
    "One flat monthly price for the whole workspace. No percentage of rent, no per-unit tiers, no setup fee.",
}

const faqs = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. There is no contract and no claw-back. Cancel from the workspace and you keep access through the end of the period you have already paid for.",
  },
  {
    q: "Do you charge a transaction fee on M-Pesa?",
    a: "No. Bower does not take a percentage of your rent. Standard Safaricom charges for paybill and STK transactions still apply on the M-Pesa side.",
  },
  {
    q: "What happens when the trial ends?",
    a: `Your ${TRIAL_DAYS}-day trial includes the full workspace. If you choose to continue, it is ${formatPrice(MONTHLY_PRICE_KES)} per month. If you do not, the workspace pauses — your records are not deleted.`,
  },
  {
    q: "Is pricing different for agencies or larger portfolios?",
    a: "No. The plan is the same at three units or three hundred. If you need procurement paperwork, a DPA or a walkthrough for a larger team, contact us and we will handle it directly.",
  },
  {
    q: "How do I pay?",
    a: "M-Pesa or card, billed monthly from the billing page in your workspace. Every payment produces a receipt in the same place.",
  },
]

export default function PricingPage() {
  const plan = PLANS[0]

  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pb-16 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <Pill className="mx-auto">Pricing</Pill>
            <h1 className="mt-6 text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] text-foreground sm:text-[56px]">
              One plan. One price.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-[16px]">
              The whole workspace for {formatPrice(plan.price)} a month after a {TRIAL_DAYS}-day trial.
              No percentage of your rent, no per-unit tiers, no setup fee.
            </p>
          </div>
        </div>
      </section>

      <Section>
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {plan.name} — everything included
                </p>
                <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="whitespace-nowrap text-[34px] font-semibold leading-none tracking-[-0.045em] tabular sm:text-[42px]">
                    {formatPrice(plan.price)}
                  </span>
                  <span className="whitespace-nowrap text-[13px] font-medium text-muted-foreground">/ month</span>
                </p>
                <p className="mt-2 text-[13px] text-muted-foreground">{plan.tagline}</p>
              </div>
              <span className="w-fit whitespace-nowrap rounded-full bg-secondary px-2.5 py-1 text-[10.5px] font-semibold text-secondary-foreground">
                {TRIAL_DAYS} days free
              </span>
            </div>

            <div className="mt-7 divide-y divide-border/70 border-t border-border/70">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3 py-3">
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-secondary text-pine">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                  <span className="text-[13.5px] text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <Link
                href="/auth/sign-up"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Start free <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-[13.5px] font-semibold text-foreground transition-colors hover:border-pine/30 hover:text-pine"
              >
                Ask a question
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                What you never pay
              </p>
              <div className="mt-4 space-y-4">
                {[
                  { value: "0%", label: "Commission on rent" },
                  { value: "KES 0", label: "Setup or onboarding fee" },
                  { value: "KES 0", label: "Per-unit or per-tenant charge" },
                  { value: `KES ${MONTHLY_PRICE_KES.toLocaleString("en-KE")}`, label: "Same price at any portfolio size" },
                ].map((item) => (
                  <div key={item.label} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <span className="text-[13px] text-muted-foreground">{item.label}</span>
                    <span className="text-[15px] font-semibold tabular text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-pine/15 bg-secondary p-6">
              <p className="text-[13px] font-semibold text-secondary-foreground">Need a purchase order or DPA?</p>
              <p className="mt-2 text-[12.5px] leading-6 text-secondary-foreground/70">
                We can provide a data-processing agreement, invoice and security overview for procurement.
              </p>
              <Link href="/contact/sales" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-secondary-foreground hover:underline">
                Talk to sales <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <Section muted bordered>
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <SectionHeader
              eyebrow="The maths"
              title="A flat fee that does not punish growth."
              intro="Most platforms take a slice of every rent payment. Bower charges for the workspace, not for the money moving through it."
            />
            <CheckList
              className="mt-6"
              items={[
                "Add a building without renegotiating a plan",
                "Add tenants without a per-seat charge",
                "Keep your accounting clean with one monthly line item",
              ]}
            />
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
            <div className="grid grid-cols-3 border-b border-border/70 bg-muted/40 px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <span>Portfolio</span>
              <span className="text-center">Bower</span>
              <span className="text-right">% of rent model</span>
            </div>
            {[
              ["3 units", formatPrice(plan.price), "KES 3,150"],
              ["20 units", formatPrice(plan.price), "KES 21,000"],
              ["120 units", formatPrice(plan.price), "KES 126,000"],
            ].map(([size, bower, percentage]) => (
              <div key={size} className="grid grid-cols-3 items-center border-b border-border/60 px-5 py-3.5 text-[13px] last:border-0">
                <span className="font-medium text-foreground">{size}</span>
                <span className="text-center font-semibold tabular text-pine">{bower}</span>
                <span className="text-right tabular text-muted-foreground line-through decoration-border">{percentage}</span>
              </div>
            ))}
            <p className="px-5 py-3 text-[11px] leading-5 text-muted-foreground">
              Illustrative comparison assuming a 1.5% platform fee on rent. Actual fees depend on the provider.
            </p>
          </div>
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow="FAQ" title="Questions people actually ask." />
          <FaqList items={faqs} />
        </div>
      </Section>

      <CtaBand
        title="Try the whole product for two weeks."
        body="Every workflow is available from the first sign-in. No card, no sales call, no feature gate."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "Book a walkthrough", href: "/contact" }}
        note={`${TRIAL_DAYS}-day trial · cancel anytime`}
      />
    </>
  )
}
