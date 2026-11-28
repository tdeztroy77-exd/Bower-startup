import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, Database, Eye, FileCheck2, KeyRound, Lock, Mail } from "lucide-react"
import { BRAND } from "@/lib/brand"
import { CtaBand, Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Security — Bower",
  description:
    "How Bower separates accounts, protects sensitive fields and stores documents — stated plainly, without certifications we do not hold.",
}

const principles = [
  {
    icon: KeyRound,
    title: "Accounts are separated at the query",
    body: "Every record carries the account that owns it, and every read or write is scoped to the signed-in account. Ownership is enforced in the application and by row-level policies on the database.",
  },
  {
    icon: Lock,
    title: "Sensitive fields are encrypted",
    body: "Identity and contact fields are encrypted before they are written. Blind-index columns allow exact-match lookups without storing the plaintext value.",
  },
  {
    icon: Eye,
    title: "Documents are private by default",
    body: "Uploaded documents live in a private store. Opening one mints a short-lived signed link; there is no permanent public URL to leak.",
  },
  {
    icon: Database,
    title: "You can take your data with you",
    body: "Settings includes a JSON or CSV export of your workspace. Backups you create are downloadable files you control.",
  },
  {
    icon: FileCheck2,
    title: "Transport is locked down",
    body: "The app is served over HTTPS with HSTS, a strict referrer policy and no-sniff headers. Third-party embeds are limited to what the product needs.",
  },
  {
    icon: Mail,
    title: "A direct line for security reports",
    body: "Report a vulnerability to the address below with enough detail to reproduce it. We will confirm receipt and tell you what we are doing about it.",
  },
]

const limits = [
  ["Certifications", "We do not hold SOC 2, ISO 27001 or a PCI attestation. Do not treat this page as one."],
  ["Uptime target", "We do not publish an SLA figure we cannot measure. Availability is monitored and incidents are reported on the status page."],
  ["Sub-processors", "Current providers and what they handle are listed on the sub-processors page."],
  ["Data location", "Data is stored with our infrastructure provider. If your procurement requires a specific region, ask before signing up."],
]

export default function SecurityPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Security</Pill>
          <h1 className="mt-6 max-w-[18ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            What we protect, and how.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            A portfolio contains identity documents, leases and money. This page describes the controls
            that exist today — and is explicit about the ones we do not have.
          </p>
        </div>
      </section>

      <Section>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/70 sm:grid-cols-2 lg:grid-cols-3">
          {principles.map((principle) => (
            <article key={principle.title} className="bg-card p-6">
              <principle.icon className="size-[18px] text-pine" strokeWidth={1.9} />
              <h2 className="mt-5 text-[14.5px] font-semibold text-foreground">{principle.title}</h2>
              <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">{principle.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section muted bordered>
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
          <div>
            <p className="eyebrow">The honest limits</p>
            <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
              What this page does not claim.
            </h2>
            <p className="mt-4 max-w-sm text-[13.5px] leading-7 text-muted-foreground">
              Security pages are often the least honest page on a website. We would rather be useful to
              your procurement review than impressive at a glance.
            </p>
          </div>
          <dl className="divide-y divide-border/70 border-y border-border/70">
            {limits.map(([label, detail]) => (
              <div key={label} className="py-4">
                <dt className="text-[13px] font-semibold text-foreground">{label}</dt>
                <dd className="mt-1 text-[12.5px] leading-6 text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section>
        <div className="flex flex-col gap-6 rounded-3xl border border-border/80 bg-card p-6 shadow-card sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">Responsible disclosure</p>
            <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.02em] text-foreground">
              Found something? Tell us before telling the internet.
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
              Include the affected page, the steps to reproduce and the impact you believe it has. We
              will confirm receipt, keep you updated, and credit you if you want to be named.
            </p>
          </div>
          <a
            href={`mailto:${BRAND.supportEmail}?subject=Security%20report`}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {BRAND.supportEmail} <ArrowUpRight className="size-3.5" />
          </a>
        </div>
        <p className="mt-4 text-[11.5px] text-muted-foreground">
          For how personal data is handled, read the{" "}
          <Link href="/legal/privacy" className="font-medium text-foreground underline decoration-border underline-offset-4">
            privacy policy
          </Link>{" "}
          and the{" "}
          <Link href="/legal/dpa" className="font-medium text-foreground underline decoration-border underline-offset-4">
            data processing agreement
          </Link>
          .
        </p>
      </Section>

      <CtaBand
        title="Ask the awkward questions."
        body="If your team needs a specific security answer in writing before adopting a product, send it over."
        primary={{ label: "Contact the team", href: "/contact" }}
        secondary={{ label: "Start free", href: "/auth/sign-up" }}
      />
    </>
  )
}
