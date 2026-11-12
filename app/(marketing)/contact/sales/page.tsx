import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Building2, Check, Mail } from "lucide-react"
import { MarketingSalesForm } from "@/components/marketing-sales-form"
import { BRAND } from "@/lib/brand"
import { Pill } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Contact sales — Bower",
  description: "Talk to the team about a larger portfolio, procurement or a walkthrough.",
}

export default function ContactSalesPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Sales</Pill>
          <h1 className="mt-6 max-w-[20ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[50px]">
            A walkthrough on your portfolio.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            Same product, same price. If you need a purchase order, a DPA or a walkthrough for a larger
            team, this is the route.
          </p>
        </div>
      </section>

      <section className="container-x grid gap-10 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            What to expect
          </h2>
          <ul className="mt-5 space-y-4">
            {[
              { title: "A 20-minute call, no slides", body: "We look at your current setup and where the time actually goes." },
              { title: "A straight answer on fit", body: "If Bower is not a good fit for your portfolio, we will say so." },
              { title: "Procurement support", body: "DPA, invoice and security answers in writing if your process needs them." },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                  <Check className="size-3" strokeWidth={2.8} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-7 rounded-2xl border border-border/80 bg-card p-4 shadow-card">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
              <Mail className="size-3.5 text-primary" /> Prefer email?
            </p>
            <a href={`mailto:${BRAND.supportEmail}`} className="mt-1 block text-[12px] text-muted-foreground hover:text-primary">
              {BRAND.supportEmail}
            </a>
            <a href={BRAND.supportPhoneHref} className="block text-[12px] text-muted-foreground hover:text-primary">
              {BRAND.supportPhone}
            </a>
          </div>
          <p className="mt-5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Building2 className="size-3.5" /> Just want to try it?{" "}
            <Link href="/auth/sign-up" className="font-semibold text-primary hover:underline">
              Start free
            </Link>
          </p>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card sm:p-8">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">Tell us about the portfolio</h2>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">We will reply from a real inbox.</p>
          <MarketingSalesForm />
        </div>
      </section>

      <section className="border-t border-border/70">
        <div className="container-x flex flex-col items-start justify-between gap-3 py-8 sm:flex-row sm:items-center">
          <p className="text-[13px] text-muted-foreground">Looking for product help instead?</p>
          <Link href="/help" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
            Help centre <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>
    </>
  )
}
