import type React from "react"
import { MarketingShell } from "@/components/marketing/site-shell"

/**
 * Layout for every page inside the (marketing) route group.
 *
 * The header and footer live in `MarketingShell`, which deliberately hides
 * them on /auth/* so sign-in is not surrounded by navigation.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MarketingShell>{children}</MarketingShell>
}
