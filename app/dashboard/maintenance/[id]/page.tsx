"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  Edit,
  Loader2,
  MapPin,
  Phone,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { DeleteButton } from "@/components/delete-button"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, tenantName } from "@/lib/utils"

type PriorityTone = "danger" | "warning" | "info" | "neutral"
type StatusTone = "success" | "warning" | "info" | "neutral" | "brand"

function priorityTone(priority?: string | null): PriorityTone {
  switch ((priority || "").toLowerCase()) {
    case "urgent":
      return "danger"
    case "high":
      return "warning"
    case "medium":
      return "info"
    default:
      return "neutral"
  }
}

function statusPillTone(status?: string | null): StatusTone {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "success"
    case "in_progress":
      return "brand"
    case "open":
      return "info"
    default:
      return "neutral"
  }
}

function DetailRow({
  label,
  children,
  align = "right",
}: {
  label: string
  children: React.ReactNode
  align?: "right" | "left"
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd
        className={
          align === "right"
            ? "min-w-0 text-right text-[13px] font-medium text-foreground"
            : "min-w-0 flex-1 text-[13px] font-medium text-foreground"
        }
      >
        {children}
      </dd>
    </div>
  )
}

export default function MaintenanceDetailPage() {
  const params = useParams<{ id: string }>()
  const [maintenanceRequest, setMaintenanceRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!params?.id) return
    const fetchRequest = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("maintenance_requests")
          .select(`
            *,
            properties (id, name, address),
            tenants (id, full_name, first_name, last_name, email, phone)
          `)
          .eq("id", params.id)
          .maybeSingle()
        if (error) throw error
        if (!data) setNotFound(true)
        else setMaintenanceRequest(data)
      } catch (error) {
        console.error("[bower] fetch maintenance error", error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchRequest()
  }, [params?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-border/70 bg-card py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading work order
      </div>
    )
  }

  if (notFound || !maintenanceRequest) {
    return (
      <Panel bodyClassName="p-0">
        <EmptyBlock
          icon={Wrench}
          title="Work order not found"
          description="It may have been deleted, or the link is out of date."
          actionHref="/dashboard/maintenance"
          actionLabel="Back to maintenance"
        />
      </Panel>
    )
  }

  const hasCostOrContractor = Boolean(
    maintenanceRequest.contractor_name ||
      maintenanceRequest.contractor_phone ||
      maintenanceRequest.estimated_cost ||
      maintenanceRequest.actual_cost,
  )

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Service · Work order"
        title={maintenanceRequest.title || "Untitled request"}
        description={maintenanceRequest.properties?.name || "No property linked"}
        actions={
          <>
            <StatusPill tone={priorityTone(maintenanceRequest.priority)}>
              {maintenanceRequest.priority || "not set"}
            </StatusPill>
            <StatusPill tone={statusPillTone(maintenanceRequest.status)} dot>
              {(maintenanceRequest.status || "unknown").replace(/_/g, " ")}
            </StatusPill>
            <Button asChild size="sm" className="rounded-lg">
              <Link href={`/dashboard/maintenance/${maintenanceRequest.id}/edit`}>
                <Edit /> Edit
              </Link>
            </Button>
            <DeleteButton
              endpoint={`/api/maintenance/${maintenanceRequest.id}`}
              resource="maintenance request"
              redirectTo="/dashboard/maintenance"
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Request details" description="Where the job sits and who reported it">
          <dl className="divide-y divide-border/70">
            <DetailRow label="Category">
              <span className="capitalize">{maintenanceRequest.category || "general"}</span>
            </DetailRow>
            <DetailRow label="Property">
              <span className="block">{maintenanceRequest.properties?.name || "—"}</span>
              {maintenanceRequest.properties?.address ? (
                <span className="mt-0.5 flex items-center justify-end gap-1 text-xs font-normal text-muted-foreground">
                  <MapPin className="size-3" strokeWidth={2} />
                  {maintenanceRequest.properties.address}
                </span>
              ) : null}
            </DetailRow>
            <DetailRow label="Reported by">
              <span className="block">
                {maintenanceRequest.tenants ? tenantName(maintenanceRequest.tenants) : "Not linked"}
              </span>
              {maintenanceRequest.tenants?.email ? (
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {maintenanceRequest.tenants.email}
                </span>
              ) : null}
              {maintenanceRequest.tenants?.phone ? (
                <a
                  href={`tel:${maintenanceRequest.tenants.phone}`}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-pine hover:underline"
                >
                  <Phone className="size-3" />
                  {maintenanceRequest.tenants.phone}
                </a>
              ) : null}
            </DetailRow>
            <DetailRow label="Logged">
              <span className="tabular">{formatDate(maintenanceRequest.created_at)}</span>
            </DetailRow>
            {maintenanceRequest.scheduled_date ? (
              <DetailRow label="Scheduled">
                <span className="tabular">{formatDate(maintenanceRequest.scheduled_date)}</span>
              </DetailRow>
            ) : null}
            {maintenanceRequest.completed_date ? (
              <DetailRow label="Completed">
                <span className="tabular">{formatDate(maintenanceRequest.completed_date)}</span>
              </DetailRow>
            ) : null}
          </dl>
        </Panel>

        <Panel title="Cost and contractor" description="Who is doing the work and what it costs">
          {hasCostOrContractor ? (
            <dl className="divide-y divide-border/70">
              {maintenanceRequest.estimated_cost ? (
                <DetailRow label="Estimated cost">
                  <span className="tabular text-pine">
                    {formatCurrency(maintenanceRequest.estimated_cost)}
                  </span>
                </DetailRow>
              ) : null}
              {maintenanceRequest.actual_cost ? (
                <DetailRow label="Actual cost">
                  <span className="tabular">{formatCurrency(maintenanceRequest.actual_cost)}</span>
                </DetailRow>
              ) : null}
              {maintenanceRequest.contractor_name ? (
                <DetailRow label="Contractor">
                  <span className="block">{maintenanceRequest.contractor_name}</span>
                  {maintenanceRequest.contractor_phone ? (
                    <a
                      href={`tel:${maintenanceRequest.contractor_phone}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-pine hover:underline"
                    >
                      <Phone className="size-3" />
                      {maintenanceRequest.contractor_phone}
                    </a>
                  ) : null}
                </DetailRow>
              ) : null}
            </dl>
          ) : (
            <EmptyBlock
              icon={Wrench}
              title="No contractor or cost yet"
              description="Add a contractor, an estimate or the final invoice from the edit form."
              actionHref={`/dashboard/maintenance/${maintenanceRequest.id}/edit`}
              actionLabel="Add details"
            />
          )}
        </Panel>
      </div>

      <Panel title="Description">
        <p className="whitespace-pre-wrap text-[13.5px] leading-6 text-muted-foreground">
          {maintenanceRequest.description || "No description recorded."}
        </p>
      </Panel>

      {maintenanceRequest.notes ? (
        <Panel title="Additional notes">
          <p className="whitespace-pre-wrap text-[13.5px] leading-6 text-muted-foreground">
            {maintenanceRequest.notes}
          </p>
        </Panel>
      ) : null}
    </div>
  )
}
