"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Bath, Bed, Building2, Calendar, Loader2, Pencil, Square, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { StatusPill, statusTone } from "@/components/dashboard/status-pill"
import { DeleteButton } from "@/components/delete-button"
import { PropertyPhotoGallery } from "@/components/property-photo-gallery"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, tenantName } from "@/lib/utils"

function propertyTone(status?: string | null) {
  return status === "maintenance" ? "warning" : statusTone(status)
}

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  if (!parts.length) return "—"
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-right text-[13.5px] font-medium text-foreground">{children}</dd>
    </div>
  )
}

export default function PropertyPage() {
  const params = useParams<{ id: string }>()
  const [property, setProperty] = useState<any>(null)
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!params?.id) return
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const [propRes, tenantsRes] = await Promise.all([
          supabase.from("properties").select("*").eq("id", params.id).maybeSingle(),
          supabase.from("tenants").select("*").eq("property_id", params.id).eq("status", "active"),
        ])
        if (!propRes.data) {
          setNotFound(true)
        } else {
          setProperty(propRes.data)
        }
        setTenants(tenantsRes.data || [])
      } catch (error) {
        console.error("[bower] fetch property error", error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
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

  const rent = property.rent_amount ?? property.monthly_rent
  const size = property.size_sqft ?? property.square_feet

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Property"
        title={property.name}
        description={property.address}
        actions={
          <>
            <StatusPill tone={propertyTone(property.status)} dot>
              {property.status || "unknown"}
            </StatusPill>
            <Button asChild size="sm" variant="outline" className="rounded-lg bg-card">
              <Link href={`/dashboard/properties/${property.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <DeleteButton
              endpoint={`/api/properties/${property.id}`}
              resource="property"
              redirectTo="/dashboard/properties"
              className="rounded-lg bg-card text-destructive hover:text-destructive"
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Property details" description="Recorded facts for this unit.">
          <dl className="divide-y divide-border/60">
            <Field label="Type">
              <span className="capitalize">{property.type || property.property_type || "—"}</span>
            </Field>
            {property.bedrooms != null ? (
              <Field label="Bedrooms">
                <span className="inline-flex items-center gap-1.5">
                  <Bed className="size-3.5 text-muted-foreground" /> {property.bedrooms}
                </span>
              </Field>
            ) : null}
            {property.bathrooms != null ? (
              <Field label="Bathrooms">
                <span className="inline-flex items-center gap-1.5">
                  <Bath className="size-3.5 text-muted-foreground" /> {property.bathrooms}
                </span>
              </Field>
            ) : null}
            {size ? (
              <Field label="Size">
                <span className="inline-flex items-center gap-1.5">
                  <Square className="size-3.5 text-muted-foreground" /> {Number(size).toLocaleString()} sqft
                </span>
              </Field>
            ) : null}
            {rent ? (
              <Field label="Monthly rent">
                <span className="tabular text-primary">{formatCurrency(rent)}</span>
              </Field>
            ) : null}
            {property.deposit_amount ? (
              <Field label="Security deposit">
                <span className="tabular">{formatCurrency(property.deposit_amount)}</span>
              </Field>
            ) : null}
            <Field label="Created">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" /> {formatDate(property.created_at)}
              </span>
            </Field>
          </dl>
        </Panel>

        <Panel
          title="Current tenants"
          description={tenants.length > 0 ? `${tenants.length} active ${tenants.length === 1 ? "tenant" : "tenants"}` : "No active tenants"}
          bodyClassName={tenants.length > 0 ? undefined : "p-0"}
        >
          {tenants.length > 0 ? (
            <div className="space-y-2">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                      {initials(tenantName(tenant))}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-foreground">{tenantName(tenant)}</p>
                      <p className="truncate text-xs text-muted-foreground">{tenant.email}</p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shrink-0 rounded-lg bg-card">
                    <Link href={`/dashboard/tenants/${tenant.id}`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock
              icon={Users}
              title="No tenants assigned"
              description="Add a tenant and link them to this property to start tracking rent."
              actionHref="/dashboard/tenants/new"
              actionLabel="Add tenant"
            />
          )}
        </Panel>
      </div>

      {property.description || (property.amenities && property.amenities.length > 0) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {property.description ? (
            <Panel title="Description">
              <p className="whitespace-pre-wrap text-[13.5px] leading-6 text-muted-foreground">{property.description}</p>
            </Panel>
          ) : null}

          {property.amenities && property.amenities.length > 0 ? (
            <Panel title="Amenities">
              <div className="flex flex-wrap gap-1.5">
                {property.amenities.map((amenity: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>
      ) : null}

      <PropertyPhotoGallery propertyId={params.id} />
    </div>
  )
}
