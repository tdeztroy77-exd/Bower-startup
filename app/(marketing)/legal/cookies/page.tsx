import type { Metadata } from "next"
import Link from "next/link"
import { BRAND } from "@/lib/brand"
import { Pill } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Cookie policy — Bower",
  description: "The cookies Bower sets, why they exist, and how to change your choice.",
}

const sections = [
  {
    title: "1. Essential cookies",
    body: (
      <>
        <p>
          These keep you signed in, protect your session and remember whether you chose light or dark
          appearance. The product cannot work without them, so they are always on.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] leading-6 text-muted-foreground">
          <li>Session cookies set by the authentication layer, scoped to this domain.</li>
          <li>
            A local storage flag for the cookie-choice banner and the theme provider.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "2. No analytics or advertising cookies today",
    body: (
      <p>
        We do not ship a third-party analytics script, an advertising pixel or a session-replay tool.
        If that changes, this page will list the tool, its purpose and how to opt out before it is
        enabled — and the consent banner will ask first.
      </p>
    ),
  },
  {
    title: "3. Your choice",
    body: (
      <p>
        The consent banner offers <span className="font-medium text-foreground">essential only</span>{" "}
        or <span className="font-medium text-foreground">accept all</span>. Because there are no
        non-essential cookies at present, both options behave the same today. You can clear your
        browser storage at any time to reset the choice.
      </p>
    ),
  },
  {
    title: "4. Changes",
    body: (
      <p>
        Material changes to this policy will be noted on this page with a new date. If we add a
        non-essential cookie, the banner will ask for consent again rather than assuming it.
      </p>
    ),
  },
]

export default function CookiePolicyPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-10 pt-14 sm:pt-16">
          <Pill>Legal</Pill>
          <h1 className="mt-5 text-[36px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[46px]">
            Cookie policy
          </h1>
          <p className="mt-3 text-[12.5px] text-muted-foreground">Last updated 10 November 2026</p>
        </div>
      </section>

      <div className="container-x max-w-3xl py-12">
        <p className="text-[14px] leading-7 text-muted-foreground">
          This policy explains what Bower stores in your browser, why, and how to change it.
          We keep the list short on purpose.
        </p>

        <div className="mt-10 space-y-9">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">{section.title}</h2>
              <div className="mt-2.5 space-y-3 text-[13.5px] leading-7 text-muted-foreground">{section.body}</div>
            </section>
          ))}
        </div>

        <p className="mt-10 border-t border-border/70 pt-6 text-[12.5px] text-muted-foreground">
          Questions?{" "}
          <a href={`mailto:${BRAND.supportEmail}`} className="font-medium text-foreground underline decoration-border underline-offset-4">
            {BRAND.supportEmail}
          </a>
          . Related:{" "}
          <Link href="/legal/privacy" className="font-medium text-foreground underline decoration-border underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </>
  )
}
