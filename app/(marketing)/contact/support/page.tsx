import type { Metadata } from "next"
import Link from "next/link"
import { BookOpen, Mail, MessageSquare } from "lucide-react"
import { ContactForm } from "@/components/contact-form"
import { BRAND } from "@/lib/brand"
import { Pill } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Support — Bower",
  description: "Get help with your Bower workspace by email, or read the help centre first.",
}

const routes = [
  {
    icon: BookOpen,
    title: "Read the help centre",
    body: "Setup, payments, billing and data questions answered without a ticket.",
    href: "/help",
    cta: "Open help centre",
  },
  {
    icon: MessageSquare,
    title: "In-app notifications",
    body: "Rent, work orders and lease alerts all appear in the bell inside your workspace.",
    href: "/dashboard",
    cta: "Open workspace",
  },
  {
    icon: Mail,
    title: "Email a person",
    body: "Include the property or tenant name so we can look at the actual record.",
    href: `mailto:${BRAND.supportEmail}`,
    cta: BRAND.supportEmail,
  },
]

export default function ContactSupportPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Support</Pill>
          <h1 className="mt-6 max-w-[20ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[50px]">
            Let’s look at the actual record.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            The fastest support is specific: the property, the tenant and what you expected to happen.
          </p>
        </div>
      </section>

      <section className="container-x grid gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="space-y-3">
          {routes.map((route) => (
            <Link
              key={route.title}
              href={route.href}
              className="flex items-start gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary/30"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <route.icon className="size-4" strokeWidth={1.9} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-foreground">{route.title}</span>
                <span className="mt-0.5 block text-[12px] leading-5 text-muted-foreground">{route.body}</span>
                <span className="mt-2 block text-[12px] font-semibold text-primary">{route.cta} →</span>
              </span>
            </Link>
          ))}
          <p className="pt-2 text-[11.5px] leading-5 text-muted-foreground">
            Phone support is available on {BRAND.supportPhone}, Monday to Friday, 9am–5pm EAT.
          </p>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card sm:p-8">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">Describe the issue</h2>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            This opens your email app with the details ready to send.
          </p>
          <ContactForm />
        </div>
      </section>
    </>
  )
}
