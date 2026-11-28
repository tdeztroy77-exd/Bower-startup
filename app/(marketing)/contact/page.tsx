import type { Metadata } from "next"
import Link from "next/link"
import { Mail, MapPin, MessageSquare, Phone } from "lucide-react"
import { ContactForm } from "@/components/contact-form"
import { BRAND } from "@/lib/brand"
import { Pill } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Contact — Bower",
  description: "Talk to the team behind Bower about pricing, a walkthrough, or your portfolio setup.",
}

const channels = [
  {
    icon: Mail,
    label: "Email",
    value: BRAND.supportEmail,
    href: `mailto:${BRAND.supportEmail}`,
    note: "The fastest route. Every message is read by a person, not a queue.",
  },
  {
    icon: MessageSquare,
    label: "Existing customers",
    value: "In-app support",
    href: "/help",
    note: "Start from the help centre so we can see the workspace you are asking about.",
  },
  {
    icon: Phone,
    label: "Phone",
    value: BRAND.supportPhone,
    href: BRAND.supportPhoneHref,
    note: "Mon–Fri, 9am–5pm EAT.",
  },
  {
    icon: MapPin,
    label: "Based in",
    value: "Nairobi, Kenya",
    href: null,
    note: "Remote-first team; visits by appointment.",
  },
]

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pb-16 sm:pt-20">
          <div className="max-w-2xl">
            <Pill>Contact</Pill>
            <h1 className="mt-6 text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] text-foreground sm:text-[54px]">
              Talk to a person, not a bot.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-[16px]">
              Questions about pricing, a walkthrough for your team, or whether Bower fits how you
              already work — ask directly.
            </p>
          </div>
        </div>
      </section>

      <section className="container-x grid gap-10 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-16">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Other ways to reach us
          </h2>
          <ul className="mt-5 divide-y divide-border/70 border-y border-border/70">
            {channels.map((channel) => (
              <li key={channel.label} className="flex items-start gap-3.5 py-4">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-pine">
                  <channel.icon className="size-4" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {channel.label}
                  </p>
                  {channel.href ? (
                    <Link href={channel.href} className="mt-1 block text-[13.5px] font-semibold text-foreground hover:text-pine">
                      {channel.value}
                    </Link>
                  ) : (
                    <p className="mt-1 text-[13.5px] font-semibold text-foreground">{channel.value}</p>
                  )}
                  <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{channel.note}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl border border-border/80 bg-secondary/50 p-5">
            <p className="text-[12.5px] font-semibold text-secondary-foreground">Prefer to just look around?</p>
            <p className="mt-1.5 text-[12px] leading-6 text-secondary-foreground/70">
              Start a trial and explore the product on your own portfolio. No card required.
            </p>
            <Link href="/auth/sign-up" className="mt-3 inline-flex text-[12.5px] font-semibold text-pine hover:underline">
              Start free →
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card sm:p-8">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">Send a message</h2>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            We use this to route your question to the right person.
          </p>
          <ContactForm />
          <p className="mt-5 text-[11px] leading-5 text-muted-foreground">
            By sending a message you agree to our{" "}
            <Link href="/legal/privacy" className="underline decoration-border underline-offset-2 hover:text-foreground">
              privacy policy
            </Link>
            . We do not sell or share your details.
          </p>
        </div>
      </section>
    </>
  )
}
