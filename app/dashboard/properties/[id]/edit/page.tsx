"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Building2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { PropertyForm } from "@/components/property-form"
import { createClient } from "@/lib/supabase/client"

export default function EditPropertyPage() {
  const params = useParams<{ id: string }>()
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!params?.id) return
    const fetchProperty = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .eq("id", params.id)
          .maybeSingle()
        if (error) throw error
        if (!data) setNotFound(true)
        else setProperty(data)
      } catch (error) {
        console.error("[bower] fetch property error", error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchProperty()
  }, [params?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading property
      </div>
    )
  }

  if (notFound || !property) {
    return (
      <Panel bodyClassName="p-0">
        <EmptyBlock
          icon={Building2}
          title="Property not found"
          description="It may have been removed, or the link is out of date."
          actionHref="/dashboard/properties"
          actionLabel="Back to properties"
        />
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Editing property"
        title={property.name}
        description="Update the recorded details for this property."
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
            <Link href={`/dashboard/properties/${property.id}`}>
              <ArrowLeft /> Back to property
            </Link>
          </Button>
        }
      />

      <PropertyForm property={property} isEditing={true} />
    </div>
  )
}
