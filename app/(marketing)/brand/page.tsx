import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, Download } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"

export const metadata: Metadata = {
  title: "Brand — Bower",
  description: "The Bower mark, palette, type and motion rules in one place.",
}

const palette = [
  { name: "Forest", hex: "#17624A", role: "Primary actions, active states, the mark", className: "bg-[#17624A] text-[#F7F4EC]" },
  { name: "Deep forest", hex: "#0E4030", role: "Mark gradient end, dark surfaces", className: "bg-[#0E4030] text-[#F7F4EC]" },
  { name: "Bone", hex: "#F7F4EC", role: "Page canvas — warm, never grey", className: "bg-[#F7F4EC] text-[#151B17] border border-[#E2DCCF]" },
  { name: "Clay", hex: "#B5764A", role: "The one warm accent: the full stop, the dot", className: "bg-[#B5764A] text-white" },
  { name: "Ink", hex: "#151B17", role: "Headlines and body copy", className: "bg-[#151B17] text-[#F7F4EC]" },
  { name: "Sage", hex: "#E9F0E9", role: "Quiet panels, icon tiles, selected rows", className: "bg-[#E9F0E9] text-[#1C4A39]" },
  { name: "Hairline", hex: "#E2DCCF", role: "Borders, dividers, table rules", className: "bg-[#E2DCCF] text-[#151B17]" },
]

const voice = [
  {
    title: "Say the number",
    body: "“3 payments unmatched” beats “seamless reconciliation”. A landlord should be able to act on the sentence.",
  },
  {
    title: "Name the action",
    body: "Buttons say what happens: Record payment, Send reminder, Download statement. Never “Submit” or “Continue”.",
  },
  {
    title: "Stay quiet",
    body: "No exclamation marks, no “revolutionary”, no urgency theatre. Calm is the product.",
  },
]

