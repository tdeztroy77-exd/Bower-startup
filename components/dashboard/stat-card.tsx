import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

type Accent = "emerald" | "amber" | "coral" | "indigo" | "slate"

const accentTile: Record<Accent, string> = {
  // The default tile is the brand accent, not a second colour. A row of
  // stat cards with five different icon colours is the dated pattern; one
  // accent on every tile is the current one.
  emerald: "bg-brand-lime-soft text-pine",
  amber: "bg-warning/12 text-warning",
  coral: "bg-destructive/10 text-destructive",
  indigo: "bg-chart-3/10 text-chart-3",
  slate: "bg-muted text-muted-foreground",
}

export interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  href?: string
  hint?: string
  trend?: {
    value: string
    direction?: "up" | "down" | "flat"
    /** Colour follows the metric, not the direction. */
    tone?: "positive" | "negative" | "neutral"
  }
  accent?: Accent
  className?: string
}

/**
 * KPI card: label + icon tile on top, the number as the hero, then a single
 * supporting line. Deliberately quiet — the eye should land on the number.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  hint,
  trend,
  accent = "emerald",
  className,
}: StatCardProps) {
  const tone =
    trend?.tone ?? (trend?.direction === "down" ? "negative" : trend ? "positive" : "neutral")
  const TrendIcon = trend?.direction === "down" ? ArrowDownRight : trend?.direction === "flat" ? Minus : ArrowUpRight

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium leading-5 text-muted-foreground">{label}</p>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", accentTile[accent])}>
          <Icon className="size-[17px]" strokeWidth={1.9} />
        </span>
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.03em] text-foreground tabular">
        {value}
      </p>
      <div className="mt-3 flex min-h-5 flex-wrap items-center gap-1.5 text-xs">
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium",
              tone === "positive" && "bg-success/10 text-success",
              tone === "negative" && "bg-destructive/10 text-destructive",
              tone === "neutral" && "bg-muted text-muted-foreground",
            )}
          >
            <TrendIcon className="size-3" strokeWidth={2.4} />
            {trend.value}
          </span>
        ) : null}
        {hint ? <span className="truncate text-muted-foreground">{hint}</span> : null}
      </div>
    </>
  )

  const classes = cn(
    "group block rounded-2xl border border-border/80 bg-card p-4 shadow-card transition-[border-color,box-shadow,transform] duration-200",
    href && "hover:-translate-y-0.5 hover:border-pine/30 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    className,
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    )
  }
  return <div className={classes}>{body}</div>
}
