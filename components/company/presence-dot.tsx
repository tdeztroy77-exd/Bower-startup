"use client"

import { cn } from "@/lib/utils"
import type { PresenceStatus } from "@/lib/company/types"
import { PRESENCE_TONE } from "./tokens"

/**
 * The presence dot that sits on a member's avatar.
 *
 * 10px, tucked into the bottom-right of the avatar, with a 2px ring in
 * the page background so it stays legible against any photo.
 *
 * Coming online is worth a small bloom — it is the only moment in the
 * product where somebody visibly arrives.
 */
export function PresenceDot({
  status = "offline",
  className,
  animate = true,
}: {
  status?: PresenceStatus
  className?: string
  animate?: boolean
}) {
  const online = status === "online"

  return (
    <span
      role="img"
      aria-label={`Status: ${status}`}
      title={`Status: ${status}`}
      className={cn(
        "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
        PRESENCE_TONE[status] ?? PRESENCE_TONE.offline,
        online && animate && "anim-bloom",
        className,
      )}
    />
  )
}