export default function BrandPage() {
  return (
    <>
      {/* Cover */}
      <section className="relative overflow-hidden bg-[#17624A] text-[#F7F4EC]">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <svg viewBox="0 0 1200 620" className="h-full w-full opacity-[0.18]" preserveAspectRatio="xMidYMid slice">
            <path d="M760 620V430c0-130 106-236 236-236s236 106 236 236v190" fill="none" stroke="#F7F4EC" strokeWidth="2" />
            <path d="M880 620V470c0-72 58-130 130-130s130 58 130 130v150" fill="none" stroke="#F7F4EC" strokeWidth="1.4" />
          </svg>
        </div>
        <div className="container-x relative pb-16 pt-14 sm:pb-24 sm:pt-20">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-[#F7F4EC]/65">Brand system · 2026</p>
          <div className="mt-10 flex items-center gap-5">
            <BrandMark size={92} />
            <span className="font-display text-[64px] font-medium leading-none tracking-[-0.04em] sm:text-[92px]">
              bower<span className="text-[#D9A36A]">.</span>
            </span>
          </div>
          <h1 className="mt-10 max-w-[15ch] text-[42px] font-medium leading-[0.98] tracking-[-0.025em] text-[#F7F4EC] sm:text-[64px]">
            A quieter way to run rentals.
          </h1>
          <p className="mt-6 max-w-[52ch] text-[15px] leading-7 text-[#F7F4EC]/75">
            One mark, one signal colour, one warm accent. Everything below is the system the product,
            the website and the documents are built from.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <a
              href="/brand/bower-logo.svg"
              download
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F7F4EC] px-4 text-[12.5px] font-semibold text-[#17624A] hover:bg-white"
            >
              <Download className="size-3.5" /> Full logo
            </a>
            <a
              href="/og-default.png"
              download
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#F7F4EC]/30 px-4 text-[12.5px] font-semibold text-[#F7F4EC] hover:bg-[#F7F4EC]/10"
            >
              Social card
            </a>
          </div>
        </div>
      </section>

      {/* Idea */}
      <section className="border-b border-border/70">
        <div className="container-x grid gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div className="flex items-center justify-center rounded-3xl border border-border bg-card p-10">
            <BrandMark size={200} />
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-clay">The idea</p>
            <h2 className="mt-4 max-w-[16ch] text-[36px] leading-[1.05] text-foreground sm:text-[46px]">
              A bower is a sheltered place.
            </h2>
            <p className="mt-5 max-w-[54ch] text-[14.5px] leading-7 text-muted-foreground">
              A bower is a nest, an arbour, a quiet room — somewhere safe to return to. That is what a
              well-run rental should feel like for both sides: the landlord has the picture, the tenant
              has a clear account, and nothing is shouting.
            </p>
            <p className="mt-4 max-w-[54ch] text-[14.5px] leading-7 text-muted-foreground">
              The mark is two nested arches with a clay dot: a threshold inside a threshold. It reads as
              a doorway at 16px and as a bower at 200px. The wordmark is lowercase because the brand
              should feel like a place, not a title.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {["Sheltered", "Quiet", "Yours"].map((word) => (
                <div key={word} className="rounded-xl border border-border/70 bg-card px-3 py-3 text-center">
                  <span className="font-display text-[20px] text-foreground">{word}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Logo system */}
      <section className="border-b border-border/70 bg-card/40">
        <div className="container-x py-16 lg:py-24">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-clay">Logo system</p>
          <h2 className="mt-4 max-w-[20ch] text-[34px] leading-[1.06] text-foreground sm:text-[44px]">
            One mark. Four ways to use it.
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-[#F7F4EC] p-6">
              <BrandMark size={64} />
              <div className="mt-10">
                <p className="text-[12px] font-semibold text-foreground">Mark</p>
                <p className="mt-1 text-[11px] text-muted-foreground">App icon, favicon, avatar</p>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6">
              <span className="font-display text-[38px] leading-none tracking-[-0.04em] text-foreground">
                bower<span className="text-clay">.</span>
              </span>
              <div className="mt-10">
                <p className="text-[12px] font-semibold text-foreground">Wordmark</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Editorial contexts, footer</p>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:col-span-2">
              <div className="flex items-center gap-3">
                <BrandMark size={48} />
                <span className="font-display text-[32px] leading-none tracking-[-0.04em] text-foreground">
                  bower<span className="text-clay">.</span>
                </span>
              </div>
              <div className="mt-8">
                <p className="text-[12px] font-semibold text-foreground">Horizontal lockup</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Website header, documents, invoices</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-[#17624A] p-6">
              <div className="flex items-center gap-3">
                <BrandMark size={44} />
                <span className="font-display text-[28px] leading-none tracking-[-0.04em] text-[#F7F4EC]">
                  bower<span className="text-[#D9A36A]">.</span>
                </span>
              </div>
              <p className="mt-8 text-[11px] text-[#F7F4EC]/60">On forest — the preferred dark partner</p>
            </div>
            <div className="rounded-2xl border border-border bg-[#151B17] p-6">
              <div className="flex items-center gap-3">
                <BrandMark size={44} />
                <span className="font-display text-[28px] leading-none tracking-[-0.04em] text-[#F7F4EC]">
                  bower<span className="text-[#D9A36A]">.</span>
                </span>
              </div>
              <p className="mt-8 text-[11px] text-[#F7F4EC]/50">On ink — for quiet, high-contrast surfaces</p>
            </div>
          </div>

          <p className="mt-6 max-w-[70ch] text-[12px] leading-6 text-muted-foreground">
            Clearspace is the width of the arch on every side. Never stretch, outline, recolour or place
            the mark on a busy photograph. The clay dot is always the last mark in the wordmark.
          </p>
        </div>
      </section>

      {/* Colour */}
      <section className="border-b border-border/70">
        <div className="container-x py-16 lg:py-24">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-clay">Colour</p>
          <h2 className="mt-4 max-w-[20ch] text-[34px] leading-[1.06] text-foreground sm:text-[44px]">
            Forest, bone, and one clay accent.
          </h2>
          <p className="mt-4 max-w-[60ch] text-[14px] leading-7 text-muted-foreground">
            Forest carries action and money-positive states. Bone is the page — warm, not clinical.
            Clay is used once per screen at most: a full stop, a fee, a highlight.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {palette.map((colour) => (
              <div key={colour.hex} className="overflow-hidden rounded-2xl border border-border">
                <div className={`flex h-28 items-end p-4 ${colour.className}`}>
                  <span className="text-[12px] font-semibold">{colour.name}</span>
                </div>
                <div className="bg-card p-4">
                  <p className="font-mono text-[11px] text-foreground">{colour.hex}</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{colour.role}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <div className="rounded-2xl bg-[#17624A] p-6 text-[#F7F4EC]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60">Primary combination</p>
              <p className="mt-3 font-display text-[26px] leading-tight">Forest on bone, clay as the full stop.</p>
            </div>
            <div className="rounded-2xl bg-[#E9F0E9] p-6 text-[#1C4A39]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60">Quiet surface</p>
              <p className="mt-3 text-[13px] leading-6">Sage panels hold metadata and secondary actions.</p>
            </div>
            <div className="rounded-2xl bg-[#F2E6D7] p-6 text-[#6D4327]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60">Warm accent</p>
              <p className="mt-3 text-[13px] leading-6">Clay is a note, not a button.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Type */}
      <section className="border-b border-border/70 bg-card/40">
        <div className="container-x py-16 lg:py-24">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-clay">Typography</p>
          <h2 className="mt-4 max-w-[20ch] text-[34px] leading-[1.06] text-foreground sm:text-[44px]">
            A serif for the story. A sans for the work.
          </h2>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Display · Fraunces</p>
              <p className="mt-5 font-display text-[40px] leading-[1.02] tracking-[-0.02em] text-foreground">
                A quieter way to run rentals.
              </p>
              <p className="mt-5 text-[11.5px] leading-6 text-muted-foreground">
                Public site headlines, brand moments, owner statements. Never in the dashboard chrome.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Interface · system sans</p>
              <p className="mt-5 text-[26px] leading-[1.15] tracking-[-0.02em] text-foreground">
                Rent, tenants, leases and reporting in one calm workspace.
              </p>
              <p className="mt-5 text-[11.5px] leading-6 text-muted-foreground">
                Every table, form, label and number. Compact, familiar, fast to scan.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            {[
              { label: "Display", sample: "The calm behind a well-run portfolio.", className: "font-display text-[34px] leading-tight" },
              { label: "Heading", sample: "Collected this month", className: "text-[26px] font-semibold tracking-[-0.025em]" },
              { label: "Body", sample: "Rent arrives, the record updates, the report agrees.", className: "text-[14px] leading-7 text-muted-foreground" },
              { label: "Meta", sample: "COLLECTED · 12 NOV · M-PESA", className: "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground" },
            ].map((row, index) => (
              <div key={row.label} className={`flex flex-col gap-2 px-6 py-5 sm:flex-row sm:items-baseline sm:gap-8 ${index > 0 ? "border-t border-border/70" : ""}`}>
                <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{row.label}</span>
                <span className={row.className}>{row.sample}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interface + motion */}
      <section className="border-b border-border/70">
        <div className="container-x grid gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-clay">Interface</p>
            <h2 className="mt-4 text-[34px] leading-[1.06] text-foreground sm:text-[40px]">Built from a small kit.</h2>
            <div className="mt-8 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-[12.5px] font-semibold text-primary-foreground">Record payment</span>
                <span className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-[12.5px] font-semibold text-foreground">Send reminder</span>
                <span className="inline-flex h-10 items-center rounded-xl px-4 text-[12.5px] font-semibold text-primary">View statement</span>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Collected this month</p>
                    <p className="mt-2 text-[28px] font-semibold tracking-[-0.03em] tabular text-foreground">KES 1,284,000</p>
                  </div>
                  <span className="rounded-full bg-[#E9F0E9] px-2.5 py-1 text-[10.5px] font-semibold text-[#1C4A39]">92% collected</span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[92%] rounded-full bg-primary" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-clay">Motion</p>
            <h2 className="mt-4 text-[34px] leading-[1.06] text-foreground sm:text-[40px]">Calm, not animated.</h2>
            <div className="mt-8 space-y-3">
              {[
                ["Pages", "Fade in 0.7s. No sliding, no bounce."],
                ["Panels", "Rise 16px over 0.85s with a soft ease-out."],
                ["Hover", "200ms colour and shadow changes only."],
                ["Reduced motion", "All transforms off; content appears instantly."],
              ].map(([label, body]) => (
                <div key={label} className="flex gap-4 rounded-xl border border-border/70 bg-card px-4 py-3">
                  <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
                  <span className="text-[12.5px] leading-6 text-foreground">{body}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Voice */}
      <section className="border-b border-border/70 bg-card/40">
        <div className="container-x py-16 lg:py-24">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-clay">Voice</p>
          <h2 className="mt-4 max-w-[18ch] text-[34px] leading-[1.06] text-foreground sm:text-[44px]">
            Plain, specific, unhurried.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {voice.map((item, index) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
                <span className="font-display text-[30px] text-clay">0{index + 1}</span>
                <p className="mt-4 text-[15px] font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download */}
      <section>
        <div className="container-x flex flex-col items-start justify-between gap-6 py-14 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[30px] leading-tight text-foreground">Use the system.</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">Download the vector assets. Do not redraw the mark.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/brand/bower-logo.svg" download className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90">
              <Download className="size-3.5" /> Logo SVG
            </a>
            <a href="/brand/bower-mark.svg" download className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-[12.5px] font-semibold text-foreground hover:border-primary/30">
              <Download className="size-3.5" /> Mark SVG
            </a>
            <Link href="/press" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-[12.5px] font-semibold text-foreground hover:border-primary/30">
              Press kit <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
