import { cn } from "@/lib/utils"
import {
  BarChart3,
  Building2,
  Check,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
  Wallet,
  Wrench,
} from "lucide-react"

/* ------------------------------------------------------------------------- */
/* Small shared pieces                                                       */
/* ------------------------------------------------------------------------- */

function WindowChrome({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-3 py-2">
      <span className="flex gap-1.5">
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
      </span>
      <span className="mx-auto rounded-md border border-border/70 bg-card px-2.5 py-0.5 text-[9.5px] text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function MiniSidebar() {
  const items = [
    { icon: LayoutDashboard, active: true },
    { icon: Building2 },
    { icon: Users },
    { icon: Wallet },
    { icon: Wrench },
    { icon: FileText },
    { icon: BarChart3 },
    { icon: Settings },
  ]
  return (
    <div className="hidden w-11 shrink-0 flex-col items-center gap-2 border-r border-border/70 bg-muted/25 py-3 sm:flex">
      <span className="mb-2 grid size-6 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Building2 className="size-3" />
      </span>
      {items.map((item, index) => (
        <span
          key={index}
          className={cn(
            "grid size-6 place-items-center rounded-md",
            item.active ? "bg-secondary text-pine" : "text-muted-foreground/60",
          )}
        >
          <item.icon className="size-3" strokeWidth={2} />
        </span>
      ))}
    </div>
  )
}

const chartHeights = [
  [38, 26],
  [58, 40],
  [46, 31],
  [72, 48],
  [55, 36],
  [64, 42],
  [50, 33],
  [78, 52],
]

function MiniBars() {
  return (
    <div className="flex h-full items-end gap-2 sm:gap-2.5">
      {chartHeights.map(([income, expense], index) => (
        <div key={index} className="flex flex-1 items-end gap-[3px]">
          <span className="w-full rounded-t-[3px] bg-chart-1" style={{ height: income * 0.58 }} />
          <span className="w-full rounded-t-[3px] bg-chart-5/80" style={{ height: expense * 0.58 }} />
        </div>
      ))}
    </div>
  )
}

function MiniDonut({ value, size = 62 }: { value: number; size?: number }) {
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - value / 100)
  return (
    <svg viewBox="0 0 62 62" width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx="31" cy="31" r={radius} fill="none" stroke="var(--muted)" strokeWidth="8" />
      <circle
        cx="31"
        cy="31"
        r={radius}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------------- */
/* Dashboard preview — the hero proof                                        */
/* ------------------------------------------------------------------------- */

const kpis = [
  { label: "Collected", value: "KES 412,800", trend: "+8.2%" },
  { label: "Outstanding", value: "KES 38,400", trend: "4 tenants" },
  { label: "Occupancy", value: "89%", trend: "142 units" },
]

export function DashboardPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lift",
        className,
      )}
    >
      <WindowChrome label="app.bower.africa/dashboard" />
      <div className="flex">
        <MiniSidebar />
        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">November</p>
              <p className="mt-0.5 text-[13px] font-semibold tracking-[-0.02em] text-foreground">Dashboard</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="rounded-md border border-border px-2 py-1 text-[8.5px] text-muted-foreground">Search</span>
              <span className="grid size-6 place-items-center rounded-full bg-secondary text-[8px] font-semibold text-pine">
                BK
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-border/70 bg-background p-2">
                <p className="text-[8px] leading-3 text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 truncate text-[11px] font-semibold tracking-[-0.02em] text-foreground tabular">
                  {kpi.value}
                </p>
                <p className="mt-0.5 text-[7.5px] font-medium text-pine">{kpi.trend}</p>
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-5 gap-2">
            <div className="col-span-3 rounded-lg border border-border/70 bg-background p-2">
              <div className="flex items-center justify-between">
                <p className="text-[8.5px] font-semibold text-foreground">Revenue trend</p>
                <span className="flex items-center gap-1 text-[7px] text-muted-foreground">
                  <span className="size-1 rounded-full bg-chart-1" /> income
                  <span className="ml-1 size-1 rounded-full bg-chart-5" /> expense
                </span>
              </div>
              <div className="mt-2 h-[62px]">
                <MiniBars />
              </div>
              <div className="mt-1 flex justify-between text-[6.5px] text-muted-foreground">
                {["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>

            <div className="col-span-2 rounded-lg border border-border/70 bg-background p-2">
              <p className="text-[8.5px] font-semibold text-foreground">Occupancy</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="relative">
                  <MiniDonut value={89} size={54} />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground">
                    89%
                  </span>
                </div>
                <div className="space-y-1 text-[7px] text-muted-foreground">
                  <p className="flex items-center gap-1">
                    <span className="size-1 rounded-full bg-chart-1" /> Rented
                  </p>
                  <p className="flex items-center gap-1">
                    <span className="size-1 rounded-full bg-muted-foreground/40" /> Vacant
                  </p>
                </div>
              </div>
              <div className="mt-1.5 space-y-1 border-t border-border/60 pt-1.5">
                {[
                  ["Urgent", "3"],
                  ["Medium", "8"],
                  ["Low", "9"],
                ].map(([label, count]) => (
                  <p key={label} className="flex items-center justify-between text-[7.5px] text-muted-foreground">
                    {label}
                    <span className="font-semibold text-foreground">{count}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-lg border border-border/70 bg-background p-2">
            <div className="flex items-center justify-between">
              <p className="text-[8.5px] font-semibold text-foreground">Rent roll</p>
              <span className="text-[7px] text-muted-foreground">November</span>
            </div>
            <div className="mt-1.5 space-y-1">
              {[
                ["Amina W.", "Kilimani Heights", "KES 42,000", true],
                ["Peter M.", "RayElite Court", "KES 28,500", true],
                ["Grace N.", "Westlands Loft", "KES 35,000", false],
              ].map(([name, property, amount, paid]) => (
                <div key={String(name)} className="flex items-center gap-2 border-t border-border/50 py-1 first:border-0">
                  <span className="grid size-4 place-items-center rounded-full bg-secondary text-[6px] font-semibold text-pine">
                    {String(name).slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[8px] font-medium text-foreground">{name}</span>
                    <span className="block truncate text-[6.5px] text-muted-foreground">{property}</span>
                  </span>
                  <span className="text-[7.5px] font-medium tabular text-foreground">{amount}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-[1px] text-[6px] font-semibold",
                      paid ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
                    )}
                  >
                    {paid ? "paid" : "due"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------- */
/* Payments / reconciliation preview                                         */
/* ------------------------------------------------------------------------- */

export function ReconciliationPreview({ className }: { className?: string }) {
  const rows = [
    { ref: "SK9F2L1A", name: "Amina W.", amount: "42,000", matched: true },
    { ref: "SK9F2L1B", name: "Peter M.", amount: "28,500", matched: true },
    { ref: "SK9F2L1C", name: "—", amount: "35,000", matched: false },
  ]
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card", className)}>
      <WindowChrome label="Paybill · live feed" />
      <div className="p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-foreground">C2B transactions</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5 text-[8px] font-semibold text-success">
            <span className="size-1 rounded-full bg-success" /> live
          </span>
        </div>
        <div className="mt-2.5 overflow-hidden rounded-lg border border-border/70">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 bg-muted/50 px-2 py-1.5 text-[7px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <span>Receipt</span>
            <span>Tenant</span>
            <span>Amount</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.ref}
              className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 border-t border-border/60 px-2 py-1.5 text-[8px]"
            >
              <span className="font-mono text-[7px] text-muted-foreground">{row.ref}</span>
              <span className="flex items-center gap-1 truncate text-foreground">
                {row.name}
                {row.matched ? <Check className="size-2.5 text-success" /> : null}
              </span>
              <span className="font-semibold tabular text-foreground">KES {row.amount}</span>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-secondary/70 px-2.5 py-2">
          <p className="text-[8px] font-medium text-secondary-foreground">1 payment needs a tenant match</p>
          <span className="rounded-md bg-primary px-2 py-1 text-[7.5px] font-semibold text-primary-foreground">
            Review
          </span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------- */
/* Maintenance preview                                                       */
/* ------------------------------------------------------------------------- */

const priorityStyles: Record<string, string> = {
  Urgent: "bg-destructive/10 text-destructive",
  High: "bg-warning/10 text-warning",
  Medium: "bg-chart-3/10 text-chart-3",
  Low: "bg-secondary text-pine",
}

export function MaintenancePreview({ className }: { className?: string }) {
  const items = [
    { title: "Leaking kitchen tap", property: "Kilimani · Unit 4B", priority: "Urgent" },
    { title: "Repaint corridor", property: "RayElite Court · Block A", priority: "Medium" },
    { title: "Service water pump", property: "Westlands Loft", priority: "Low" },
  ]
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card", className)}>
      <div className="flex items-center justify-between border-b border-border/70 px-3.5 py-2.5">
        <p className="text-[11px] font-semibold text-foreground">Work orders</p>
        <span className="text-[8px] text-muted-foreground">3 open</span>
      </div>
      <div className="divide-y divide-border/60">
        {items.map((item) => (
          <div key={item.title} className="flex items-center gap-2 px-3.5 py-2.5">
            <span className="grid size-6 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Wrench className="size-3" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] font-medium text-foreground">{item.title}</p>
              <p className="truncate text-[7.5px] text-muted-foreground">{item.property}</p>
            </div>
            <span className={cn("rounded-full px-1.5 py-0.5 text-[7px] font-semibold", priorityStyles[item.priority])}>
              {item.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------- */
/* M-Pesa prompt preview                                                     */
/* ------------------------------------------------------------------------- */

export function MpesaPromptPreview({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[220px] rounded-[26px] border border-border bg-card p-2 shadow-lift", className)}>
      <div className="rounded-[20px] bg-foreground p-3 text-background">
        <div className="flex items-center justify-between text-[7px] text-background/60">
          <span>M-PESA</span>
          <span>now</span>
        </div>
        <p className="mt-3 text-[9px] leading-4 text-background/90">
          Pay <span className="font-semibold text-background">KES 42,000</span> to{" "}
          <span className="font-semibold text-background">BOWER</span> for account{" "}
          <span className="font-semibold text-background">KH-4B</span>?
        </p>
        <p className="mt-2 text-[7px] text-background/50">Enter M-PESA PIN to confirm</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="grid flex-1 place-items-center rounded-md bg-background/10 py-1.5 text-[8px] font-semibold">
            Cancel
          </span>
          <span className="grid flex-1 place-items-center rounded-md bg-primary py-1.5 text-[8px] font-semibold text-primary-foreground">
            Pay
          </span>
        </div>
      </div>
      <div className="mt-2 rounded-xl bg-success/10 px-2 py-2 text-center">
        <p className="flex items-center justify-center gap-1 text-[8px] font-semibold text-success">
          <CircleDollarSign className="size-2.5" /> Receipt posted automatically
        </p>
      </div>
    </div>
  )
}
