"use client"

import { Search, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { COMPANY_ROLES, type CompanyRole } from "@/lib/company/types"
import { roleLabel } from "./tokens"

/**
 * The directory's search and filter bar.
 *
 * Sticky, because a directory of a hundred people is a thing you scroll
 * through, and the filters have to stay reachable while you do.
 *
 * The department tabs are generated from the data, so a company that
 * never uses "maintenance" is not shown an empty tab.
 */
export function DirectoryToolbar({
  search,
  onSearchChange,
  department,
  onDepartmentChange,
  departments,
  role,
  onRoleChange,
  status,
  onStatusChange,
  onInvite,
  canInvite,
  total,
  shown,
  loading,
}: {
  search: string
  onSearchChange: (value: string) => void
  department: string
  onDepartmentChange: (value: string) => void
  departments: string[]
  role: string
  onRoleChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  onInvite: () => void
  canInvite: boolean
  total: number
  shown: number
  loading?: boolean
}) {
  const hasFilters =
    Boolean(search) || Boolean(department) || Boolean(role) || status !== "active"

  return (
    <div className="sticky top-0 z-20 -mx-1 border-b border-border/60 bg-card/95 px-1 pb-3 pt-1 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search the team"
            aria-label="Search the team"
            className="h-9 rounded-lg pl-8 pr-8"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <select
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
          aria-label="Filter by role"
          className="h-9 rounded-lg border border-input bg-input px-2.5 text-[13px] text-foreground"
        >
          <option value="">All roles</option>
          {COMPANY_ROLES.map((option) => (
            <option key={option} value={option}>
              {roleLabel(option)}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter by status"
          className="h-9 rounded-lg border border-input bg-input px-2.5 text-[13px] text-foreground"
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="removed">Removed</option>
          <option value="all">Everyone</option>
        </select>

        {canInvite ? (
          <Button size="sm" onClick={onInvite} className="h-9 rounded-lg">
            <UserPlus className="mr-1.5 size-3.5" />
            Invite
          </Button>
        ) : null}
      </div>

      {departments.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <FilterTab active={!department} onClick={() => onDepartmentChange("")}>
            All
          </FilterTab>
          {departments.map((option) => (
            <FilterTab
              key={option}
              active={department === option}
              onClick={() => onDepartmentChange(department === option ? "" : option)}
            >
              {option}
            </FilterTab>
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex items-center gap-2 text-[11.5px] text-muted-foreground">
        <span className="tabular">
          {loading ? "Loading…" : `${shown} ${shown === 1 ? "person" : "people"}`}
          {!loading && shown !== total ? ` of ${total}` : ""}
        </span>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              onSearchChange("")
              onDepartmentChange("")
              onRoleChange("")
              onStatusChange("active")
            }}
            className="font-medium text-foreground underline decoration-border underline-offset-2 hover:text-pine"
          >
            Reset
          </button>
        ) : null}
      </div>
    </div>
  )
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-2.5 py-1 text-[12px] font-medium capitalize transition-colors",
        active
          ? "bg-primary/10 text-pine"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

export type { CompanyRole }
