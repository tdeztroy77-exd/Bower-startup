import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BellOff, Check, ShieldCheck, Smartphone, Wifi } from "lucide-react"
import { CtaBand, Pill, Section } from "@/components/marketing/blocks"
import { DashboardPreview } from "@/components/marketing/product-preview"

export const metadata: Metadata = {
  title: "On your phone — Bower",
  description: "Bower runs in the browser on your phone. Here is what that means in practice.",
}

const facts = [
  {
    icon: Smartphone,
    title: "No app store",
    body: "The workspace is a responsive web app. Sign in from any phone, tablet or laptop with the same account.",
  },
  {
    icon: Wifi,
    title: "Works on mobile data",
    body: "Pages are server-rendered and light. There is no offline queue yet, so a lost connection means retrying the action.",
  },
  {
    icon: BellOff,
    title: "No push notifications",
    body: "We do not send push notifications today. Rent and maintenance alerts appear in the in-app notification list and by email where configured.",
  },
  {
    icon: ShieldCheck,
    title: "Same access rules",
    body: "Signing in on a phone gives exactly the same account-scoped access as the desktop — no separate mobile permissions.",
  },
]

export default function AppPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x grid items-center gap-10 pb-14 pt-14 sm:pt-20 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <Pill>On your phone</Pill>
            <h1 className="mt-6 max-w-[18ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
              The same workspace, in your pocket.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
              Bower is a web app, not a native download. That keeps it fast to update and
              honest about what it does — as long as we are clear about what a browser can and cannot do.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link
                href="/auth/sign-up"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Start free <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/help"
                className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-[13px] font-semibold text-foreground hover:border-pine/30 hover:text-pine"
              >
                Read the help centre
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <DashboardPreview />
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/70 sm:grid-cols-2">
          {facts.map((fact) => (
            <article key={fact.title} className="bg-card p-6">
              <fact.icon className="size-[18px] text-pine" strokeWidth={1.9} />
              <h2 className="mt-4 text-[14.5px] font-semibold text-foreground">{fact.title}</h2>
              <p className="mt-1.5 text-[12.5px] leading-6 text-muted-foreground">{fact.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-pine/15 bg-secondary p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-secondary-foreground">
            <Check className="size-4 text-pine" strokeWidth={2.6} /> Adding it to your home screen
          </p>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-6 text-secondary-foreground/70">
            On Android Chrome, use the menu and choose “Add to Home screen”. On iOS Safari, use Share then
            “Add to Home Screen”. If your browser does not offer it, bookmark the workspace instead — the
            experience is the same web app either way.
          </p>
        </div>
      </Section>

      <CtaBand
        title="Try it on the device you already have."
        body="No download, no permissions to grant. Sign in and use it."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "See features", href: "/features" }}
      />
    </>
  )
}
