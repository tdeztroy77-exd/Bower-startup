import Link from "next/link"
import { Check } from "lucide-react"
import { BrandWordmark } from "@/components/brand-mark"
import { DashboardPreview } from "@/components/marketing/product-preview"

/**
 * Shared shell for sign-in, sign-up and password recovery.
 *
 * A quiet form column on the left, and — on wide screens — a single product
 * panel on the mint canvas. No dark marketing panel, no stock photography:
 * the proof is the interface itself.
 */
export function AuthShell({
  eyebrow,
  title,
  body,
  footerPrompt,
  footerHref,
  footerLabel,
  children,
}: {
  eyebrow: string
  title: string
  body: string
  footerPrompt: string
  footerHref: string
  footerLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_1.05fr]">
      <main className="flex min-h-screen flex-col px-6 py-7 sm:px-10">
        <div className="flex items-center justify-between">
          <BrandWordmark href="/" size="md" />
          <Link
            href={footerHref}
            className="text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            {footerLabel}
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">
            {children}
            <p className="mt-7 hidden text-center text-[12.5px] text-muted-foreground lg:block">
              {footerPrompt}{" "}
              <Link href={footerHref} className="font-semibold text-foreground underline decoration-border underline-offset-4 hover:text-pine">
                {footerLabel}
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <span>© {new Date().getFullYear()} Bower</span>
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
        </div>
      </main>

      <aside className="brand-sweep relative hidden overflow-hidden border-l border-border lg:flex lg:flex-col lg:justify-center lg:px-12 lg:py-14">
        <div className="brand-grain pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 dotted-grid opacity-[0.16]" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-[440px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-lime">{eyebrow}</p>
          <h1 className="mt-4 text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-brand-ink-foreground">
            {title}
          </h1>
          <p className="mt-3 text-[13.5px] leading-6 text-brand-ink-muted">{body}</p>

          <div className="mt-8">
            <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-brand-lime/18 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <DashboardPreview />
            </div>
          </div>

          <ul className="mt-7 space-y-2.5">
            {[
              "Tenants, leases and rent in one record",
              "M-Pesa payments reconciled against the paybill",
              "One flat monthly price, unlimited units",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[12.5px] leading-5 text-brand-ink-muted">
                <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-brand-lime/15 text-brand-lime">
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
