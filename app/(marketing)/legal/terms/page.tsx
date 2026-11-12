import type { Metadata } from "next"
import Link from "next/link"
import { Pill } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Terms of service — Bower",
  description: "The terms and conditions for using Bower.",
}

const legalLink =
  "font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary"

const sections = [
  {
    id: "your-account",
    title: "Terms of service — Bower",
    body: (
      <p>
        You're responsible for keeping your credentials secure and for activity that happens under your
        account. Use a unique password and turn on two-factor authentication when we offer it.
      </p>
    ),
  },
  {
    id: "acceptable-use",
    title: "Terms of service — Bower",
    body: (
      <>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Use Bower to harass tenants or third parties.</li>
          <li>Upload content that is illegal in your jurisdiction.</li>
          <li>Attempt to access data belonging to other landlords.</li>
          <li>Reverse engineer, resell or white-label the service without written permission.</li>
        </ul>
      </>
    ),
  },
  {
    id: "billing",
    title: "Terms of service — Bower",
    body: (
      <p>
        Paid plans are billed monthly or annually in advance. You can cancel at any time and keep access
        through the end of your billing period. We don't charge setup, cancellation or per-transaction fees
        on rent.
      </p>
    ),
  },
  {
    id: "data-ownership",
    title: "Terms of service — Bower",
    body: (
      <p>
        You own the data you put into Bower. We act as a data processor on your behalf and will
        never sell, rent, or share it for advertising.
      </p>
    ),
  },
  {
    id: "service-availability",
    title: "Terms of service — Bower",
    body: (
      <p>
        The service is provided "as is". We will communicate planned maintenance through the dashboard and
        your registered email when practical.
      </p>
    ),
  },
  {
    id: "limitation-of-liability",
    title: "Terms of service — Bower",
    body: (
      <p>
        To the maximum extent permitted by law, our total liability for any claim arising from your use of
        Bower is limited to the amount you paid us in the 12 months preceding the claim. We are
        not liable for indirect or consequential damages.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Terms of service — Bower",
    body: (
      <p>
        You can delete your account at any time from Settings. We may suspend or terminate accounts that
        violate these terms. Where possible, we'll warn you first.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Terms of service — Bower",
    body: (
      <p>
        These terms are governed by the laws of the Republic of Kenya. Disputes will be resolved in the
        courts of Nairobi.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Terms of service — Bower",
    body: (
      <p>
        Questions about these terms? Write to{" "}
        <Link href="mailto:bknglabs.dev@gmail.com" className={legalLink}>
          bknglabs.dev@gmail.com
        </Link>
        .
      </p>
    ),
  },
]

export default function TermsPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-12 sm:pt-16 lg:pb-16 lg:pt-20">
          <Pill>Legal</Pill>
          <h1 className="mt-6 max-w-[18ch] text-[38px] font-semibold leading-[1.02] tracking-[-0.045em] text-foreground sm:text-[52px]">
            Terms of service
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            The terms that govern your use of Bower, in plain language.
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
                      className="-ml-px block border-l border-transparent pl-4 text-[12.5px] leading-5 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
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
              These terms govern your use of Bower, operated by Bower ("we", "us"). By
              creating an account you agree to them. If you don't agree, please don't use the service.
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
                <Link href="/legal/privacy" className={legalLink}>Privacy policy</Link>
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
