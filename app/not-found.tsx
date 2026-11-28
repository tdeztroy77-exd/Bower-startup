import Link from "next/link"
import { ArrowRight, Compass } from "lucide-react"
import { MarketingHeader, MarketingFooter } from "@/components/marketing-site"

const links = [
  { label: "Home", href: "/", description: "What Bower is" },
  { label: "Features", href: "/features", description: "Every workflow in the product" },
  { label: "Pricing", href: "/pricing", description: "One plan, one price" },
  { label: "Help centre", href: "/help", description: "Answers to common questions" },
]

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main className="container-x py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">Error 404</p>
          <h1 className="mt-4 text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[54px]">
            That page is not here.
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground">
            It may have moved or never existed. If a link on this site led you here, tell us and we will
            fix it.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Go home <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-[13px] font-semibold text-foreground hover:border-pine/30 hover:text-pine"
            >
              Report a broken link
            </Link>
          </div>
        </div>

        <div className="mt-14 border-t border-border/70 pt-8">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Compass className="size-3.5" /> Popular destinations
          </p>
          <div className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/70 sm:grid-cols-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="bg-card p-4 transition-colors hover:bg-secondary/40">
                <p className="text-[13px] font-semibold text-foreground">{link.label}</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">{link.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  )
}
