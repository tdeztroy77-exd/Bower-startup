/**
 * Bower brand identity.
 *
 * The mark is a bower: two nested arches, a sheltered threshold, with a single
 * clay dot at the centre. It reads as a doorway at 16px and as an arch at 200px.
 * The wordmark is lowercase in the display serif, closed with a clay full stop.
 */
import Link from "next/link"
import { cn } from "@/lib/utils"

interface MarkProps {
  size?: number
  className?: string
}

export function BrandMark({ size = 32, className }: MarkProps) {
  return (
    <span
      className={cn("inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" className="h-full w-full" role="presentation">
        <defs>
          <linearGradient id="bower-mark-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#226E53" />
            <stop offset="100%" stopColor="#0E4030" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="12" fill="url(#bower-mark-gradient)" />
        <path
          d="M9.5 31V21.4C9.5 15.5 14.2 10.8 20 10.8s10.5 4.7 10.5 10.6V31"
          fill="none"
          stroke="#F7F4EC"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path
          d="M14.8 31V22.3c0-2.9 2.3-5.2 5.2-5.2s5.2 2.3 5.2 5.2V31"
          fill="none"
          stroke="#F7F4EC"
          strokeWidth="1.9"
          strokeLinecap="round"
          opacity="0.7"
        />
        <circle cx="20" cy="27.4" r="1.7" fill="#D9A36A" />
      </svg>
    </span>
  )
}

interface WordmarkProps {
  href?: string
  showSubtitle?: boolean
  subtitle?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function BrandWordmark({
  href,
  showSubtitle = false,
  subtitle,
  size = "md",
  className,
}: WordmarkProps) {
  const markSize = size === "sm" ? 24 : size === "lg" ? 38 : 30
  const titleSize = size === "sm" ? "text-[18px]" : size === "lg" ? "text-[26px]" : "text-[22px]"

  const inner = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={markSize} />
      <span className="flex min-w-0 flex-col leading-none">
        <span className={cn(titleSize, "font-display font-medium tracking-[-0.03em] text-foreground")}>
          bower<span className="text-clay">.</span>
        </span>
        {(showSubtitle || subtitle) && (
          <span className="mt-1 truncate text-[9.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {subtitle || "Property operations"}
          </span>
        )}
      </span>
    </span>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {inner}
      </Link>
    )
  }
  return inner
}
