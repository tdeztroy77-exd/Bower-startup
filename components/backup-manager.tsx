"use client"

import { useState, useTransition, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Panel } from "@/components/dashboard/panel"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import {
  AlertTriangle,
  Clock,
  Download,
  FileArchive,
  FileJson,
  FileText,
  HardDrive,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from "lucide-react"

type Backup = {
  id: string
  label: string
  kind: "full" | "properties" | "tenants" | "payments" | "expenses" | "maintenance" | "documents" | "contacts" | "damages" | "quotations"
  format: "json" | "csv-zip"
  size_bytes: number
  row_count: number
  storage_kind: "inline" | "storage"
  storage_path: string | null
  metadata: Record<string, unknown>
  source: "manual" | "scheduled" | "pre-patch" | "pre-migration"
  created_at: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })
}

function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("en-KE", { dateStyle: "medium" })
}

const KIND_TABLES: Record<Backup["kind"], string[]> = {
  full: ["All tables"],
  properties: ["properties", "property_photos"],
  tenants: ["tenants"],
  payments: ["rent_payments", "c2b_transactions"],
  expenses: ["expenses", "recurring_expenses"],
  maintenance: ["maintenance_requests"],
  documents: ["documents", "document_expiry_reminders"],
  contacts: ["contacts"],
  damages: ["damages"],
  quotations: ["quotations"],
}

const SOURCE_TONE: Record<Backup["source"], "neutral" | "info" | "warning"> = {
  manual: "neutral",
  scheduled: "info",
  "pre-patch": "warning",
  "pre-migration": "warning",
}

