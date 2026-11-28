import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Archive, Bell, Database, Download, Shield, User } from "lucide-react"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatusPill } from "@/components/dashboard/status-pill"
import { AccountingExport } from "@/components/accounting-export"
import { SmsSettingsCard } from "@/components/sms-settings-card"
import {
  updateProfile,
  updatePassword,
  updatePreferences,
  updateNotifications,
  signOutAllDevices,
} from "@/lib/actions/settings"

export const dynamic = "force-dynamic"

const tabTriggerClass =
  "h-9 w-full rounded-lg px-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  // Some queries hit tables that may not exist yet on a partial install.
  // Wrap each in try/catch so a missing table doesn't take down the page.
  const safeQuery = async <T,>(fn: () => Promise<{ data: T | null }>): Promise<T | null> => {
    try { return (await fn()).data } catch { return null }
  }

  const company = await safeQuery<{ name: string }>(() =>
    supabase.from("companies").select("name").eq("owner_id", user.id).maybeSingle(),
  )
  const workspaceName = company?.name || profile?.company_name || ""
  const notificationPreferences = (profile?.notification_preferences as Record<string, boolean> | null) || {}

  const [propertiesCount, tenantsCount, paymentsCount] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("tenants").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("rent_payments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ])

  const notificationRows = [
    {
      name: "rent_alerts",
      title: "Rent payment alerts",
      description: "When rent falls due or a payment is received.",
      enabled: notificationPreferences.rent_alerts ?? true,
    },
    {
      name: "maintenance_alerts",
      title: "Maintenance requests",
      description: "New work orders raised by tenants.",
      enabled: notificationPreferences.maintenance_alerts ?? true,
    },
    {
      name: "lease_alerts",
      title: "Lease expiry warnings",
      description: "Thirty days before a lease ends.",
      enabled: notificationPreferences.lease_alerts ?? true,
    },
    {
      name: "financial_reports",
      title: "Monthly reports",
      description: "A financial summary at the close of each month.",
      enabled: notificationPreferences.financial_reports ?? false,
    },
  ]

  const workspaceCounts = [
    { label: "Properties", value: propertiesCount.count || 0 },
    { label: "Tenants", value: tenantsCount.count || 0 },
    { label: "Payment records", value: paymentsCount.count || 0 },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        eyebrow="Workspace"
        description="Your identity, workspace preferences, security and data — all in one place."
      />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-border/80 bg-card p-1 sm:grid-cols-6">
          <TabsTrigger value="profile" className={tabTriggerClass}>
            <User className="size-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className={tabTriggerClass}>
            <span className="text-[13px] font-semibold">Prefs</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className={tabTriggerClass}>
            <Bell className="size-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className={tabTriggerClass}>
            <Shield className="size-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="data" className={tabTriggerClass}>
            <Database className="size-4" />
            <span>Data</span>
          </TabsTrigger>
          <TabsTrigger value="backup" asChild className={tabTriggerClass}>
            <a href="/dashboard/settings/backup">
              <Archive className="size-4" />
              <span>Backup</span>
            </a>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Panel title="Profile" description="How you appear across your workspace.">
            <form action={updateProfile} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    defaultValue={profile?.full_name || ""}
                    placeholder="e.g. Wanjiku Kamau"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-[11px] leading-4 text-muted-foreground">Email cannot be changed here.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={profile?.phone || ""}
                    placeholder="+254 700 000 000"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="company_name">Workspace name</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    defaultValue={workspaceName}
                    placeholder="e.g. Wangari Properties"
                    required
                  />
                  <p className="text-[11px] leading-4 text-muted-foreground">
                    Shown in the sidebar and on every report.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" defaultValue={profile?.city || ""} placeholder="Nairobi" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="county">County</Label>
                  <Input id="county" name="county" defaultValue={profile?.county || ""} placeholder="Nairobi County" />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={profile?.address || ""}
                    placeholder="Street, building, floor"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                <p className="text-[11px] text-muted-foreground">Changes are visible to your team immediately.</p>
                <Button type="submit" size="sm" className="rounded-lg">
                  Save changes
                </Button>
              </div>
            </form>
          </Panel>
        </TabsContent>

        <TabsContent value="preferences">
          <Panel title="Preferences" description="Defaults applied to money, dates and times.">
            <form action={updatePreferences} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Default currency</Label>
                  <Select name="currency" defaultValue={profile?.currency || "KES"}>
                    <SelectTrigger id="currency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">Kenyan Shilling (KES)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="date_format">Date format</Label>
                  <Select name="date_format" defaultValue={profile?.date_format || "DD/MM/YYYY"}>
                    <SelectTrigger id="date_format" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select name="timezone" defaultValue={profile?.timezone || "Africa/Nairobi"}>
                    <SelectTrigger id="timezone" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Nairobi">East Africa Time (EAT)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                <p className="text-[11px] text-muted-foreground">Used on every amount, receipt and due date.</p>
                <Button type="submit" size="sm" className="rounded-lg">
                  Save preferences
                </Button>
              </div>
            </form>
          </Panel>
        </TabsContent>

        <TabsContent value="notifications">
          <Panel title="Notifications" description="Choose what reaches you, and nothing else.">
            <form action={updateNotifications} className="space-y-5">
              <div className="space-y-2">
                {notificationRows.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/60 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <Label htmlFor={item.name} className="text-[13px] font-medium">
                        {item.title}
                      </Label>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch id={item.name} name={item.name} defaultChecked={item.enabled} />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                <p className="text-[11px] text-muted-foreground">Email delivery, sent to {user.email}.</p>
                <Button type="submit" size="sm" className="rounded-lg">
                  Update notifications
                </Button>
              </div>
            </form>
          </Panel>

          <Panel title="SMS reminders" description="For tenants who have no email address">
            <SmsSettingsCard />
          </Panel>
        </TabsContent>

        <TabsContent value="security">
          <Panel title="Security" description="Password, account protection and active sessions.">
            <form action={updatePassword} className="space-y-4">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new_password">New password</Label>
                  <Input id="new_password" name="new_password" type="password" minLength={6} required autoComplete="new-password" />
                  <p className="text-[11px] leading-4 text-muted-foreground">At least six characters.</p>
                </div>
              </div>
              <Button type="submit" size="sm" className="rounded-lg">
                Update password
              </Button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
              <div>
                <p className="text-[13px] font-medium text-foreground">Account protection</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  Sign-in and stored data are encrypted in transit and at rest.
                </p>
              </div>
              <StatusPill tone="success" dot>
                Protected
              </StatusPill>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[13px] font-medium text-foreground">Active sessions</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  Sign out everywhere if you no longer trust a device.
                </p>
              </div>
              <form action={signOutAllDevices}>
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-destructive/30 bg-card text-destructive hover:bg-destructive/[0.06] hover:text-destructive"
                >
                  Sign out all devices
                </Button>
              </form>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="data">
          <Panel title="Data" description="What is in your workspace, and how to take it with you.">
            <div className="grid grid-cols-3 divide-x divide-border/70 overflow-hidden rounded-xl border border-border/80 bg-background/60">
              {workspaceCounts.map((item) => (
                <div key={item.label} className="px-3 py-4 text-center">
                  <p className="text-[22px] font-semibold leading-none tracking-[-0.03em] tabular text-foreground">
                    {item.value}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground">Export data</p>
                <p className="mt-0.5 max-w-lg text-xs leading-5 text-muted-foreground">
                  A snapshot of properties, tenants, payments, expenses, maintenance, notes and documents.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
                  <a href="/api/export?format=json" download>
                    <Download className="size-3.5" />
                    Download JSON
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
                  <a href="/api/export?format=csv" download>
                    <Download className="size-3.5" />
                    Download CSV
                  </a>
                </Button>
              </div>
            </div>

            <div className="mt-5 border-t border-border/70 pt-4">
              <p className="text-[13px] font-medium text-foreground">Accounting export</p>
              <p className="mb-3 mt-0.5 max-w-lg text-xs leading-5 text-muted-foreground">
                Balanced double-entry journal for an accountant, ready for Xero or QuickBooks.
              </p>
              <AccountingExport />
            </div>
          </Panel>
        </TabsContent>
      </Tabs>

      <footer className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground/70">Bower</span>
        <span aria-hidden>·</span>
        <span>© {new Date().getFullYear()}</span>
        <span aria-hidden>·</span>
        <a
          href="https://www.linkedin.com/in/brian-kiarie-00b3a3391"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:text-pine hover:underline"
        >
          Brian Kiarie
        </a>
        <span aria-hidden>·</span>
        <a
          href="https://github.com/Knighty7-ciper"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:text-pine hover:underline"
        >
          GitHub
        </a>
      </footer>
    </div>
  )
}
