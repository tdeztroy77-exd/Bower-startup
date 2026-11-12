import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Camera,
  Clock,
  HandCoins,
  MapPin,
  Plus,
  ShieldAlert,
  Wallet,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { formatDate, formatKenyaCurrency } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Damages & inspections — Bower",
  description: "Photo-document move-in condition, track damages, settle deposits fairly.",
}

interface DamageRow {
  id: string
  title: string | null
  property_id: string | null
  tenant_id: string | null
  location: string | null
  severity: string | null
  status: string | null
  cost: number | null
  estimated_cost: number | null
  photos: string[] | null
  reported_at: string
  resolved_at: string | null
}

const severityTone: Record<string, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
}

const statusTone: Record<string, "success" | "warning" | "info" | "brand" | "neutral"> = {
  reported: "info",
  in_repair: "brand",
  deposit_deduction: "warning",
  resolved: "success",
  written_off: "neutral",
}

const statusLabel: Record<string, string> = {
  reported: "Reported",
  in_repair: "In repair",
  deposit_deduction: "Deposit deduction",
  resolved: "Resolved",
  written_off: "Written off",
}

const inspectionTemplates = [
  { name: "Studio move-in", items: 18 },
  { name: "1-bed move-in", items: 28 },
  { name: "3-bed move-in", items: 42 },
  { name: "Move-out", items: 38 },
]

export default async function DamagesPage() {
  const supabase = await createClient()
  const { data: damageRows } = await supabase
    .from("damages")
    .select("id, title, property_id, tenant_id, location, severity, status, cost, estimated_cost, photos, reported_at, resolved_at")
    .order("reported_at", { ascending: false })

  const damages = (damageRows ?? []) as DamageRow[]
  const activeDamages = damages.filter((damage) => !["resolved", "written_off"].includes(damage.status ?? ""))
  const openRepairValue = activeDamages.reduce((sum, damage) => sum + (damage.cost ?? damage.estimated_cost ?? 0), 0)
  const depositDeductions = damages
    .filter((damage) => damage.status === "deposit_deduction")
    .reduce((sum, damage) => sum + (damage.cost ?? 0), 0)
  const resolvedDamages = damages.filter((damage) => damage.resolved_at)
  const averageResolutionDays = resolvedDamages.length
    ? Math.round(
        resolvedDamages.reduce(
          (sum, damage) =>
            sum +
            (new Date(damage.resolved_at as string).getTime() - new Date(damage.reported_at).getTime()) /
              86400000,
          0,
        ) / resolvedDamages.length,
      )
    : 0

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inspections"
        title="Damages & inspections"
        description="Photo-document move-in condition, log damages, attach repairs — evidence for a fair deposit settlement at exit."
        actions={
          <>
            <Button variant="outline" size="sm" className="rounded-lg bg-card">
              <Camera /> Log damage
            </Button>
            <Button size="sm" className="rounded-lg">
              <Plus /> New inspection
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active damages"
          value={activeDamages.length}
          icon={ShieldAlert}
          accent="coral"
          hint={`${damages.length} records in total`}
        />
        <StatCard
          label="Open repair value"
          value={formatKenyaCurrency(openRepairValue)}
          icon={Wallet}
          accent="amber"
          hint="Budget against actual"
        />
        <StatCard
          label="Deposit deductions"
          value={formatKenyaCurrency(depositDeductions)}
          icon={HandCoins}
          accent="indigo"
          hint="Based on recorded deductions"
        />
        <StatCard
          label="Avg. resolution"
          value={`${averageResolutionDays} ${averageResolutionDays === 1 ? "day" : "days"}`}
          icon={Clock}
          accent="emerald"
          hint="From logged to resolved"
        />
      </div>

      <Panel
        title="Damage log"
        description={
          damages.length === 0
            ? "No damage records yet"
            : `${damages.length} ${damages.length === 1 ? "record" : "records"}, newest first`
        }
        bodyClassName="p-0"
      >
        {damages.length === 0 ? (
          <EmptyBlock
            icon={ShieldAlert}
            title="No damages logged"
            description="Damage records you log against a property appear here with severity, cost and resolution status."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="pd-table min-w-[860px]">
              <thead>
                <tr>
                  <th>Damage</th>
                  <th>Property / Tenant</th>
                  <th>Location</th>
                  <th>Severity</th>
                  <th className="text-right">Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {damages.map((damage) => {
                  const cost = damage.cost ?? damage.estimated_cost
                  return (
                    <tr key={damage.id}>
                      <td className="max-w-[280px]">
                        <p className="truncate text-[13px] font-medium text-foreground">
                          {damage.title || "Untitled damage"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="tabular">{formatDate(damage.reported_at)}</span>
                          <span className="inline-flex items-center gap-1">
                            <Camera className="size-3" strokeWidth={2} />
                            {damage.photos?.length ?? 0}
                          </span>
                        </p>
                      </td>
                      <td>
                        <p className="text-[13px] text-foreground">
                          Property {damage.property_id ? damage.property_id.slice(0, 8) : "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {damage.tenant_id ? `Tenant ${damage.tenant_id.slice(0, 8)}` : "No tenant linked"}
                        </p>
                      </td>
                      <td>
                        <p className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                          <MapPin className="size-3" strokeWidth={2} />
                          {damage.location || "—"}
                        </p>
                      </td>
                      <td>
                        <StatusPill tone={severityTone[damage.severity ?? ""] ?? "neutral"}>
                          {damage.severity || "unknown"}
                        </StatusPill>
                      </td>
                      <td className="text-right text-[13px] font-semibold tabular text-foreground">
                        {typeof cost === "number" ? formatKenyaCurrency(cost) : "—"}
                      </td>
                      <td>
                        <StatusPill tone={statusTone[damage.status ?? ""] ?? "neutral"} dot>
                          {statusLabel[damage.status ?? ""] ?? damage.status ?? "unknown"}
                        </StatusPill>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Inspection checklists"
        description="Pre-built templates by property type — start in seconds"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {inspectionTemplates.map((template) => (
            <Link
              key={template.name}
              href="/templates"
              className="group flex flex-col rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/30 hover:bg-secondary/30"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary">
                <ShieldAlert className="size-4" strokeWidth={1.9} />
              </span>
              <span className="mt-3 text-[13px] font-medium text-foreground">{template.name}</span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                {template.items} check items
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Use template <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel
        title="Damages → maintenance → repair"
        description="One record from log to resolution, with proof"
      >
        <p className="text-[13px] leading-6 text-muted-foreground">
          Every damage record links to a maintenance ticket and a quotation when work starts. Photos
          taken at move-in live next to the unit, so end-of-tenancy deposit disputes are settled in
          minutes, not court.
        </p>
        <Button variant="outline" size="sm" className="mt-4 rounded-lg bg-card" asChild>
          <Link href="/dashboard/maintenance">
            <Wrench /> Open maintenance
          </Link>
        </Button>
      </Panel>
    </div>
  )
}
