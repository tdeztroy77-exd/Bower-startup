import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Building2, CircleDollarSign, MapPin, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { PropertyMap, type MapProperty } from "@/components/property-map"
import { RegeocodeButton } from "@/components/regeocode-button"
import { getDb, neonConfigured } from "@/lib/db/neon"
import { createClient } from "@/lib/supabase/server"
import { formatKenyaCurrency } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Properties map — Bower",
  description: "Every property pinned. Click for details.",
}

export const dynamic = "force-dynamic"

type PropertyRow = {
  id: string
  name: string
  address: string
  city: string | null
  county: string | null
  status: string | null
  rent_amount: number | string | null
  latitude?: number | string | null
  longitude?: number | string | null
}

function toMapProperty(row: PropertyRow): MapProperty | null {
  const latitude = Number(row.latitude)
  const longitude = Number(row.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  const status: MapProperty["status"] =
    row.status === "occupied" ? "rented" : row.status === "vacant" ? "available" : row.status as MapProperty["status"]

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city ?? undefined,
    county: row.county ?? undefined,
    latitude,
    longitude,
    status: status ?? "unknown",
    rent_amount: row.rent_amount != null ? Number(row.rent_amount) : undefined,
  }
}

async function loadProperties(): Promise<MapProperty[]> {
  const supa = await createClient()
  const withCoordinates = await supa
    .from("properties")
    .select("id, name, address, city, county, latitude, longitude, status, rent_amount")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("created_at", { ascending: false })

  if (!withCoordinates.error) {
    return (withCoordinates.data ?? []).map((row: PropertyRow) => toMapProperty(row)).filter((row: MapProperty | null): row is MapProperty => row !== null)
  }

  // Older Supabase schemas may not have geocoding columns yet. Keep the map
  // usable and let the total-property count still reflect real data.
  console.warn("[properties map] coordinate columns unavailable; showing empty map", withCoordinates.error.message)
  return []
}

export default async function PropertiesMapPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || "").trim().toLowerCase()
  const allProperties = await loadProperties()
  const properties = query ? allProperties.filter((property) => [property.name, property.address, property.city, property.county].filter(Boolean).join(" ").toLowerCase().includes(query)) : allProperties
  const geocoded = properties.length
  const total = await countAll()
  const locations = Object.entries(properties.reduce<Record<string, number>>((groups, property) => { const key = property.city || property.county || "Unspecified"; groups[key] = (groups[key] || 0) + 1; return groups }, {})).sort((a, b) => b[1] - a[1])
  const occupied = properties.filter((property) => property.status === "rented").length
  const monthlyRent = properties.reduce((sum, property) => sum + (property.rent_amount || 0), 0)
  const coverage = total ? Math.round((geocoded / total) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to properties
        </Link>
        <PageHeader
          eyebrow="Portfolio"
          title="Properties map"
          description="Every geocoded property pinned. Hover for quick stats; click a pin to open the property."
          actions={<RegeocodeButton />}
        />
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-card">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-center" method="get">
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search city, county, or property"
            aria-label="Search locations"
            className="sm:max-w-sm"
          />
          <Button type="submit" variant="outline" size="sm" className="rounded-lg bg-card">
            Search
          </Button>
          <p className="text-xs text-muted-foreground sm:ml-auto">
            {geocoded} mapped {query ? `· matching “${query}”` : geocoded === 1 ? "property" : "properties"}
          </p>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="On the map"
          value={geocoded}
          icon={MapPin}
          hint={total ? `${coverage}% of properties mapped` : "No properties yet"}
        />
        <StatCard
          label="Total properties"
          value={total}
          icon={Building2}
          accent="slate"
          hint="Portfolio size"
        />
        <StatCard
          label="Need geocoding"
          value={Math.max(0, total - geocoded)}
          icon={RefreshCw}
          accent="amber"
          hint="No coordinates yet"
        />
        <StatCard
          label="Monthly rent mapped"
          value={formatKenyaCurrency(monthlyRent)}
          icon={CircleDollarSign}
          accent="indigo"
          hint={`${occupied} occupied of ${geocoded} mapped`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <PropertyMap properties={properties} height={560} />

        <Panel title="Coverage" description="What the pins represent.">
          <dl className="divide-y divide-border/60">
            <div className="flex items-start justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-muted-foreground">Top location</dt>
              <dd className="text-right text-[13.5px] font-medium text-foreground">
                {locations[0]?.[0] || "—"}
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {locations[0] ? `${locations[0][1]} ${locations[0][1] === 1 ? "property" : "properties"}` : "Add location data to see concentration"}
                </span>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-muted-foreground">Mapped</dt>
              <dd className="text-right text-[13.5px] font-medium tabular text-foreground">
                {geocoded} of {total}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-muted-foreground">Occupied</dt>
              <dd className="text-right text-[13.5px] font-medium tabular text-foreground">
                {occupied} of {geocoded}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-muted-foreground">Coverage</dt>
              <dd className="text-right text-[13.5px] font-medium tabular text-foreground">{coverage}%</dd>
            </div>
          </dl>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-pine" style={{ width: `${Math.min(100, coverage)}%` }} />
          </div>
        </Panel>
      </div>

      <Panel title="Portfolio by location" description="Property concentration by city or county." bodyClassName="p-0">
        {locations.length === 0 ? (
          <EmptyBlock
            icon={MapPin}
            title="No location data yet"
            description="Add a city or county to a property to see concentration here."
            actionHref="/dashboard/properties"
            actionLabel="Review properties"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th className="text-right">Properties</th>
                  <th className="hidden text-right sm:table-cell">Share</th>
                </tr>
              </thead>
              <tbody>
                {locations.slice(0, 8).map(([location, count]) => (
                  <tr key={location}>
                    <td className="text-[13.5px] font-medium text-foreground">{location}</td>
                    <td className="text-right text-[13.5px] font-semibold tabular text-foreground">{count}</td>
                    <td className="hidden text-right text-xs tabular text-muted-foreground sm:table-cell">
                      {geocoded ? Math.round((count / geocoded) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="How pins are placed" description="Coordinates come from OpenStreetMap.">
        <p className="text-[13.5px] leading-6 text-muted-foreground">
          Each property is projected from its latitude and longitude. Use{" "}
          <span className="font-medium text-foreground">Update locations</span> to fill in coordinates
          automatically using OpenStreetMap Nominatim — free, no API key. Records with an address but no
          coordinates stay off the map until they are matched.
        </p>
      </Panel>
    </div>
  )
}

async function countAll(): Promise<number> {
  if (neonConfigured()) {
    try {
      const sql = getDb()
      const rows = await sql`select count(*)::int as n from public.properties`
      return rows[0]?.n ?? 0
    } catch (err) {
      // Neon is unreachable — fall back to Supabase rather than reporting 0.
      console.warn("[properties map] neon count failed, falling back to supabase", err)
    }
  }
  const supa = await createClient()
  const { count } = await supa.from("properties").select("*", { count: "exact", head: true })
  return count ?? 0
}
