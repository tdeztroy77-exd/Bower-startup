"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { CompanyMember } from "@/lib/company/types"
import { avatarTint, initials } from "./tokens"

/**
 * A member's circular avatar.
 *
 * 36px in a row, 64px in the profile sheet. When there is no photo the
 * fallback shows initials on a tint derived from the member's id, so
 * the same person keeps the same colour between sessions.
 */
export function MemberAvatar({
  member,
  size = "row",
  className,
}: {
  member: Pick<CompanyMember, "name" | "avatar_url" | "user_id" | "id">
  size?: "row" | "sheet"
  className?: string
}) {
  const dimensions = size === "row" ? "size-9" : "size-16"
  const fontSize = size === "row" ? "text-[11px]" : "text-lg"

  return (
    <Avatar className={cn(dimensions, "shrink-0 ring-1 ring-border/70", className)}>
      {member.avatar_url ? <AvatarImage src={member.avatar_url} alt="" /> : null}
      <AvatarFallback
        className={cn(avatarTint(member.user_id ?? member.id), fontSize, "font-semibold")}
      >
        {initials(member.name)}
      </AvatarFallback>
    </Avatar>
  )
}
