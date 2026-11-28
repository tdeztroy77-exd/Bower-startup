import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { startOfMonth } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { CompanyAuthError, requireCompanyMember } from "@/lib/company/auth"
import { can } from "@/lib/company/permissions"
import type { CompanyEvent } from "@/lib/company/types"
import { CompanyBand } from "@/components/company/company-band"
import { CompanyCalendar } from "@/components/company/company-calendar"
import { NotificationBell } from "@/components/company/notification-bell"

export const metadata: Metadata = {
  title: "Team calendar — Bower",
  description: "Meetings, viewings, inspections and holidays for your company team.",
}

/**
 * The company calendar.
 *
 * The month is rendered on the server so the agenda is on screen
 * without a round trip; moving between months then talks to the events
 * API and the same list updates in place.
 */
export default async function CompanyCalendarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  let company: Awaited<ReturnType<typeof requireCompanyMember>>["company"] | null = null
  let viewer: Awaited<ReturnType<typeof requireCompanyMember>>["member"] | null = null

  try {
    const context = await requireCompanyMember(supabase, user.id)
    company = context.company
    viewer = context.member
  } catch (e) {
    if (!(e instanceof CompanyAuthError)) {
      console.error("[company/calendar] could not resolve the workspace", e)
    }
  }

  if (!company || !viewer) {
    return (
      <div className="space-y-5">
        <CompanyBand companyName="Calendar" description="The shared team calendar." members={[]} departmentCount={0} />
      </div>
    )
  }

  const month = startOfMonth(new Date())
  const from = month.toISOString()
  const to = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
    23,
    59,
    59,
  ).toISOString()

  const { data } = await supabase
    .from("company_events")
    .select(
      "id, company_id, title, description, starts_at, ends_at, type, property_id, location, created_by, created_by_name, visibility, created_at, updated_at",
    )
    .eq("company_id", company.id)
    .gte("ends_at", from)
    .lte("starts_at", to)
    .order("starts_at", { ascending: true })

  const events = (data as CompanyEvent[]) ?? []

  const bandMembers = await supabase
    .from("team_members")
    .select("id, company_id, user_id, name, email, role, avatar_url, department, job_title, phone, status, last_seen_at, invited_at, accepted_at")
    .eq("company_id", company.id)
    .eq("status", "active")

  const bandMemberList = (bandMembers.data as any[]) ?? []

  return (
    <div className="space-y-5">
      <CompanyBand
        companyName={company.name}
        description="What the team is doing, and when — the one place everybody looks first."
        members={bandMemberList}
        departmentCount={new Set(bandMemberList.map((m) => m.department).filter(Boolean)).size}
        viewerMember={viewer}
      >
        <NotificationBell companyId={company.id} userId={user.id} />
      </CompanyBand>

      <CompanyCalendar
        companyId={company.id}
        initialEvents={events}
        initialMonth={month.toISOString()}
        canCreate={can(viewer.role, "create_event")}
        viewerUserId={viewer.user_id ?? user.id}
        viewerRole={viewer.role}
        isCompanyOwner={viewer.is_owner}
      />
    </div>
  )
}
