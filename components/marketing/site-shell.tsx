"use client"

import { usePathname } from "next/navigation"
import { MarketingHeader, MarketingFooter } from "@/components/marketing-site"

/**
 * Public site chrome. Auth screens render inside the (marketing) group for
 * routing simplicity but must not inherit the marketing header and footer —
 * they are a focused, full-height task.
 */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname?.startsWith("/auth")) return <>{children}</>

  return (
    <div className="bower-marketing min-h-screen bg-background text-foreground antialiased">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  )
}
