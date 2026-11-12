import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BarChart3, Briefcase, Building2, Mail, Users } from "lucide-react"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { StatusPill } from "@/components/dashboard/status-pill"

export const metadata: Metadata = {
  title: "Company — Bower",
  description: "Run your agency or company: team, landlords, aggregate reporting.",
}

export default async function CompanyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Tolerate missing tables (partial install). Each call returns null on
  // failure instead of throwing — the UI degrades to an empty workspace.
  const safeQuery = async <T,>(fn: () => Promise<{ data: T | null }>): Promise<T | null> => {
    try { return (await fn()).data } catch { return null }
  }

  const company = await safeQuery<{ id: string; name: string; type: string }>(() =>
    supabase.from("companies").select("id, name, type").eq("owner_id", user.id).maybeSingle(),
  )

  let team: any[] = []
  let landlords: any[] = []
  if (company) {
    const [t, l] = await Promise.all([
      safeQuery<any[]>(() =>
        supabase.from("team_members").select("id, name, email, role, accepted_at").eq("company_id", company.id).order("name"),
      ),
      safeQuery<any[]>(() =>
        supabase.from("managed_landlords").select("id, name, units, manager, revenue_share, status").eq("company_id", company.id).order("name"),
      ),
    ])
    team = t || []
    landlords = l || []
  }

  const members = team || []
  const managedLandlords = landlords || []
  const totalUnits = managedLandlords.reduce((sum, landlord) => sum + Number(landlord.units || 0), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace"
        title="Company"
        description="Team, managed landlords and portfolio totals. Company records come from your workspace database."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Landlords under management"
          value={managedLandlords.length}
          icon={Building2}
          hint={company ? "From managed landlords" : "No company workspace"}
        />
        <StatCard
          label="Total units managed"
          value={totalUnits}
          icon={BarChart3}
          accent="indigo"
          hint="From workspace records"
        />
        <StatCard
          label="Active team members"
          value={members.length}
          icon={Users}
          accent="slate"
          hint={company ? "From team members" : "No company workspace"}
        />
        <StatCard
          label="Portfolio yield"
          value="—"
          icon={Briefcase}
          accent="amber"
          hint="No database calculation available"
        />
      </div>

      <Panel
        title="Team"
        description="Everyone with access to your Bower workspace."
        bodyClassName={members.length > 0 ? "p-0" : undefined}
      >
        {members.length === 0 ? (
          <EmptyBlock
            icon={Users}
            title="No team members"
            description="No team members are stored for this workspace."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th className="hidden sm:table-cell">Email</th>
                  <th className="text-right">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.email || m.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                          {String(m.name || "")
                            .split(" ")
                            .filter(Boolean)
                            .map((part: string) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                        <span className="text-[13.5px] font-medium text-foreground">{m.name}</span>
                      </div>
                    </td>
                    <td>
                      <StatusPill tone="neutral">{m.role || "member"}</StatusPill>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                        <Mail className="size-3" /> {m.email}
                      </span>
                    </td>
                    <td className="text-right text-[13px] text-muted-foreground">
                      {m.accepted_at ? new Date(m.accepted_at).toLocaleDateString() : "Invitation pending"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

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
            {managedLandlords.map((l) => (
              <div key={l.name} className="rounded-xl border border-border/70 bg-card p-4">
                <p className="text-[13.5px] font-semibold text-foreground">{l.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Manager: {l.manager || "Not assigned"}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                  <div>
                    <p className="text-[20px] font-semibold leading-none tracking-[-0.03em] tabular text-foreground">{l.units}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">Units</p>
                  </div>
                  <div>
                    <p className="text-[20px] font-semibold leading-none tracking-[-0.03em] tabular text-foreground">
                      {Number(l.revenue_share || 0)}%
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">of portfolio</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
