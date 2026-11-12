"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Loader2, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { MaintenanceForm } from "@/components/maintenance-form"
import { createClient } from "@/lib/supabase/client"

export default function EditMaintenancePage() {
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
          .select("*")
          .eq("id", params.id)
          .maybeSingle()
        if (error) throw error
        if (!data) setNotFound(true)
        else setMaintenanceRequest(data)
      } catch (error) {
        console.error("[bower] fetch maintenance request error", error)
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

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Service · Edit"
        title={maintenanceRequest.title || "Untitled request"}
        description="Change the details, priority, schedule or cost. Saving returns you to the queue."
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
            <Link href={`/dashboard/maintenance/${maintenanceRequest.id}`}>
              <ArrowLeft /> View work order
            </Link>
          </Button>
        }
      />

      <MaintenanceForm maintenanceRequest={maintenanceRequest} isEditing={true} />
    </div>
  )
}
