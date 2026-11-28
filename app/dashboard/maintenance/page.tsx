"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, tenantName } from "@/lib/utils"

type PriorityTone = "danger" | "warning" | "info" | "neutral"
type StatusTone = "success" | "warning" | "info" | "neutral" | "brand"

interface MaintenanceRequestRow {
  id: string
  title: string | null
  description: string | null
  status: string | null
  priority: string | null
  category: string | null
  created_at: string | null
  scheduled_date: string | null
  estimated_cost: number | null
  contractor_name: string | null
  properties?: { name?: string | null; address?: string | null } | null
  tenants?: { full_name?: string | null; first_name?: string | null; last_name?: string | null } | null
}

/** Urgent reads as an alarm, high as a caution, medium as information. */
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

/** Status is a workflow position, not an error — `open` stays informational. */
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

function statusLabel(status?: string | null) {
  return (status || "unknown").replace(/_/g, " ")
}

function RequestCard({ request }: { request: MaintenanceRequestRow }) {
  return (
    <article className="flex flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-card transition-colors hover:border-pine/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-semibold leading-5 tracking-[-0.01em] text-foreground">
            {request.title || "Untitled request"}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" strokeWidth={2} />
            <span className="truncate">{request.properties?.name || "No property linked"}</span>
            {request.category ? (
              <>
                <span className="text-border">·</span>
                <span className="shrink-0 capitalize">{request.category}</span>
              </>
            ) : null}
          </p>
        </div>
        <StatusPill tone={statusPillTone(request.status)} dot>
          {statusLabel(request.status)}
        </StatusPill>
      </div>

      {request.description ? (
        <p className="mt-2.5 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
          {request.description}
        </p>
      ) : null}

      <dl className="mt-3 space-y-1.5 border-t border-border/70 pt-3 text-[12.5px]">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Priority</dt>
          <dd>
            <StatusPill tone={priorityTone(request.priority)}>
              {request.priority || "not set"}
            </StatusPill>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Reported by</dt>
          <dd className="truncate font-medium text-foreground">
            {request.tenants ? tenantName(request.tenants) : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Logged</dt>
          <dd className="text-foreground tabular">{formatDate(request.created_at)}</dd>
        </div>
        {request.scheduled_date ? (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Scheduled</dt>
            <dd className="text-foreground tabular">{formatDate(request.scheduled_date)}</dd>
          </div>
        ) : null}
        {request.estimated_cost ? (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Estimated</dt>
            <dd className="font-medium text-foreground tabular">
              {formatCurrency(request.estimated_cost)}
            </dd>
          </div>
        ) : null}
        {request.contractor_name ? (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Contractor</dt>
            <dd className="truncate font-medium text-foreground">{request.contractor_name}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-3 flex items-center gap-1.5 border-t border-border/70 pt-3">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 flex-1 rounded-lg bg-card text-[12.5px]"
        >
          <Link href={`/dashboard/maintenance/${request.id}`}>View details</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 flex-1 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground"
        >
          <Link href={`/dashboard/maintenance/${request.id}/edit`}>Edit</Link>
        </Button>
      </div>
    </article>
  )
}

function RequestGrid({ requests }: { requests: MaintenanceRequestRow[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} />
      ))}
    </div>
  )
}

