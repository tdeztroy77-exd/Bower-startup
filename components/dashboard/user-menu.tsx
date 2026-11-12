"use client"

import Link from "next/link"
import { signOut } from "@/lib/actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, CreditCard, LifeBuoy, LogOut, Settings } from "lucide-react"

function initials(name?: string | null, email?: string | null): string {
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

export function UserMenu({
  name,
  email,
  workspace,
}: {
  name?: string | null
  email?: string | null
  workspace?: string | null
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="size-8">
          <AvatarFallback className="bg-secondary text-[11px] font-semibold text-primary">
            {initials(name, email)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 flex-col items-start leading-none lg:flex">
          <span className="max-w-[150px] truncate text-[13px] font-semibold text-foreground">
            {name || workspace || "Your account"}
          </span>
          <span className="mt-1 max-w-[150px] truncate text-[11px] text-muted-foreground">{email}</span>
        </span>
        <ChevronDown className="hidden size-3.5 text-muted-foreground lg:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold text-foreground">{name || workspace || "Your account"}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/billing">
            <CreditCard className="size-4" />
            Plan &amp; billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/help">
            <LifeBuoy className="size-4" />
            Help &amp; support
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-destructive/10"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
