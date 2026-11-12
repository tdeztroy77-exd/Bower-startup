import type React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { DashboardSidebar, SidebarMobileTrigger } from "@/components/dashboard-sidebar"
import { NotificationsBell } from "@/components/notifications-bell"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { TrialBanner } from "@/components/trial-banner"
import { CommandSearch } from "@/components/dashboard/command-search"
import { UserMenu } from "@/components/dashboard/user-menu"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LifeBuoy } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth + email verification are also enforced in middleware, but we
  // re-check here so server components never see a stale session.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Try to preserve the originally-requested URL so users land back
    // where they expected after signing in. Headers may not be available
    // in every runtime context, so fall back to /auth/login if so.
    let requested = "/dashboard"
    try {
      const h = await headers()
      const referer = h.get("x-pathname") || h.get("referer") || ""
      const m = referer.match(/(\/dashboard\/[^?#]*)/)
      if (m) requested = m[1]
    } catch {
      // ignore — fall back to default
    }
    const params = new URLSearchParams({ next: requested })
    redirect(`/auth/login?${params.toString()}`)
  }

  if (!user.email_confirmed_at) {
    redirect("/auth/verify-email?email=" + encodeURIComponent(user.email || ""))
  }

  // Start the first-time 14-day trial as soon as a verified user enters the app.
  // The unique user_id constraint makes this safe on every dashboard request.
  const { data: existingSubscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!existingSubscription) {
    // Entitlement rows are written by a SECURITY DEFINER function; direct
    // inserts are revoked so a browser cannot create its own subscription.
    const { error: ensureError } = await supabase.rpc("ensure_subscription", { p_user: user.id })
    if (ensureError) {
      console.error("[dashboard] could not ensure a subscription", ensureError.message)
    }
  }

  // Pull avatar/name in the same pass — the sidebar and top bar need them on
  // every page, so we pay for one query rather than one per component.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, company_name")
    .eq("user_id", user.id)
    .maybeSingle()

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("owner_id", user.id)
    .maybeSingle()

  const userName = (profile as any)?.full_name || undefined
  const companyName = company?.name || (profile as any)?.company_name || null

  return (
    <div className="workspace-surface min-h-screen">
      <DashboardSidebar
        userEmail={user.email || "user@example.com"}
        userName={userName}
        companyName={companyName}
      />

      <div className="flex min-h-screen flex-col md:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
            <SidebarMobileTrigger
              userEmail={user.email || "user@example.com"}
              userName={userName}
              companyName={companyName}
            />
            <div className="min-w-0 flex-1 sm:max-w-[420px]">
              <CommandSearch />
            </div>

            <div className="ml-auto flex items-center gap-1">
              <PwaInstallPrompt />
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
              >
                <Link href="/help" aria-label="Help and support">
                  <LifeBuoy className="size-[18px]" />
                </Link>
              </Button>
              <NotificationsBell />
              <div className="mx-1.5 hidden h-6 w-px bg-border sm:block" />
              <UserMenu
                name={userName}
                email={user.email}
                workspace={companyName}
              />
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            <TrialBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
