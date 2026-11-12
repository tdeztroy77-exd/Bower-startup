"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const yearStart = () => `${new Date().getFullYear()}-01-01`
const today = () => new Date().toISOString().slice(0, 10)

/**
 * Accounting export card. Produces a balanced journal CSV; the accountant
 * remaps account codes if their chart differs.
 */
export function AccountingExport() {
  const [from, setFrom] = useState(yearStart())
  const [to, setTo] = useState(today())
  const [format, setFormat] = useState<"xero" | "quickbooks" | "generic">("xero")
  const [downloading, setDownloading] = useState(false)

  function download() {
    setDownloading(true)
    const params = new URLSearchParams({ from, to, format })
    window.location.assign(`/api/export/accounting?${params.toString()}`)
    window.setTimeout(() => setDownloading(false), 1200)
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="from" className="text-[12px]">From</Label>
          <Input id="from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-9 rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to" className="text-[12px]">To</Label>
          <Input id="to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-9 rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Format</Label>
          <Select value={format} onValueChange={(value) => setFormat(value as typeof format)}>
            <SelectTrigger className="h-9 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xero">Xero manual journal</SelectItem>
              <SelectItem value="quickbooks">QuickBooks journal</SelectItem>
              <SelectItem value="generic">Generic double-entry CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button size="sm" className="rounded-lg" onClick={download} disabled={downloading}>
        {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
        Download journal CSV
      </Button>
      <p className="text-[11px] leading-5 text-muted-foreground">
        Rent is credited to <span className="font-medium text-foreground">4000 Rent income</span> and received
        into <span className="font-medium text-foreground">1010 M-Pesa clearing</span> or{" "}
        <span className="font-medium text-foreground">1000 Cash at bank</span>. Expenses use category codes
        5100–6900. Remap in your accounting tool if needed.
      </p>
    </div>
  )
}
