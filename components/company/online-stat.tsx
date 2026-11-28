"use client"

import { Wifi } from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { usePresence } from "./presence-provider"

/**
 * "Online right now" — the one number on the page that cannot be known
 * on the server, because presence is realtime.
 */
export function OnlineStat({ hint }: { hint?: string }) {
  const presence = usePresence()
  const online = Object.values(presence).filter((status) => status === "online").length

  return (
    <StatCard
      label="Online right now"
      value={online}
      icon={Wifi}
      accent="indigo"
      hint={hint ?? "Live presence"}
    />
  )
}
