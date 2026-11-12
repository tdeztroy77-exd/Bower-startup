import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Section panel — the single card primitive used across the workspace.
 *
 * `Panel` replaces hand-rolled `<Card><CardHeader>…` blocks so every section
 * has the same radius, hairline border, title scale and padding rhythm.
 */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  footer,
  divided = true,
  bodyClassName,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
  bodyClassName?: string
  footer?: ReactNode
  divided?: boolean
}) {
  const hasHeader = Boolean(title || description || action)
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card",
        className,
      )}
    >
      {hasHeader ? (
        <div
          className={cn(
            "flex flex-wrap items-start justify-between gap-3 px-5 py-4",
            divided && "border-b border-border/70",
          )}
        >
          <div className="min-w-0">
            {title ? (
              <h2 className="text-[15px] font-semibold leading-6 tracking-[-0.01em] text-foreground">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-1.5">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn("min-w-0 flex-1 px-5 py-4", bodyClassName, contentClassName)}>
        {children}
      </div>
      {footer ? (
        <div className="border-t border-border/70 bg-muted/25 px-5 py-3">{footer}</div>
      ) : null}
    </section>
  )
}
