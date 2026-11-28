import type { Metadata } from "next"
import Link from "next/link"
import { LifeBuoy, Mail, MessageSquare } from "lucide-react"
import { BRAND } from "@/lib/brand"
import { CtaBand, FaqList, Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Help & FAQ — Bower",
  description: "Answers to the questions landlords ask most, plus how to reach a human.",
}

const groups = [
  {
    title: "Getting started",
    items: [
      {
        q: "How do I add my first property?",
        a: "Open Properties → Add property. One form per property covers the address, type, rent and status. Tenants can then be attached to it from the Tenants page.",
      },
      {
        q: "Can I import my existing portfolio?",
        a: "Yes. Properties, tenants and payments support CSV import with a field-mapping step and row validation before anything is written.",
      },
      {
        q: "Do I need M-Pesa to use Bower?",
        a: "No. You can record rent manually. Paybill and STK Push are optional per property and per tenant.",
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        q: "How does rent collection work?",
        a: "Tenants pay your paybill, or receive an M-Pesa STK prompt on their phone. The transaction is matched to the tenancy and posted as a payment; anything that cannot be matched waits in the reconciliation queue.",
      },
      {
        q: "What happens if a tenant ignores the prompt?",
        a: "The prompt request is logged with its result. You can send a new prompt from the tenant's record, or record the payment manually when it arrives by another channel.",
      },
      {
        q: "Do you support Airtel Money?",
        a: "Not yet. Bower currently supports M-Pesa for rent collection. We would rather not list a payment method we cannot settle reliably.",
      },
    ],
  },
  {
    title: "Billing",
    items: [
      {
        q: "How much does it cost?",
        a: "One plan at KES 2,490 per month after a 14-day trial, regardless of portfolio size. There is no commission on rent.",
      },
      {
        q: "How do I cancel?",
        a: "From Billing, choose cancel at period end. You keep access until the period you have paid for ends, and you can export your data first.",
      },
      {
        q: "Can I pay by card?",
        a: "Yes. Checkout supports an M-Pesa prompt or a card payment, and every payment produces a receipt in billing history.",
      },
    ],
  },
  {
    title: "Data & security",
    items: [
      {
        q: "Who can see my portfolio?",
        a: "Only the account that owns it. Every record is scoped to your user id at the application layer, and tenant documents are served through short-lived signed links rather than public URLs.",
      },
      {
        q: "Can I export or delete my data?",
        a: "Yes. Settings → Data exports a JSON or CSV snapshot of your workspace. Deleting records is available per record, and account deletion is handled by support so we can confirm scope first.",
      },
      {
        q: "Do you sell data or run ad trackers?",
        a: "No. The product has no advertising trackers, and your records are not shared with third parties.",
      },
    ],
  },
]

export default function HelpPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Help centre</Pill>
          <h1 className="mt-6 max-w-[18ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            Answers first. A human when you need one.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            The questions that come up most, answered without marketing language. Anything missing,
            write to us and it goes on the list.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link
              href={`mailto:${BRAND.supportEmail}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Mail className="size-4" /> Email support
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-[13px] font-semibold text-foreground hover:border-pine/30 hover:text-pine"
            >
              <MessageSquare className="size-4" /> Contact the team
            </Link>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-14">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow">On this page</p>
            <ul className="mt-4 space-y-2">
              {groups.map((group) => (
                <li key={group.title}>
                  <a
                    href={`#${group.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {group.title}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-2xl border border-border/80 bg-card p-4 shadow-card">
              <p className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
                <LifeBuoy className="size-4 text-pine" /> Still stuck?
              </p>
              <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
                Email {BRAND.supportEmail} with the property or tenant name and we will look at the
                actual record.
              </p>
            </div>
          </aside>

          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.title} id={group.title.toLowerCase().replace(/[^a-z]+/g, "-")}>
                <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">{group.title}</h2>
                <div className="mt-4">
                  <FaqList items={group.items} />
                </div>
              </section>
            ))}
          </div>
        </div>
      </Section>

      <CtaBand
        title="Prefer to see it rather than read about it?"
        body="Start a trial on your own portfolio. The product is the explanation."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
      />
    </>
  )
}
