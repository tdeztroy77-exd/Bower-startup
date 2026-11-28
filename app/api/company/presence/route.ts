import { NextResponse } from "next/server"
import { withAuth, dbError } from "@/lib/api"
import { CompanyAuthError, requireCompanyMember } from "@/lib/company/auth"
import type { PresenceStatus } from "@/lib/company/types"

export const runtime = "nodejs"

/**
 * GET /api/company/presence
 *
 * The last-seen FALLBACK. Live presence comes from the Supabase Realtime
 * channel and never touches this endpoint; this is here so a member who
 * was online a moment ago still shows a sensible state when their
 * realtime session is gone.
 *
 * One query for the whole company — never one per row.
 */

/** Two missed heartbeats and a member counts as offline. */
const STALE_AFTER_MS = 120_000

export const GET = withAuth(async (_request, { supabase, userId }) => {
  try {
    const { company } = await requireCompanyMember(supabase, userId)

    const { data, error } = await supabase
      .from("company_presence")
      .select("user_id, status, last_heartbeat_at")
      .eq("company_id", company.id)

    if (error) return dbError("app/api/company/presence/route.ts", error, 500)

    const now = Date.now()
    const presence: Record<string, PresenceStatus> = {}

    for (const row of (data as any[]) ?? []) {
      const beat = row?.last_heartbeat_at ? new Date(row.last_heartbeat_at).getTime() : 0
      const stale = !Number.isFinite(beat) || now - beat > STALE_AFTER_MS
      presence[row.user_id] = stale ? "offline" : ((row.status as PresenceStatus) ?? "offline")
    }

    return NextResponse.json({ presence })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/presence/route.ts", e, 500)
  }
})
