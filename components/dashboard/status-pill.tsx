import { cn } from "@/lib/utils"

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand"

const tones: Record<Tone, string> = {
  success: "bg-success/10 text-success ring-success/15",
  warning: "bg-warning/10 text-warning ring-warning/20",
  danger: "bg-destructive/10 text-destructive ring-destructive/15",
  info: "bg-info/10 text-info ring-info/15",
  neutral: "bg-muted text-muted-foreground ring-border",
  brand: "bg-secondary text-secondary-foreground ring-primary/15",
}

/**
 * Soft status chip. Every list page uses this instead of solid saturated
 * badges so a table of twenty rows stays legible.
 */
export function StatusPill({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

/** Map the status strings used across the app to a consistent tone. */
export function statusTone(status?: string | null): Tone {
  switch ((status || "").toLowerCase()) {
    case "active":
    case "paid":
    case "completed":
    case "matched":
    case "resolved":
    case "vacant":
    case "available":
      return "success"
    case "pending":
    case "partial":
    case "trialing":
    case "in_repair":
    case "scheduled":
      return "warning"
    case "late":
    case "overdue":
    case "urgent":
    case "failed":
    case "expired":
    case "canceled":
    case "open":
      return "danger"
    case "occupied":
    case "rented":
    case "in_progress":
      return "brand"
    default:
      return "neutral"
  }
}
