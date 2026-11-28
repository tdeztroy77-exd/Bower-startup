"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandWordmark } from "@/components/brand-mark"
import { cn } from "@/lib/utils"
import { BRAND } from "@/lib/brand"

type NavGroup = {
  label: string
  href: string
  columns?: { heading: string; items: { label: string; href: string; description?: string }[] }[]
}

const navigation: NavGroup[] = [
  {
    label: "Product",
    href: "/features",
    columns: [
      {
        heading: "Collect & reconcile",
        items: [
          { label: "Rent collection", href: "/features/rent-collection", description: "Requests, reminders, receipts" },
          { label: "Paybill & STK", href: "/features/paybill-integration", description: "Tenants pay, you reconcile" },
          { label: "Reconciliation", href: "/features/rent-collection", description: "Match every shilling" },
        ],
      },
      {
        heading: "Run the portfolio",
        items: [
          { label: "Tenants & leases", href: "/features/tenant-records", description: "One record per tenancy" },
          { label: "Maintenance", href: "/features/maintenance", description: "Request to completion" },
          { label: "Documents", href: "/features/documents", description: "Leases, IDs, expiries" },
          { label: "Reports", href: "/features/reports", description: "Owner-ready numbers" },
        ],
      },
    ],
  },
  {
    label: "Solutions",
    href: "/solutions",
    columns: [
      {
        heading: "By portfolio",
        items: [
          { label: "Solo landlord", href: "/solutions/solo-landlord", description: "From one unit to ten" },
          { label: "Property agencies", href: "/solutions/property-agencies", description: "Multi-landlord, multi-team" },
          { label: "Commercial", href: "/solutions/commercial", description: "Office, retail, industrial" },
        ],
      },
      {
        heading: "By role",
        items: [
          { label: "Enterprise", href: "/solutions/enterprise", description: "Procurement-ready" },
          { label: "Developers", href: "/developers", description: "API & webhooks" },
          { label: "Compare", href: "/compare", description: "How we differ" },
        ],
      },
    ],
  },
  {
    label: "Resources",
    href: "/resources",
    columns: [
      {
        heading: "Learn",
        items: [
          { label: "Articles", href: "/resources", description: "Field notes" },
          { label: "Docs", href: "/docs", description: "Guides & reference" },
          { label: "Templates", href: "/templates", description: "Leases, checklists, receipts" },
          { label: "Help centre", href: "/help", description: "Answers, fast" },
        ],
      },
      {
        heading: "Company",
        items: [
          { label: "About", href: "/about", description: "Why we build this" },
          { label: "Changelog", href: "/changelog", description: "Every release" },
          { label: "Security", href: "/security", description: "How data is handled" },
          { label: "Contact", href: "/contact", description: "Talk to a human" },
        ],
      },
    ],
  },
  { label: "Pricing", href: "/pricing" },
]

function NavDropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false)

  if (!group.columns) {
    return (
      <Link
        href={group.href}
        className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        {group.label}
      </Link>
    )
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false)
      }}
    >
      <Link
        href={group.href}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(false)}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
          open ? "bg-muted/70 text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        {group.label}
        <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
      </Link>
      {open ? (
        <div className="bower-fade absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
          <div className="w-[620px] max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-popover shadow-lift">
            <div className="grid grid-cols-2 gap-1 p-2.5">
              {group.columns.map((column) => (
                <div key={column.heading} className="p-2">
                  <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                    {column.heading}
                  </p>
                  {column.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group/item block rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                    >
                      <span className="flex items-center justify-between gap-2 text-[13px] font-medium text-foreground">
                        {item.label}
                        <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-all duration-200 group-hover/item:translate-x-0 group-hover/item:opacity-100" />
                      </span>
                      {item.description ? (
                        <span className="mt-0.5 block text-[11.5px] leading-4 text-muted-foreground">{item.description}</span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border/70 bg-muted/25 px-4 py-2.5">
              <span className="text-[11px] text-muted-foreground">One workspace, from the first unit to the whole portfolio.</span>
              <Link href={group.href} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-pine hover:underline">
                Explore {group.label} <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-xl transition-colors duration-300",
        scrolled
          ? "border-border bg-background/95 shadow-[0_1px_0_rgba(21,27,23,0.04)]"
          : "border-transparent bg-background/80",
      )}
    >
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <BrandWordmark href="/" size="md" />
          <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
            {navigation.map((group) => (
              <NavDropdown key={group.label} group={group} />
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-1.5 lg:flex">
          <Link
            href="/auth/login"
            className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-pine"
          >
            Sign in
          </Link>
          <Button
            asChild
            size="sm"
            className="btn-sheen h-9 rounded-lg bg-primary px-4 text-primary-foreground shadow-glow transition-transform duration-300 ease-expo hover:-translate-y-0.5"
          >
            <Link href="/auth/sign-up">
              Start free <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
          className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted/70 lg:hidden"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="container-x space-y-1 py-4">
            {navigation.map((group) => (
              <div key={group.label}>
                <Link
                  href={group.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/60"
                >
                  {group.label}
                </Link>
                {group.columns ? (
                  <div className="mb-2 ml-3 border-l border-border pl-3">
                    {group.columns.flatMap((column) => column.items).map((item) => (
                      <Link
                        key={`${group.label}-${item.href}-${item.label}`}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-lg px-3 py-2 text-[13px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <Button asChild variant="outline" className="flex-1 rounded-lg">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild className="flex-1 rounded-lg">
                <Link href="/auth/sign-up">Start free</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}

const footerColumns = [
  {
    heading: "Platform",
    links: [
      { label: "Overview", href: "/" },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/integrations" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    heading: "Solutions",
    links: [
      { label: "Solo landlords", href: "/solutions/solo-landlord" },
      { label: "Agencies", href: "/solutions/property-agencies" },
      { label: "Commercial", href: "/solutions/commercial" },
      { label: "Enterprise", href: "/solutions/enterprise" },
      { label: "Compare", href: "/compare" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Guides", href: "/resources" },
      { label: "Templates", href: "/templates" },
      { label: "Help centre", href: "/help" },
      { label: "Status", href: "/status" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Contact", href: "/contact" },
      { label: "Brand", href: "/brand" },
    ],
  },
  {
    heading: "Trust",
    links: [
      { label: "Security", href: "/security" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "DPA", href: "/legal/dpa" },
      { label: "Sub-processors", href: "/sub-processors" },
    ],
  },
]

export function MarketingFooter() {
  return (
    <footer className="brand-sweep relative overflow-hidden">
      <div className="brand-grain pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden="true" />
      <div className="container-x relative py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(5,minmax(0,1fr))]">
          <div className="max-w-xs">
            <BrandWordmark href="/" size="md" inverse />
            <p className="mt-4 text-[13px] leading-6 text-brand-ink-muted">
              A quieter way to run rentals. Rent, tenants, leases and reporting in one calm workspace, built for landlords and agencies across Africa.
            </p>
            <div className="mt-5 space-y-1.5 text-[12.5px] text-brand-ink-muted">
              <p>
                <a
                  href={`mailto:${BRAND.supportEmail}`}
                  className="transition-colors hover:text-brand-lime"
                >
                  {BRAND.supportEmail}
                </a>
              </p>
              <p>
                <a
                  href={BRAND.supportPhoneHref}
                  className="transition-colors hover:text-brand-lime"
                >
                  {BRAND.supportPhone}
                </a>
              </p>
              <p>Nairobi, Kenya</p>
            </div>
          </div>

          {footerColumns.map((column) => (
            <div key={column.heading}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-ink-foreground">
                {column.heading}
              </p>
              <ul className="mt-3.5 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[12.5px] text-brand-ink-muted transition-colors hover:text-brand-lime"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-brand-ink-foreground/12 pt-6 text-[11.5px] text-brand-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Bower. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/legal/cookies" className="transition-colors hover:text-brand-lime">Cookies</Link>
            <Link href="/legal/acceptable-use" className="transition-colors hover:text-brand-lime">Acceptable use</Link>
            <Link href="/rss.xml" className="transition-colors hover:text-brand-lime">RSS</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

/** Kept for simple interior pages that only need a title + two paragraphs. */
export function SimpleMarketingPage({
  title,
  intro,
  sectionTitle,
  sectionBody,
}: {
  title: string
  intro: string
  sectionTitle: string
  sectionBody: string
}) {
  return (
    <div>
      <section className="border-b border-border bg-background">
        <div className="container-x pb-16 pt-16 lg:pb-20 lg:pt-24">
          <p className="eyebrow">Bower</p>
          <h1 className="mt-4 max-w-3xl text-[40px] font-semibold leading-[1.03] tracking-[-0.04em] sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-7 text-muted-foreground">{intro}</p>
        </div>
      </section>
      <section className="container-x grid gap-10 py-16 lg:grid-cols-2 lg:py-24">
        <h2 className="max-w-md text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
          {sectionTitle}
        </h2>
        <p className="max-w-xl text-[15px] leading-8 text-muted-foreground">{sectionBody}</p>
      </section>
    </div>
  )
}
