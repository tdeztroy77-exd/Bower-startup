"use client"

import { useState } from "react"
import { Download } from "lucide-react"

/**
 * Owner statement download with a month picker. Defaults to the current month;
 * the API accepts any YYYY-MM.
 */
export function OwnerStatementButton() {
  const current = new Date()
  const [month, setMonth] = useState(
    `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`,
  )

  return (
    <div className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2">
      <input
        type="month"
        value={month}
        onChange={(event) => setMonth(event.target.value)}
        aria-label="Statement month"
        className="h-7 w-[118px] border-0 bg-transparent px-1 text-[11.5px] text-foreground outline-none"
      />
      <a
        href={`/api/reports/owner-statement?month=${month}`}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] font-medium text-foreground hover:text-primary"
      >
        <Download className="size-3.5" /> PDF
      </a>
    </div>
  )
}
