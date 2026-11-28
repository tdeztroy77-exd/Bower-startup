"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

/**
 * The theme control.
 *
 * The product ships a real dark theme — pine ink on near-black, with the
 * lime and mint re-tuned for a low-luminance canvas rather than inverted
 * ad hoc. This is the switch that makes it reachable: without it, a user
 * on a light-mode system has no way to ask for the dark one.
 *
 * "System" is the default, and it follows the operating system.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // The server cannot know the user's theme, so the trigger renders a
  // neutral icon until the client has mounted.
  React.useEffect(() => setMounted(true), [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Change theme"
          className="text-muted-foreground hover:text-foreground"
        >
          {mounted && theme === "dark" ? (
            <Moon className="size-[18px]" />
          ) : mounted && theme === "light" ? (
            <Sun className="size-[18px]" />
          ) : (
            <Monitor className="size-[18px]" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mounted ? theme : "system"} onValueChange={setTheme}>
          {OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="gap-2">
              <option.icon className="size-4 text-muted-foreground" />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[11px] leading-4 text-muted-foreground">
          Bower&apos;s palette is pine, lime and mint. The theme changes the
          canvas, never the brand.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
