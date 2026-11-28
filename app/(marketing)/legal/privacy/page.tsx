import type { Metadata } from "next"
import Link from "next/link"
import { Pill } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Privacy policy — Bower",
  description: "How Bower collects, uses and protects your data.",
}

const legalLink =
  "font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-pine"

const sections = [
  {
    id: "what-we-collect",
    title: "Privacy policy — Bower",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong className="font-semibold text-foreground">Account data</strong> — your name, email,
          phone and any profile details you add.
        </li>
        <li>
          <strong className="font-semibold text-foreground">Property data</strong> — properties, tenants,
          leases, payments, expenses, documents you upload.
        </li>
        <li>
          <strong className="font-semibold text-foreground">Usage data</strong> — pages visited, actions
          taken, device and browser metadata.
        </li>
        <li>
          <strong className="font-semibold text-foreground">Payment metadata</strong> — M-Pesa
          transaction IDs, amounts, timestamps. We never see your M-Pesa PIN.
        </li>
      </ul>
    ),
  },
  {
    id: "why-we-collect-it",
    title: "Privacy policy — Bower",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>To provide the Bower product and sync your data across devices.</li>
        <li>To process rent and expense transactions on your behalf.</li>
        <li>To send important service notifications (rent received, lease expiring, etc.).</li>
        <li>To improve the product and prevent abuse.</li>
      </ul>
    ),
  },
  {
    id: "where-its-stored",
    title: "Privacy policy — Bower",
    body: (
      <p>
        Your data is stored in our Supabase (PostgreSQL) project, hosted on AWS. Backups are encrypted at
        rest and in transit. We use Supabase's row-level security to ensure that one landlord can never
        see another landlord's data.
      </p>
    ),
  },
  {
    id: "who-we-share-it-with",
    title: "Privacy policy — Bower",
    body: (
      <>
        <p>We never sell your data. We share it only with:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-foreground">Safaricom Daraja</strong> — to process
            M-Pesa payments you initiate.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Supabase / AWS</strong> — to host the
            database.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Resend / SendGrid</strong> — to deliver
            transactional emails.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Vercel</strong> — to host the web
            application.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Privacy policy — Bower",
    body: (
      <p>
        You can export, correct or delete your data at any time from{" "}
        <Link href="/dashboard/settings" className={legalLink}>
          Settings → Data
        </Link>
        . You can also email{" "}
        <Link href="mailto:bknglabs.dev@gmail.com" className={legalLink}>
          bknglabs.dev@gmail.com
        </Link>{" "}
        and we will respond within 7 business days.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Privacy policy — Bower",
    body: (
      <p>
        We use essential cookies for authentication and a small set of analytics cookies to understand how
        the product is used. No third-party advertising cookies — ever.
      </p>
    ),
  },
  {
    id: "changes-to-this-policy",
    title: "Privacy policy — Bower",
    body: (
      <p>
        If we make material changes, we'll email every active account and show a banner in the dashboard at
        least 30 days before the changes take effect.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-12 sm:pt-16 lg:pb-16 lg:pt-20">
          <Pill>Legal</Pill>
          <h1 className="mt-6 max-w-[18ch] text-[38px] font-semibold leading-[1.02] tracking-[-0.045em] text-foreground sm:text-[52px]">
            Privacy policy
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            What we collect, why we collect it, and what choices you have.
          </p>
          <p className="mt-4 text-[12px] text-muted-foreground">Last updated: 1 October 2026</p>
        </div>
      </section>

      <div className="container-x py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                On this page
              </p>
              <ul className="mt-4 space-y-2.5 border-l border-border/70">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="-ml-px block border-l border-transparent pl-4 text-[12.5px] leading-5 text-muted-foreground transition-colors hover:border-pine hover:text-foreground"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <article className="max-w-3xl">
            <p className="text-[13.5px] leading-7 text-muted-foreground">
              Bower is operated by Bower ("we", "us", "our"). This policy explains what
              data we collect, why we collect it, and what choices you have. We've written it in plain
              language on purpose — if anything is unclear, write to us at{" "}
              <Link href="mailto:bknglabs.dev@gmail.com" className={legalLink}>
                bknglabs.dev@gmail.com
              </Link>
              .
            </p>

            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="mt-10 scroll-mt-24 border-t border-border/70 pt-10"
              >
                <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-foreground">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-4 text-[13.5px] leading-7 text-muted-foreground">
                  {section.body}
                </div>
              </section>
            ))}

            <div className="mt-10 border-t border-border/70 pt-8">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Other policies
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px]">
                <Link href="/legal/terms" className={legalLink}>Terms of service</Link>
                <Link href="/legal/cookies" className={legalLink}>Cookie policy</Link>
                <Link href="/legal/dpa" className={legalLink}>Data Processing Agreement</Link>
                <Link href="/legal/acceptable-use" className={legalLink}>Acceptable use</Link>
                <Link href="/sub-processors" className={legalLink}>Sub-processors</Link>
              </div>
            </div>
          </article>
        </div>
      </div>
    </>
  )
}
