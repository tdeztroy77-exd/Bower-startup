import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CompanyAuthError, requireCompanyMember } from "@/lib/company/auth"
import { PresenceProvider } from "@/components/company/presence-provider"

/**
 * The company section shell.
 *
 * Mounts the presence provider ONCE for the whole section, so the
 * realtime channel is not torn down and re-joined every time somebody
 * moves between the directory and the calendar.
 *
 * The company is resolved here on the server, which means the presence
 * channel is only ever opened for a company the caller actually belongs
 * to.
 */
export default async function CompanyLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  let companyId: string | null = null

  try {
    const { company } = await requireCompanyMember(supabase, user.id)
    companyId = company.id
  } catch (e) {
    // No company yet (or the workspace tables are not installed). The
    // pages below render their own empty state — the section must not
    // hard-fail for a brand new account.
    if (!(e instanceof CompanyAuthError)) {
      console.error("[company/layout] could not resolve the company", e)
    }
  }

  if (!companyId) return <>{children}</>

  return (
    <PresenceProvider companyId={companyId} userId={user.id}>
      {children}
    </PresenceProvider>
  )
}