export default function MaintenancePage() {
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMaintenanceRequests = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("maintenance_requests")
          .select(`
            *,
            properties (name, address),
            tenants (full_name, first_name, last_name)
          `)
          .order("created_at", { ascending: false })

        if (error) throw error
        setMaintenanceRequests((data || []) as MaintenanceRequestRow[])
      } catch (err: any) {
        console.error("[bower] fetch maintenance error", err)
        setError(err.message || "Failed to load maintenance requests")
      } finally {
        setLoading(false)
      }
    }
    fetchMaintenanceRequests()
  }, [])

  const openRequests = maintenanceRequests.filter((req) => req.status === "open")
  const inProgressRequests = maintenanceRequests.filter((req) => req.status === "in_progress")
  const completedRequests = maintenanceRequests.filter((req) => req.status === "completed")
  const urgentOpen = maintenanceRequests.filter(
    (req) =>
      (req.priority || "").toLowerCase() === "urgent" &&
      req.status !== "completed" &&
      req.status !== "cancelled",
  )

  const tabTriggerClass =
    "h-8 flex-none rounded-lg px-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-none"

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Service"
        title="Maintenance"
        description="Work orders across your portfolio — triage by priority, track the fix, close the loop."
        actions={
          <Button asChild size="sm" className="rounded-lg">
            <Link href="/dashboard/maintenance/new">
              <Plus /> New request
            </Link>
          </Button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/[0.05] px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[124px] animate-pulse rounded-2xl border border-border/70 bg-card"
              />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[236px] animate-pulse rounded-2xl border border-border/70 bg-card"
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Open requests"
              value={openRequests.length}
              icon={Wrench}
              accent="amber"
              hint={openRequests.length === 0 ? "Nothing waiting" : "Awaiting assignment"}
            />
            <StatCard
              label="In progress"
              value={inProgressRequests.length}
              icon={Clock}
              accent="indigo"
              hint={inProgressRequests.length === 0 ? "No work under way" : "Work under way"}
            />
            <StatCard
              label="Urgent"
              value={urgentOpen.length}
              icon={AlertTriangle}
              accent="coral"
              hint={urgentOpen.length === 0 ? "Nothing urgent" : "Open or in progress"}
            />
            <StatCard
              label="Completed"
              value={completedRequests.length}
              icon={CheckCircle2}
              accent="emerald"
              hint={`${maintenanceRequests.length} requests logged`}
            />
          </div>

          <Tabs defaultValue="open" className="gap-4">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-border/80 bg-card p-1 shadow-card">
              <TabsTrigger value="open" className={tabTriggerClass}>
                Open
                <span className="tabular text-[11px] opacity-70">{openRequests.length}</span>
              </TabsTrigger>
              <TabsTrigger value="in_progress" className={tabTriggerClass}>
                In progress
                <span className="tabular text-[11px] opacity-70">{inProgressRequests.length}</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className={tabTriggerClass}>
                Completed
                <span className="tabular text-[11px] opacity-70">{completedRequests.length}</span>
              </TabsTrigger>
              <TabsTrigger value="all" className={tabTriggerClass}>
                All requests
                <span className="tabular text-[11px] opacity-70">{maintenanceRequests.length}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="open">
              {openRequests.length > 0 ? (
                <RequestGrid requests={openRequests} />
              ) : (
                <Panel bodyClassName="p-0">
                  <EmptyBlock
                    icon={CheckCircle2}
                    title="No open requests"
                    description="Everything has been triaged. New requests land here the moment they are logged."
                    actionHref="/dashboard/maintenance/new"
                    actionLabel="Create request"
                  />
                </Panel>
              )}
            </TabsContent>

            <TabsContent value="in_progress">
              {inProgressRequests.length > 0 ? (
                <RequestGrid requests={inProgressRequests} />
              ) : (
                <Panel bodyClassName="p-0">
                  <EmptyBlock
                    icon={Clock}
                    title="Nothing in progress"
                    description="Requests you move into progress appear here with their contractor and schedule."
                  />
                </Panel>
              )}
            </TabsContent>

            <TabsContent value="completed">
              {completedRequests.length > 0 ? (
                <RequestGrid requests={completedRequests} />
              ) : (
                <Panel bodyClassName="p-0">
                  <EmptyBlock
                    icon={CheckCircle2}
                    title="No completed work yet"
                    description="Closed work orders are kept here with their final cost and completion date."
                  />
                </Panel>
              )}
            </TabsContent>

            <TabsContent value="all">
              {maintenanceRequests.length > 0 ? (
                <RequestGrid requests={maintenanceRequests} />
              ) : (
                <Panel bodyClassName="p-0">
                  <EmptyBlock
                    icon={Wrench}
                    title="No maintenance requests yet"
                    description="Log the first fault and it will show up here with its priority, status and property."
                    actionHref="/dashboard/maintenance/new"
                    actionLabel="Create first request"
                  />
                </Panel>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
