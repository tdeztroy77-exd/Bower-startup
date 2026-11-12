import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, BookOpen, Github, Mail, Rss } from "lucide-react"
import { BRAND } from "@/lib/brand"
import { CtaBand, Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Community — Bower",
  description: "Where to follow product changes, read field notes, and reach the team.",
}

const channels = [
  {
    icon: BookOpen,
    name: "Field notes",
    description: "Long-form pieces on rent operations, reconciliation and portfolio discipline.",
    href: "/resources",
    cta: "Read the articles",
  },
  {
    icon: Rss,
    name: "Changelog",
    description: "Every release, written plainly. No marketing round-ups.",
    href: "/changelog",
    cta: "See what shipped",
  },
  {
    icon: Github,
    name: "GitHub",
    description: "The product repository, issues and discussion for technical questions.",
    href: "https://github.com/Knighty7-ciper/bower",
    cta: "Open GitHub",
  },
  {
    icon: Mail,
    name: "Direct",
    description: "One inbox, read by the team building the product.",
    href: `mailto:${BRAND.supportEmail}`,
    cta: BRAND.supportEmail,
  },
]

export default function CommunityPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Community</Pill>
          <h1 className="mt-6 max-w-[18ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            Small team. Open work.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            We do not run a large community yet, and we would rather say that than invent a member count.
            These are the places where the product is discussed in public.
          </p>
        </div>
      </section>

      <Section>
        <div className="grid gap-3 sm:grid-cols-2">
          {channels.map((channel) => (
            <Link
              key={channel.name}
              href={channel.href}
              className="group rounded-2xl border border-border/80 bg-card p-5 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary/30"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                <channel.icon className="size-4" strokeWidth={1.9} />
              </span>
              <p className="mt-4 text-[14px] font-semibold text-foreground">{channel.name}</p>
              <p className="mt-1 text-[12.5px] leading-6 text-muted-foreground">{channel.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                {channel.cta} <ArrowUpRight className="size-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <CtaBand
        title="The most useful feedback is specific."
        body="Tell us the portfolio size, the workflow and where it broke. That is what actually changes the product."
        primary={{ label: "Send feedback", href: "/contact" }}
        secondary={{ label: "Read the changelog", href: "/changelog" }}
      />
    </>
  )
}
