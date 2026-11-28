"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, CornerDownLeft } from "lucide-react"
import {
  BarChart3, Briefcase, Building2, ClipboardList, Contact, CreditCard, FileStack, FileText,
  GitMerge, LayoutDashboard, Map, Settings, ShieldAlert, Smartphone, StickyNote, Users, Wallet, Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"

const destinations = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Workspace" },
  { name: "Properties", href: "/dashboard/properties", icon: Building2, group: "Workspace" },
  { name: "Property map", href: "/dashboard/properties/map", icon: Map, group: "Workspace" },
  { name: "Tenants", href: "/dashboard/tenants", icon: Users, group: "Workspace" },
  { name: "Contacts", href: "/dashboard/contacts", icon: Contact, group: "Workspace" },
  { name: "Finances", href: "/dashboard/finances", icon: Wallet, group: "Money" },
  { name: "Record a payment", href: "/dashboard/finances/payments/new", icon: Wallet, group: "Money" },
  { name: "Add an expense", href: "/dashboard/finances/expenses/new", icon: Wallet, group: "Money" },
  { name: "Paybill", href: "/dashboard/paybill", icon: Smartphone, group: "Money" },
  { name: "Reconciliation", href: "/dashboard/reconciliation", icon: GitMerge, group: "Money" },
  { name: "Billing & plan", href: "/dashboard/billing", icon: CreditCard, group: "Money" },
  { name: "Maintenance", href: "/dashboard/maintenance", icon: Wrench, group: "Operations" },
  { name: "Quotations", href: "/dashboard/quotations", icon: ClipboardList, group: "Operations" },
  { name: "Damages", href: "/dashboard/damages", icon: ShieldAlert, group: "Operations" },
  { name: "Documents", href: "/dashboard/documents", icon: FileText, group: "Operations" },
  { name: "Notes", href: "/dashboard/notes", icon: StickyNote, group: "Operations" },
  { name: "Templates", href: "/dashboard/templates", icon: FileStack, group: "Operations" },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3, group: "Operations" },
  { name: "Company", href: "/dashboard/company", icon: Briefcase, group: "Organisation" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, group: "Organisation" },
]

/**
 * Workspace quick-jump. Not a global search backend — it is an honest,
 * keyboard-first navigator across the pages that actually exist, which is
 * what people reach for ⌘K to do.
 */
export function CommandSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return destinations.slice(0, 8)
    return destinations.filter((d) => d.name.toLowerCase().includes(q) || d.group.toLowerCase().includes(q)).slice(0, 8)
  }, [query])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    setQuery("")
    setActive(0)
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-9 w-full max-w-[380px] items-center gap-2.5 rounded-xl border border-border/80 bg-card px-3 text-left text-[13px] text-muted-foreground shadow-card transition-colors hover:border-pine/30 hover:text-foreground"
      >
        <Search className="size-4 shrink-0" strokeWidth={2} />
        <span className="truncate">Search properties, tenants, pages…</span>
        <kbd className="ml-auto hidden shrink-0 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground sm:block">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/25 px-4 pt-[12vh] backdrop-blur-[2px]">
          <div
            className="absolute inset-0"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Jump to a page"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-popover shadow-lift"
          >
            <div className="flex items-center gap-2.5 border-b border-border px-4">
              <Search className="size-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault()
                    setActive((i) => Math.min(i + 1, results.length - 1))
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault()
                    setActive((i) => Math.max(i - 1, 0))
                  }
                  if (e.key === "Enter" && results[active]) go(results[active].href)
                }}
                placeholder="Jump to…"
                className="h-12 w-full border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
              />
              <kbd className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">esc</kbd>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-1.5">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">No page matches “{query}”.</p>
              ) : (
                results.map((item, index) => (
                  <button
                    key={item.href}
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(item.href)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      index === active ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-muted/60",
                    )}
                  >
                    <item.icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.9} />
                    <span className="flex-1 truncate font-medium">{item.name}</span>
                    <span className="text-[11px] text-muted-foreground">{item.group}</span>
                    {index === active ? <CornerDownLeft className="size-3.5 text-muted-foreground" /> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
