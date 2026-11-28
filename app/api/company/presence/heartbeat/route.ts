import { NextResponse } from "next/server"
import { z } from "zod"
import { withAuth, dbError } from "@/lib/api"
import { CompanyAuthError, requireCompanyMember } from "@/lib/company/auth"

export const runtime = "nodejs"

/**
 * POST /api/company/presence/heartbeat
 *
 * Keeps the `company_presence` fallback row warm. Called by the presence
 * provider at most once a minute, and whenever the tab is hidden.
 *
 * A member may only ever write their OWN row — the RLS policy on
 * `company_presence` enforces that, and the row is keyed on
 * (company_id, user_id), so there is nothing to spoof.
 */

const HeartbeatSchema = z.object({
  status: z.enum(["online", "away", "offline"]),
})

export const POST = withAuth(async (request, { supabase, userId }) => {
  try {
    const { company } = await requireCompanyMember(supabase, userId)

    const parsed = HeartbeatSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid presence status" }, { status: 400 })
    }

    const { error } = await supabase.from("company_presence").upsert(
      {
        company_id: company.id,
        user_id: userId,
        status: parsed.data.status,
        last_heartbeat_at: new Date().toISOString(),
      },
      { onConflict: "company_id,user_id" },
    )

    if (error) return dbError("app/api/company/presence/heartbeat/route.ts", error, 500)

    return NextResponse.json({ ok: true, status: parsed.data.status })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/presence/heartbeat/route.ts", e, 500)
  }
})
