"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createClient } from "@/lib/supabase/client"
import type { PresenceStatus } from "@/lib/company/types"

/**
 * Company presence.
 *
 * The primary layer is a Supabase Realtime Presence channel — every
 * member of a company joins `company-presence-{companyId}` and the
 * channel state tells the directory who is here right now. No polling.
 *
 * The database row (`company_presence`) is a last-seen FALLBACK only: a
 * heartbeat every 60 seconds keeps it warm so somebody who closed their
 * laptop still shows a sensible "last seen" instead of nothing at all.
 * It is never queried per row — the whole company is one read.
 *
 * The provider is mounted once, in the company layout, so presence does
 * not remount (and re-announce) on every navigation inside the section.
 */

export type PresenceMap = Record<string, PresenceStatus>

interface PresenceContextValue {
  /** userId → status. Live realtime state wins over the last-seen fallback. */
  presence: PresenceMap
  /** The current user's own status. */
  status: PresenceStatus
  setStatus: (status: PresenceStatus) => void
}

const PresenceContext = createContext<PresenceContextValue>({
  presence: {},
  status: "online",
  setStatus: () => {},
})

export function usePresence(): PresenceMap {
  return useContext(PresenceContext).presence
}

export function usePresenceStatus(): { status: PresenceStatus; setStatus: (s: PresenceStatus) => void } {
  const { status, setStatus } = useContext(PresenceContext)
  return { status, setStatus }
}

/** How often the database fallback is refreshed. */
const HEARTBEAT_INTERVAL_MS = 60_000

export function PresenceProvider({
  companyId,
  userId,
  children,
}: {
  companyId: string
  userId: string
  children: React.ReactNode
}) {
  const [live, setLive] = useState<PresenceMap>({})
  const [lastSeen, setLastSeen] = useState<PresenceMap>({})
  const statusRef = useRef<PresenceStatus>("online")
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)

  /** Keep the database fallback warm. Best effort — never throws. */
  const heartbeat = useCallback(async (status: PresenceStatus) => {
    try {
      await fetch("/api/company/presence/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
    } catch {
      // Presence is a nicety; a failed heartbeat must never surface.
    }
  }, [])

  const track = useCallback(
    async (status: PresenceStatus) => {
      try {
        await channelRef.current?.track({
          user_id: userId,
          status,
          online_at: new Date().toISOString(),
        })
      } catch {
        // The channel may not be subscribed yet.
      }
    },
    [userId],
  )

  const setStatus = useCallback(
    (status: PresenceStatus) => {
      statusRef.current = status
      void track(status)
      void heartbeat(status)
    },
    [track, heartbeat],
  )

  // Realtime presence channel.
  useEffect(() => {
    if (!companyId || !userId) return

    // Presence is a nicety on top of a working directory. If the channel
    // cannot be opened, the directory still renders and the last-seen
    // fallback still works — it must never take the page down.
    try {
      const supabase = createClient()
      const channel = supabase.channel(`company-presence-${companyId}`, {
        config: { presence: { key: userId } },
      })

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, any[]>
        const next: PresenceMap = {}
        for (const [key, metas] of Object.entries(state)) {
          const latest = metas[metas.length - 1] as any
          const reported = latest?.status as PresenceStatus | undefined
          next[key] = reported ?? "online"
        }
        setLive(next)
      })

      channel.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          void channel.track({
            user_id: userId,
            status: statusRef.current,
            online_at: new Date().toISOString(),
          })
        }
      })

      channelRef.current = channel

      return () => {
        supabase.removeChannel(channel)
        channelRef.current = null
      }
    } catch {
      return
    }
  }, [companyId, userId])

  // A hidden tab counts as away, not offline.
  useEffect(() => {
    function onVisibilityChange() {
      const next: PresenceStatus = document.visibilityState === "visible" ? "online" : "away"
      if (next === statusRef.current) return
      statusRef.current = next
      void track(next)
      void heartbeat(next)
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
  }, [track, heartbeat])

  // Seed the last-seen fallback, then keep it warm.
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch("/api/company/presence")
        if (!response.ok) return
        const data = await response.json()
        if (cancelled) return
        setLastSeen((data?.presence ?? {}) as PresenceMap)
      } catch {
        // Ignore — live presence still works without the fallback.
      }
    }

    void load()
    void heartbeat(statusRef.current)

    const id = setInterval(() => void heartbeat(statusRef.current), HEARTBEAT_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [heartbeat])

  const value = useMemo<PresenceContextValue>(
    () => ({
      presence: { ...lastSeen, ...live },
      status: statusRef.current,
      setStatus,
    }),
    [lastSeen, live, setStatus],
  )

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
}
