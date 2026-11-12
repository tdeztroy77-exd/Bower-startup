import type { Metadata } from "next"
import Link from "next/link"
import { BRAND } from "@/lib/brand"
import { Pill } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Acceptable use — Bower",
  description: "The rules for using Bower, and how abuse is handled.",
}

const numbered = [
  {
    title: "1. You must not use Bower to",
    body: (
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>Harass, threaten or impersonate tenants, landlords or staff.</li>
        <li>Store or transmit unlawful content in any jurisdiction.</li>
        <li>Attempt to access data belonging to another account.</li>
        <li>Reverse-engineer, resell or white-label the service without written permission.</li>
        <li>Probe, scan or attempt to bypass access controls and rate limits.</li>
      </ul>
    ),
  },
  {
    title: "2. Tenant data is your responsibility",
    body: (
      <p>
        You are the controller of your tenants’ personal data; Bower processes it on your
        instructions. Collect only what you need, keep it accurate, and honour requests from your
        tenants. See the{" "}
        <Link href="/legal/dpa" className="font-medium text-foreground underline decoration-border underline-offset-4">
          data processing agreement
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="font-medium text-foreground underline decoration-border underline-offset-4">
          privacy policy
        </Link>
        .
      </p>
    ),
  },
  {
    title: "3. Reporting abuse",
    body: (
      <p>
        If you believe another account is violating these rules, email{" "}
        <a href={`mailto:${BRAND.supportEmail}`} className="font-medium text-foreground underline decoration-border underline-offset-4">
          {BRAND.supportEmail}
        </a>
        . We review every report and will tell you what we can.
      </p>
    ),
  },
  {
    title: "4. Enforcement",
    body: (
      <p>
        We may suspend or terminate an account that violates these rules. Where the issue is
        fixable and not urgent, we will tell you what to change first.
      </p>
    ),
  },
]

export default function AcceptableUsePage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-10 pt-14 sm:pt-16">
          <Pill>Legal</Pill>
          <h1 className="mt-5 text-[36px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[46px]">
            Acceptable use policy
          </h1>
          <p className="mt-3 text-[12.5px] text-muted-foreground">Last updated 10 November 2026</p>
        </div>
      </section>

      <div className="container-x max-w-3xl py-12">
        <p className="text-[14px] leading-7 text-muted-foreground">
          These rules keep the workspace safe for everyone using it. By using Bower you agree
          to them. If anything here is unclear, ask before assuming.
        </p>

        <div className="mt-10 space-y-9">
          {numbered.map((section) => (
            <section key={section.title}>
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">{section.title}</h2>
              <div className="mt-2.5 text-[13.5px] leading-7 text-muted-foreground">{section.body}</div>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
