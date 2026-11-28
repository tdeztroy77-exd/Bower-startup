"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Plus, Search, UserCheck, Users, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { StatusPill, statusTone } from "@/components/dashboard/status-pill"
import { SearchInput } from "@/components/search-input"
import { formatDate, formatKenyaCurrency, tenantName } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  if (!parts.length || name === "—") return "?"
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? tenants.filter((t) => {
        const q = query.toLowerCase()
        const name = (t.full_name || `${t.first_name || ""} ${t.last_name || ""}`).toLowerCase()
        return (
          name.includes(q) ||
          t.email?.toLowerCase().includes(q) ||
          t.phone?.toLowerCase().includes(q) ||
          t.national_id?.toLowerCase().includes(q) ||
          t.properties?.name?.toLowerCase().includes(q)
        )
      })
    : tenants

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("tenants")
          .select(`
            *,
            properties (
              name,
              address
            )
          `)
          .order("created_at", { ascending: false })

        if (error) throw error
        setTenants(data || [])
      } catch (err: any) {
        console.error("[bower] fetch tenants error", err)
        setError(err.message || "Failed to load tenants")
      } finally {
        setLoading(false)
      }
    }

    fetchTenants()
  }, [])

  const active = tenants.filter((t) => t.status === "active").length
  const rentRoll = tenants.reduce((sum, t) => sum + (Number(t.monthly_rent) || 0), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Portfolio"
        title="Tenants"
        description="Everyone renting from you — contact details, lease dates and rent."
        actions={
          <Button asChild size="sm" className="rounded-lg">
            <Link href="/dashboard/tenants/new">
              <Plus /> Add tenant
            </Link>
          </Button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/[0.05] px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-[124px] animate-pulse rounded-2xl border border-border/70 bg-card" />
          ))
        ) : (
          <>
            <StatCard label="Tenants" value={tenants.length} icon={Users} hint="On record" />
            <StatCard
              label="Active"
              value={active}
              icon={UserCheck}
              accent="indigo"
              hint={tenants.length ? `${Math.round((active / tenants.length) * 100)}% of tenants` : "No tenants yet"}
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

      {tenants.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by name, email, phone or property…"
            className="w-full sm:max-w-sm"
          />
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {tenants.length} {tenants.length === 1 ? "tenant" : "tenants"}
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading tenants
        </div>
      ) : tenants.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyBlock
            icon={Users}
            title="No tenants yet"
            description="Add your first tenant to start tracking leases, payments and contact details."
            actionHref="/dashboard/tenants/new"
            actionLabel="Add your first tenant"
          />
        </Panel>
      ) : filtered.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyBlock
            icon={Search}
            title="No tenants match"
            description={`Nothing matches “${query}”. Try a different name, email, phone or property.`}
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
                  <th>Tenant</th>
                  <th className="hidden md:table-cell">Property</th>
                  <th>Status</th>
                  <th className="hidden lg:table-cell">Lease ends</th>
                  <th className="text-right">Monthly rent</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tenant) => {
                  const name = tenantName(tenant)
                  return (
                    <tr key={tenant.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                            {initials(name)}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/tenants/${tenant.id}`}
                              className="block truncate text-[13.5px] font-medium text-foreground hover:text-pine"
                            >
                              {name}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">{tenant.email || tenant.phone || "No contact details"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell">
                        <span className="text-[13px] text-muted-foreground">{tenant.properties?.name || "—"}</span>
                      </td>
                      <td>
                        <StatusPill tone={statusTone(tenant.status)} dot>
                          {tenant.status || "unknown"}
                        </StatusPill>
                      </td>
                      <td className="hidden lg:table-cell">
                        <span className="text-[13px] tabular text-muted-foreground">{formatDate(tenant.lease_end_date)}</span>
                      </td>
                      <td className="text-right">
                        <span className="text-[13.5px] font-semibold tabular text-foreground">
                          {tenant.monthly_rent != null && tenant.monthly_rent !== ""
                            ? formatKenyaCurrency(tenant.monthly_rent)
                            : "—"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-xs text-muted-foreground hover:text-pine">
                            <Link href={`/dashboard/tenants/${tenant.id}`}>View</Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-xs text-muted-foreground hover:text-pine">
                            <Link href={`/dashboard/tenants/${tenant.id}/edit`}>Edit</Link>
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
