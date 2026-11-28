"use client"

import { useEffect, useMemo, useState } from "react"
import { ContactRound, Loader2, NotebookText, Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { SearchInput } from "@/components/search-input"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Contact = { id: string; name: string; role: string; email: string | null; phone: string | null; company: string | null; source: "contact" | "tenant" | "emergency" }

const sourceLabel: Record<Contact["source"], string> = {
  contact: "Saved contact",
  tenant: "From tenants",
  emergency: "From tenant emergency contact",
}

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  if (!parts.length) return "?"
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    Promise.all([
      supabase.from("contacts").select("id, name, role, email, phone, company"),
      supabase.from("tenants").select("id, full_name, first_name, last_name, email, phone, emergency_contact_name, emergency_contact_phone"),
    ]).then(([contactsResult, tenantsResult]) => {
      if (!active) return
      if (contactsResult.error) {
        setError(contactsResult.error.message)
        setLoading(false)
        return
      }
      if (tenantsResult.error) {
        setError(tenantsResult.error.message)
        setLoading(false)
        return
      }

      const savedContacts: Contact[] = (contactsResult.data ?? []).map((contact) => ({
        ...contact,
        source: "contact" as const,
      }))
      const tenantContacts: Contact[] = []
      for (const tenant of tenantsResult.data ?? []) {
        const name = tenant.full_name || [tenant.first_name, tenant.last_name].filter(Boolean).join(" ") || "Unnamed tenant"
        tenantContacts.push({
          id: `tenant-${tenant.id}`,
          name,
          role: "tenant",
          email: tenant.email,
          phone: tenant.phone,
          company: null,
          source: "tenant",
        })
        if (tenant.emergency_contact_name || tenant.emergency_contact_phone) {
          tenantContacts.push({
            id: `emergency-${tenant.id}`,
            name: tenant.emergency_contact_name || "Emergency contact",
            role: "emergency contact",
            email: null,
            phone: tenant.emergency_contact_phone,
            company: null,
            source: "emergency",
          })
        }
      }
      setContacts([...savedContacts, ...tenantContacts].sort((a, b) => a.name.localeCompare(b.name)))
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return contacts
    return contacts.filter((contact) => [contact.name, contact.role, contact.email, contact.phone, contact.company].some((field) => field?.toLowerCase().includes(value)))
  }, [contacts, query])

  const fromTenants = contacts.filter((contact) => contact.source !== "contact").length
  const saved = contacts.length - fromTenants

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Directory"
        title="Contacts"
        description="Your tenants, their emergency contacts and every contact saved to this workspace."
      />

      {error ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/[0.05] px-4 py-3 text-sm text-destructive">
          Could not load contacts: {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-[124px] animate-pulse rounded-2xl border border-border/70 bg-card" />
          ))
        ) : (
          <>
            <StatCard label="All contacts" value={contacts.length} icon={ContactRound} hint="In this directory" />
            <StatCard label="From tenants" value={fromTenants} icon={Users} accent="indigo" hint="Tenants and emergency contacts" />
            <StatCard label="Saved contacts" value={saved} icon={NotebookText} accent="slate" hint="Added by you" />
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by name, phone, email or company…"
          className="w-full sm:max-w-sm"
        />
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading contacts…" : `${filtered.length} of ${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"}`}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading your contacts
        </div>
      ) : contacts.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyBlock
            icon={ContactRound}
            title="No contacts yet"
            description="Only contacts saved in your account will appear here."
          />
        </Panel>
      ) : filtered.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyBlock
            icon={Search}
            title="No matching contacts"
            description={`Nothing matches “${query}”. Try a different name, phone, email or company.`}
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
                  <th>Name</th>
                  <th>Role</th>
                  <th className="hidden md:table-cell">Email</th>
                  <th className="hidden lg:table-cell">Phone</th>
                  <th className="hidden xl:table-cell">Company</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                          {initials(contact.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-medium text-foreground">{contact.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{sourceLabel[contact.source]}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                          contact.role === "tenant"
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {contact.role}
                      </span>
                    </td>
                    <td className="hidden md:table-cell">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-[13px] text-muted-foreground hover:text-pine">
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell">
                      {contact.phone ? (
                        <a href={`tel:${contact.phone}`} className="text-[13px] tabular text-muted-foreground hover:text-pine">
                          {contact.phone}
                        </a>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden xl:table-cell">
                      <span className="text-[13px] text-muted-foreground">{contact.company || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  )
}
