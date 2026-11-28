import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { BarChart3, Building2, Briefcase, LayoutGrid, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { CompanyAuthError, requireCompanyMember } from "@/lib/company/auth"
import { departmentsOf, loadDirectory } from "@/lib/company/directory"
import { can, isCompanyAdmin } from "@/lib/company/permissions"
import { CompanyBand } from "@/components/company/company-band"
import { CompanyDirectory } from "@/components/company/company-directory"
import { NotificationBell } from "@/components/company/notification-bell"

export const metadata: Metadata = {
  title: "Company — Bower",
  description: "Your team, your landlords and the portfolio you run together.",
}

/**
 * The company workspace.
 *
 * A team workspace, not a settings page: the directory is the centre of
 * it, and every member of the company can open it. The managed
 * landlords stay with owners and managers — that data is the agency's,
 * not the whole team's to browse.
 */
/**
 * A landlord the company manages. One landlord sees only their own
 * data; owners and managers see every landlord.
 */
type LandlordRow = {
  id: string
  name: string
  units: number | null
  manager: string | null
  revenue_share: number | null
  status: string | null
}

export default async function CompanyPage() {
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
      console.error("[company/page] could not resolve the workspace", e)
    }
  }

  if (!company || !viewer) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Workspace"
          title="Company"
          description="Set up your company workspace to invite your team and manage landlords together."
        />
        <Panel title="No company workspace yet">
          <EmptyBlock
            icon={Briefcase}
            title="Your workspace is not ready"
            description="A company workspace is created for you when your account is set up. Refresh this page, or talk to your administrator if this is unexpected."
          />
        </Panel>
      </div>
    )
  }

  const canInvite = can(viewer.role, "invite_members")
  const canManage = can(viewer.role, "change_member")
  const canSeeLandlords = isCompanyAdmin(viewer)

  const directory = await loadDirectory(supabase, company, { status: "all", limit: 200 })

  const landlords: LandlordRow[] = canSeeLandlords
    ? (((await supabase
        .from("managed_landlords")
        .select("id, name, units, manager, revenue_share, status")
        .eq("company_id", company.id)
        .order("name")
      ).data as LandlordRow[]) ?? [])
    : []

  const members = directory.members ?? []
  const activeMembers = members.filter((m) => m.status === "active")
  const managedLandlords = landlords
  const totalUnits = managedLandlords.reduce(
    (sum: number, landlord: LandlordRow) => sum + Number(landlord.units || 0),
    0,
  )

  const departments = departmentsOf(members)

  return (
    <div className="space-y-5">
      <CompanyBand
        companyName={company.name}
        description="Your team, the landlords you look after and the portfolio you run together."
        members={members}
        departmentCount={departments.length}
        viewerMember={viewer}
      >
        <NotificationBell companyId={company.id} userId={user.id} />
      </CompanyBand>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Team members"
          value={activeMembers.length}
          icon={Users}
          accent="emerald"
          hint={`${activeMembers.length} active · ${members.length} total`}
        />
        <StatCard
          label="Departments"
          value={departments.length}
          icon={LayoutGrid}
          accent="indigo"
          hint={departments.length > 0 ? departments.join(", ") : "Not set up yet"}
        />
        <StatCard
          label="Landlords under management"
          value={canSeeLandlords ? managedLandlords.length : "—"}
          icon={Building2}
          accent="amber"
          hint={canSeeLandlords ? "From managed landlords" : "Owners and managers only"}
        />
        <StatCard
          label="Total units managed"
          value={canSeeLandlords ? totalUnits : "—"}
          icon={BarChart3}
          accent="slate"
          hint={canSeeLandlords ? "Across every landlord" : "Owners and managers only"}
        />
      </div>

      <CompanyDirectory
        initialMembers={activeMembers}
        companyName={company.name}
        viewerRole={viewer.role}
        viewerUserId={viewer.user_id ?? user.id}
        canInvite={canInvite}
        canManage={canManage}
        totalMembers={members.length}
      />

      {canSeeLandlords ? (
        <Panel
          title="Landlords under management"
          description="Each landlord sees only their own data. You see everything."
          bodyClassName={managedLandlords.length === 0 ? undefined : "p-5"}
        >
          {managedLandlords.length === 0 ? (
            <EmptyBlock
              icon={Building2}
              title="No managed landlords"
              description="No managed landlords are stored for this workspace."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {managedLandlords.map((landlord) => (
                <div
                  key={landlord.id}
                  className="rounded-xl border border-border/70 bg-card p-4"
                >
                  <p className="text-[13.5px] font-semibold text-foreground">{landlord.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Manager: {landlord.manager || "Not assigned"}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                    <div>
                      <p className="text-[20px] font-semibold leading-none tracking-[-0.03em] tabular text-foreground">
                        {landlord.units}
                      </p>
                      <p className="mt-1.5 text-xs text-muted-foreground">Units</p>
                    </div>
                    <div>
                      <p className="text-[20px] font-semibold leading-none tracking-[-0.03em] tabular text-foreground">
                        {Number(landlord.revenue_share || 0)}%
                      </p>
                      <p className="mt-1.5 text-xs text-muted-foreground">of portfolio</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      ) : null}
    </div>
  )
}
