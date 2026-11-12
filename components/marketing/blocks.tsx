import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, ArrowUpRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function Section({
  children,
  className,
  muted = false,
  bordered = false,
}: {
  children: React.ReactNode
  className?: string
  muted?: boolean
  bordered?: boolean
}) {
  return (
    <section
      className={cn(
        "relative py-16 sm:py-20 lg:py-24",
        muted && "bg-muted/40",
        bordered && "border-y border-border/70",
        className,
      )}
    >
      <div className="container-x">{children}</div>
    </section>
  )
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11.5px] font-medium text-muted-foreground shadow-card",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-primary" />
      {children}
    </span>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  intro,
  align = "left",
  action,
}: {
  eyebrow?: string
  title: React.ReactNode
  intro?: string
  align?: "left" | "center"
  action?: { label: string; href: string }
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] text-foreground sm:text-[38px] lg:text-[42px]">
          {title}
        </h2>
        {intro ? <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">{intro}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
        >
          {action.label}
          <ArrowUpRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  )
}

export function FeatureCard({
  icon: Icon,
  title,
  body,
  href,
  className,
}: {
  icon: LucideIcon
  title: string
  body: string
  href?: string
  className?: string
}) {
  const inner = (
    <>
      <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
        <Icon className="size-[19px]" strokeWidth={1.9} />
      </span>
      <h3 className="mt-5 text-[16px] font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">{body}</p>
      {href ? (
        <span className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary">
          Learn more <ArrowUpRight className="size-3.5" />
        </span>
      ) : null}
    </>
  )

  const classes = cn(
    "group block rounded-2xl border border-border/80 bg-card p-5 shadow-card transition-[border-color,box-shadow,transform] duration-200",
    href && "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift",
    className,
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    )
  }
  return <div className={classes}>{inner}</div>
}

export function MetricStrip({
  items,
}: {
  items: Array<{ value: string; label: string }>
}) {
  return (
    <div className="grid grid-cols-2 divide-border/70 border-y border-border/70 sm:grid-cols-4 sm:divide-x">
      {items.map((item) => (
        <div key={item.label} className="px-1 py-6 sm:px-6">
          <p className="text-[22px] font-semibold tracking-[-0.03em] text-foreground tabular sm:text-[26px]">
            {item.value}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

export function CheckList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-[13.5px] leading-6 text-muted-foreground">
          <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-secondary text-primary">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  )
}

export function CtaBand({
  title,
  body,
  primary,
  secondary,
  note,
}: {
  title: string
  body: string
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
  note?: string
}) {
  return (
    <Section>
      <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-secondary px-6 py-12 sm:px-12 lg:py-16">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border border-primary/10" />
        <div className="pointer-events-none absolute -bottom-28 right-16 size-64 rounded-full border border-primary/10" />
        <div className="relative max-w-2xl">
          <h2 className="text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] text-secondary-foreground sm:text-[40px]">
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-secondary-foreground/75">{body}</p>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href={primary.href}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {primary.label}
              <ArrowRight className="size-4" />
            </Link>
            {secondary ? (
              <Link
                href={secondary.href}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-secondary-foreground/15 bg-background/60 px-5 text-[13.5px] font-semibold text-secondary-foreground transition-colors hover:bg-background"
              >
                {secondary.label}
              </Link>
            ) : null}
          </div>
          {note ? <p className="mt-4 text-[11.5px] text-secondary-foreground/60">{note}</p> : null}
        </div>
      </div>
    </Section>
  )
}

export function FaqList({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <div className="divide-y divide-border rounded-2xl border border-border/80 bg-card">
      {items.map((item) => (
        <details key={item.q} className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-medium text-foreground [&::-webkit-details-marker]:hidden">
            {item.q}
            <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors group-open:border-primary/30 group-open:bg-secondary group-open:text-primary">
              <span className="text-[13px] leading-none group-open:hidden">+</span>
              <span className="hidden text-[13px] leading-none group-open:block">−</span>
            </span>
          </summary>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-7 text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  )
}
