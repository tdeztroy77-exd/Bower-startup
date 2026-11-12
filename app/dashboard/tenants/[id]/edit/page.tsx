"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { TenantForm } from "@/components/tenant-form"
import { createClient } from "@/lib/supabase/client"
import { tenantName } from "@/lib/utils"

export default function EditTenantPage() {
  const params = useParams<{ id: string }>()
  const [tenant, setTenant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!params?.id) return
    const fetchTenant = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", params.id)
          .maybeSingle()
        if (error) throw error
        if (!data) setNotFound(true)
        else setTenant(data)
      } catch (error) {
        console.error("[bower] fetch tenant error", error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchTenant()
  }, [params?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading tenant
      </div>
    )
  }

  if (notFound || !tenant) {
    return (
      <Panel bodyClassName="p-0">
        <EmptyBlock
          icon={Users}
          title="Tenant not found"
          description="It may have been removed, or the link is out of date."
          actionHref="/dashboard/tenants"
          actionLabel="Back to tenants"
        />
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Editing tenant"
        title={tenantName(tenant)}
        description="Update contact details, lease dates and rent for this tenant."
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
            <Link href={`/dashboard/tenants/${tenant.id}`}>
              <ArrowLeft /> Back to tenant
            </Link>
          </Button>
        }
      />

      <TenantForm tenant={tenant} isEditing={true} />
    </div>
  )
}
