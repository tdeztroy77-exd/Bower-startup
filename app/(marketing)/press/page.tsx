import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, Download } from "lucide-react"
import { BRAND } from "@/lib/brand"
import { Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Press & brand — Bower",
  description: "Brand assets, product facts and press contact for Bower.",
}

const assets = [
  { name: "Logo mark (SVG)", detail: "Vector, forest tile", href: "/icon.svg", download: true },
  { name: "App icon (PNG)", detail: "32 × 32", href: "/icon-light-32x32.png", download: true },
  { name: "Brand guidelines", detail: "Colour, type and usage rules", href: "/press/brand-guidelines.txt", download: true },
  { name: "Company fact sheet", detail: "What the product does, in one page", href: "/press/company-fact-sheet.txt", download: true },
  { name: "Document templates", detail: "Lease, receipt and inspection formats", href: "/templates", download: false },
]

const facts = [
  ["Product", "Property operations workspace for landlords and agencies"],
  ["Based", "Nairobi, Kenya"],
  ["Payment rails", "M-Pesa (Safaricom Daraja) and card via Stripe"],
  ["Pricing", "One plan, KES 2,490 per month, 14-day trial"],
]

export default function PressPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Press</Pill>
          <h1 className="mt-6 max-w-[18ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            Press &amp; brand assets.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            Everything needed to describe or reference Bower accurately. For interviews or
            comment, email{" "}
            <a href={`mailto:${BRAND.supportEmail}`} className="font-medium text-foreground underline decoration-border underline-offset-4">
              {BRAND.supportEmail}
            </a>
            .
          </p>
        </div>
      </section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <p className="eyebrow">Boilerplate</p>
            <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
              About Bower
            </h2>
            <p className="mt-4 text-[13.5px] leading-7 text-muted-foreground">
              Bower is a property operations workspace for landlords and property agencies in
              Africa. It brings rent collection, tenants and leases, maintenance, documents and reporting
              into one place, built around M-Pesa rather than bolted onto it.
            </p>
            <dl className="mt-6 divide-y divide-border/70 border-y border-border/70">
              {facts.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-6 py-3">
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
                  <dd className="max-w-[60%] text-right text-[12.5px] font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <p className="eyebrow">Assets</p>
            <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
              Downloads
            </h2>
            <ul className="mt-5 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
              {assets.map((asset) => (
                <li key={asset.name}>
                  <Link
                    href={asset.href}
                    download={asset.download || undefined}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
                  >
                    <span>
                      <span className="block text-[13px] font-semibold text-foreground">{asset.name}</span>
                      <span className="block text-[11.5px] text-muted-foreground">{asset.detail}</span>
                    </span>
                    {asset.download ? (
                      <Download className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11.5px] leading-5 text-muted-foreground">
              Please do not recolour the mark or place it on a low-contrast background. The guidelines
              file covers the palette and clear space.
            </p>
          </div>
        </div>
      </Section>
    </>
  )
}