export function BackupManager({ initialBackups, appVersion }: { initialBackups: Backup[]; appVersion: string }) {
  const [backups, setBackups] = useState<Backup[]>(initialBackups)
  const [isCreating, startCreating] = useTransition()
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<"skip" | "replace" | "merge">("skip")
  const [autoBackup, setAutoBackup] = useState(false)
  const [autoFrequency, setAutoFrequency] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [autoSaveStatus, setAutoSaveStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function createBackup() {
    startCreating(async () => {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: `Manual backup ${new Date().toLocaleString("en-KE")}` }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error("[backup] create failed", err)
        alert("The backup could not be created. Please try again shortly.")
        return
      }
      const data = await res.json()
      // Save the payload to disk immediately so the user has a copy
      const blob = new Blob([JSON.stringify(data.payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = data.filename ?? "bower-backup.json"
      a.click()
      URL.revokeObjectURL(url)
      // Refresh list
      const list = await fetch("/api/backup/list").then((r) => r.json())
      setBackups(list.backups ?? [])
    })
  }

  async function downloadBackup(b: Backup) {
    const res = await fetch(`/api/backup/${b.id}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error("[backup] download failed", err)
      alert("That backup could not be downloaded. Please try again shortly.")
      return
    }
    const data = await res.json()
    if (data.signed_url) {
      // Object-storage path: redirect via signed URL
      const a = document.createElement("a")
      a.href = data.signed_url
      a.download = `${b.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`
      a.rel = "noopener"
      a.click()
      return
    }
    const backup = data.backup
    if (!backup?.payload) {
      alert("This backup is temporarily unavailable. Please try again shortly.")
      return
    }
    const blob = new Blob([JSON.stringify(backup.payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${b.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function deleteBackup(id: string) {
    if (!confirm("Delete this backup? This cannot be undone.")) return
    const res = await fetch(`/api/backup/${id}`, { method: "DELETE" })
    if (res.ok) {
      setBackups(backups.filter((b) => b.id !== id))
    }
  }

  function startImport() {
    fileInputRef.current?.click()
  }

  async function handleFile(file: File) {
    setIsImporting(true)
    setImportError(null)
    setImportSuccess(null)
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, options: { on_conflict: importMode, dry_run: false } }),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.error ?? "The restore could not be completed.")
        return
      }
      const r = data.result
      const restored = r.tables_restored?.length ?? 0
      setImportSuccess(`Restored ${restored} table${restored === 1 ? "" : "s"}. Status: ${r.status}.`)
      // Refresh
      const list = await fetch("/api/backup/list").then((r) => r.json())
      setBackups(list.backups ?? [])
    } catch (err) {
      console.error("[backup] import failed", err)
      setImportError("That file is not a valid Bower backup. Check the file and try again.")
    } finally {
      setIsImporting(false)
    }
  }

  async function saveAutoSchedule() {
    setAutoSaveStatus(null)
    const res = await fetch("/api/backup/auto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frequency: autoFrequency }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error("[backup] schedule save failed", data)
      setAutoSaveStatus("Could not save the schedule. Please try again.")
      return
    }
    setAutoSaveStatus(`Schedule saved. Next run within ${autoFrequency === "daily" ? "24h" : autoFrequency === "weekly" ? "7d" : "30d"}.`)
    const list = await fetch("/api/backup/list").then((r) => r.json())
    setBackups(list.backups ?? [])
  }

  const totalSize = backups.reduce((acc, b) => acc + b.size_bytes, 0)
  const latest = backups[0]

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total backups"
          value={backups.length}
          icon={FileArchive}
          hint={`${formatSize(totalSize)} stored`}
        />
        <StatCard
          label="Latest backup"
          value={latest ? formatDateOnly(latest.created_at) : "—"}
          icon={Clock}
          hint={latest ? `${formatSize(latest.size_bytes)} · ${latest.row_count.toLocaleString()} rows` : "Nothing yet"}
        />
        <StatCard label="App version" value={`v${appVersion}`} icon={HardDrive} hint="Private workspace copy" />
      </div>

      <Panel title="Create backup" description="Every row you own, in one portable JSON file.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-lg text-xs leading-5 text-muted-foreground">
            Keep the file on your laptop, an external drive or a private cloud folder. Restoring is
            non-destructive by default — rows that already exist are skipped.
          </p>
          <Button onClick={createBackup} disabled={isCreating} size="sm" className="rounded-lg">
            {isCreating ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                Building…
              </>
            ) : (
              <>
                <Download className="size-3.5" />
                Create & download
              </>
            )}
          </Button>
        </div>
      </Panel>

      <Panel title="Restore" description="Upload a backup you downloaded earlier.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="conflict-mode">If a row already exists</Label>
            <Select value={importMode} onValueChange={(v) => setImportMode(v as "skip" | "replace" | "merge")}>
              <SelectTrigger id="conflict-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">Skip — keep what&apos;s there</SelectItem>
                <SelectItem value="merge">Merge — update non-conflicting columns</SelectItem>
                <SelectItem value="replace">Replace — overwrite</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] leading-4 text-muted-foreground">
              Skip keeps current data. Merge updates matching rows. Replace overwrites them.
            </p>
          </div>

          <div className="flex flex-col items-start gap-1.5 rounded-xl border border-dashed border-border/80 bg-background/60 px-4 py-3">
            <p className="text-[13px] font-medium text-foreground">Backup file</p>
            <p className="text-[11px] leading-4 text-muted-foreground">
              A .json export from this workspace, up to 50 MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ""
              }}
            />
            <Button
              onClick={startImport}
              disabled={isImporting}
              variant="outline"
              size="sm"
              className="mt-1 rounded-lg bg-card"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Restoring…
                </>
              ) : (
                <>
                  <Upload className="size-3.5" />
                  Upload backup file
                </>
              )}
            </Button>
          </div>
        </div>

        {importError ? (
          <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/[0.05] px-4 py-3 text-sm text-destructive">
            <span className="font-semibold">Restore failed. </span>
            {importError}
          </div>
        ) : null}

        {importSuccess ? (
          <div className="mt-4 rounded-xl border border-success/25 bg-success/[0.05] px-4 py-3 text-sm text-success">
            <span className="font-semibold">Restore complete. </span>
            {importSuccess}
          </div>
        ) : null}
      </Panel>

      <Panel title="Automatic backups" description="Optional — keep a rolling copy without remembering.">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/60 px-4 py-3">
          <div className="min-w-0">
            <Label htmlFor="auto-backup" className="text-[13px] font-medium">
              Schedule automatic backups
            </Label>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              Creates a fresh full backup on the cadence you choose.
            </p>
          </div>
          <Switch id="auto-backup" checked={autoBackup} onCheckedChange={setAutoBackup} />
        </div>

        {autoBackup ? (
          <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="auto-frequency">Frequency</Label>
                <Select
                  value={autoFrequency}
                  onValueChange={(v) => setAutoFrequency(v as "daily" | "weekly" | "monthly")}
                >
                  <SelectTrigger id="auto-frequency" className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly (recommended)</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" className="rounded-lg bg-card" onClick={saveAutoSchedule}>
                <Save className="size-3.5" />
                Save schedule
              </Button>
              {autoSaveStatus ? (
                <span
                  className={
                    autoSaveStatus.startsWith("Could not")
                      ? "text-xs text-destructive"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {autoSaveStatus}
                </span>
              ) : null}
            </div>
            <p className="flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              Automatic copies are created privately on the schedule you select.
            </p>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Recent backups"
        description="Up to 50 most recent backup records for your account."
        bodyClassName="p-0"
      >
        {backups.length === 0 ? (
          <EmptyBlock
            icon={FileArchive}
            title="No backups yet"
            description="Create your first backup and it will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Backup</th>
                  <th>Created</th>
                  <th>Type</th>
                  <th className="text-right">Size</th>
                  <th className="text-right">Rows</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                          <FileJson className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[240px] truncate text-[12.5px] font-medium text-foreground">{b.label}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {KIND_TABLES[b.kind]?.join(", ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-[12.5px] text-muted-foreground">{formatDate(b.created_at)}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <StatusPill tone="neutral">{b.format}</StatusPill>
                        <StatusPill tone={SOURCE_TONE[b.source]}>{b.source.replace(/-/g, " ")}</StatusPill>
                        {b.storage_kind === "storage" ? <StatusPill tone="info">object storage</StatusPill> : null}
                      </div>
                    </td>
                    <td className="text-right text-[12.5px] tabular text-muted-foreground">{formatSize(b.size_bytes)}</td>
                    <td className="text-right text-[12.5px] tabular text-muted-foreground">
                      {b.row_count.toLocaleString()}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="rounded-lg bg-card" onClick={() => downloadBackup(b)}>
                          <Download className="size-3.5" />
                          Download
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${b.label}`}
                          onClick={() => deleteBackup(b.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="What gets backed up"
        description="The tables included in a full backup. Download any single table as CSV."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(["properties", "tenants", "rent_payments", "expenses", "maintenance_requests", "documents", "contacts", "damages", "quotations"] as const).map((t) => (
            <a
              key={t}
              href={`/api/backup/csv/${t}`}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 py-2 text-[12px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              download
            >
              <FileText className="size-3.5 shrink-0" />
              <span className="truncate capitalize">{t.replace(/_/g, " ")}</span>
              <Download className="ml-auto size-3 shrink-0" />
            </a>
          ))}
        </div>
        <p className="mt-4 border-t border-border/70 pt-3 text-[11px] leading-5 text-muted-foreground">
          Sensitive fields like passwords, tokens and API keys are stripped from every backup. The JSON is
          self-describing — open it in any text editor to inspect.
        </p>
      </Panel>
    </div>
  )
}
