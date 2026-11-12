"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  BarChart3,
  Briefcase,
  Building2,
  ClipboardList,
  Contact,
  CreditCard,
  FileStack,
  FileText,
  GitMerge,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Map,
  Menu,
  Settings,
  ShieldAlert,
  Smartphone,
  StickyNote,
  Users,
  Wallet,
  Wrench,
} from "lucide-react"
import { signOut } from "@/lib/actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BrandWordmark } from "@/components/brand-mark"

type NavItem = { name: string; href: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Properties", href: "/dashboard/properties", icon: Building2 },
      { name: "Property map", href: "/dashboard/properties/map", icon: Map },
      { name: "Tenants", href: "/dashboard/tenants", icon: Users },
      { name: "Contacts", href: "/dashboard/contacts", icon: Contact },
    ],
  },
  {
    label: "Money",
    items: [
      { name: "Finances", href: "/dashboard/finances", icon: Wallet },
      { name: "Paybill", href: "/dashboard/paybill", icon: Smartphone },
      { name: "Reconciliation", href: "/dashboard/reconciliation", icon: GitMerge },
      { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
      { name: "Quotations", href: "/dashboard/quotations", icon: ClipboardList },
      { name: "Damages", href: "/dashboard/damages", icon: ShieldAlert },
      { name: "Documents", href: "/dashboard/documents", icon: FileText },
      { name: "Notes", href: "/dashboard/notes", icon: StickyNote },
      { name: "Templates", href: "/dashboard/templates", icon: FileStack },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Organisation",
    items: [
      { name: "Company", href: "/dashboard/company", icon: Briefcase },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
]

interface SidebarProps {
  userEmail?: string
  userName?: string
  companyName?: string | null
}

function initials(name?: string | null, email?: string): string {
  const src = (name || email || "").trim()
  if (!src) return "?"
  return (
    src
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || "")
      .join("") || "?"
  )
}

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function SidebarContent({ userEmail, userName, companyName, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="flex h-16 shrink-0 items-center px-5">
        <BrandWordmark href="/dashboard" size="md" subtitle={companyName || "Property operations"} showSubtitle />
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 pb-2">
        <nav aria-label="Dashboard navigation" className="flex flex-col gap-5 py-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isActiveRoute(pathname, item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      <item.icon
                        className={cn("size-[17px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}
                        strokeWidth={1.9}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <Link
          href="/help"
          onClick={onNavigate}
          className="mb-2 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
        >
          <LifeBuoy className="size-[17px] text-muted-foreground" strokeWidth={1.9} />
          Help &amp; support
        </Link>

        <div className="flex items-center gap-2.5 rounded-xl bg-muted/50 p-2.5">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-secondary text-[11px] font-semibold text-primary">
              {initials(userName, userEmail)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold leading-4 text-foreground">
              {userName || companyName || "Your workspace"}
            </p>
            <p className="truncate text-[11px] leading-4 text-muted-foreground">{userEmail}</p>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export function DashboardSidebar({ userEmail, userName, companyName }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-sidebar-border md:block">
      <SidebarContent userEmail={userEmail} userName={userName} companyName={companyName} />
    </aside>
  )
}

/** Mobile-only nav trigger used inside the workspace top bar. */
export function SidebarMobileTrigger({ userEmail, userName, companyName }: SidebarProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Open navigation"
        className="md:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] border-r border-border p-0">
          <SidebarContent
            userEmail={userEmail}
            userName={userName}
            companyName={companyName}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
