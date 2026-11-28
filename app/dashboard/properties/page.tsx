"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bath, Bed, Building2, DoorClosed, DoorOpen, Loader2, MapPin, Plus, Search, Square, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { StatusPill, statusTone } from "@/components/dashboard/status-pill"
import { SearchInput } from "@/components/search-input"
import { formatKenyaCurrency } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

function propertyTone(status?: string | null) {
  return status === "maintenance" ? "warning" : statusTone(status)
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? properties.filter((p) => {
        const q = query.toLowerCase()
        return (
          p.name?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          p.county?.toLowerCase().includes(q) ||
          p.type?.toLowerCase().includes(q)
        )
      })
    : properties

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const supabase = createClient()
        // Pull cover photos too in a single round trip via the FK relationship.
        const { data, error } = await supabase
          .from("properties")
          .select("*, property_photos(file_url, is_cover, display_order)")
          .order("created_at", { ascending: false })

        if (error) throw error
        // Compute a cover_url per property (first is_cover=true, else first photo, else null)
        const withCover = (data || []).map((p: any) => {
          const photos = (p.property_photos || []) as any[]
          const cover = photos.find((ph) => ph.is_cover) || photos.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0]
          return { ...p, cover_url: cover?.file_url || null }
        })
        setProperties(withCover)
      } catch (err: any) {
        console.error("[bower] fetch properties error", err)
        setError(err.message || "Failed to load properties")
      } finally {
        setLoading(false)
      }
    }

    fetchProperties()
  }, [])

  const rentFor = (property: any) => property.rent_amount ?? property.monthly_rent
  const occupied = properties.filter((p) => p.status === "occupied").length
  const available = properties.filter((p) => p.status === "vacant" || p.status === "available").length
  const rentRoll = properties.reduce((sum, p) => sum + (Number(rentFor(p)) || 0), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Portfolio"
        title="Properties"
        description="Every rental property you manage — location, status and rent in one list."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
              <Link href="/dashboard/properties/map">
                <MapPin /> View map
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-lg">
              <Link href="/dashboard/properties/new">
                <Plus /> Add property
              </Link>
            </Button>
          </>
        }
      />

      {error ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/[0.05] px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[124px] animate-pulse rounded-2xl border border-border/70 bg-card" />
          ))
        ) : (
          <>
            <StatCard
              label="Properties"
              value={properties.length}
              icon={Building2}
              href="/dashboard/properties"
              hint="In your portfolio"
            />
            <StatCard
              label="Occupied"
              value={occupied}
              icon={DoorClosed}
              accent="indigo"
              hint={properties.length ? `${Math.round((occupied / properties.length) * 100)}% of properties` : "No properties yet"}
            />
            <StatCard
              label="Vacant"
              value={available}
              icon={DoorOpen}
              accent="amber"
              hint="Ready to let"
            />
            <StatCard
              label="Monthly rent roll"
              value={formatKenyaCurrency(rentRoll)}
              icon={Wallet}
              accent="slate"
              hint="Across recorded rents"
            />
          </>
        )}
      </div>

      {properties.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by name, address, city or type…"
            className="w-full sm:max-w-sm"
          />
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {properties.length} {properties.length === 1 ? "property" : "properties"}
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading properties
        </div>
      ) : properties.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyBlock
            icon={Building2}
            title="No properties yet"
            description="Add your first rental property to track tenants, rent and maintenance in one place."
            actionHref="/dashboard/properties/new"
            actionLabel="Add your first property"
          />
        </Panel>
      ) : filtered.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyBlock
            icon={Search}
            title="No properties match"
            description={`Nothing matches “${query}”. Try a different name, address, city or type.`}
            action={
              <Button variant="outline" size="sm" className="mt-4 rounded-lg bg-card" onClick={() => setQuery("")}>
                Clear search
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th className="hidden md:table-cell">Type</th>
                  <th>Status</th>
                  <th className="hidden lg:table-cell">Layout</th>
                  <th className="text-right">Monthly rent</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((property) => {
                  const rent = rentFor(property)
                  const size = property.size_sqft || property.square_feet
                  return (
                    <tr key={property.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {property.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={property.cover_url}
                              alt=""
                              className="size-10 shrink-0 rounded-lg border border-border/70 object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-pine">
                              <Building2 className="size-4" strokeWidth={1.9} />
                            </span>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/properties/${property.id}`}
                              className="block truncate text-[13.5px] font-medium text-foreground hover:text-pine"
                            >
                              {property.name}
                            </Link>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3 shrink-0" />
                              <span className="max-w-[210px] truncate">{property.address}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell">
                        <span className="text-[13px] capitalize text-muted-foreground">
                          {property.type || property.property_type || "—"}
                        </span>
                      </td>
                      <td>
                        <StatusPill tone={propertyTone(property.status)} dot>
                          {property.status || "unknown"}
                        </StatusPill>
                      </td>
                      <td className="hidden lg:table-cell">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {property.bedrooms != null ? (
                            <span className="inline-flex items-center gap-1">
                              <Bed className="size-3" /> {property.bedrooms}
                            </span>
                          ) : null}
                          {property.bathrooms != null ? (
                            <span className="inline-flex items-center gap-1">
                              <Bath className="size-3" /> {property.bathrooms}
                            </span>
                          ) : null}
                          {size ? (
                            <span className="inline-flex items-center gap-1">
                              <Square className="size-3" /> {Number(size).toLocaleString()}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="text-right">
                        <span className="text-[13.5px] font-semibold tabular text-foreground">
                          {rent ? formatKenyaCurrency(rent) : "—"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-xs text-muted-foreground hover:text-pine">
                            <Link href={`/dashboard/properties/${property.id}`}>View</Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-xs text-muted-foreground hover:text-pine">
                            <Link href={`/dashboard/properties/${property.id}/edit`}>Edit</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  )
}
