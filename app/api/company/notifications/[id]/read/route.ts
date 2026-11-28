import { NextResponse } from "next/server"
import { withAuth, dbError, errorResponse } from "@/lib/api"
import { CompanyAuthError, requireCompanyMember } from "@/lib/company/auth"

export const runtime = "nodejs"

/**
 * PATCH /api/company/notifications/[id]/read
 *
 * Mark one notification as read. Own rows only — the update is scoped
 * to `user_id`, so a notification id belonging to somebody else simply
 * does not match.
 */
export const PATCH = withAuth(async (_request, { supabase, userId }, params) => {
  try {
    const { company } = await requireCompanyMember(supabase, userId)

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", params.id)
      .eq("user_id", userId)
      .eq("company_id", company.id)
      .select("id, company_id, type, title, message, severity, link, is_read, metadata, created_at")
      .maybeSingle()

    if (error) {
      return dbError("app/api/company/notifications/[id]/read/route.ts", error, 500)
    }

    if (!data) return errorResponse("Notification not found", 404)

    return NextResponse.json({ ok: true, notification: data })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/notifications/[id]/read/route.ts", e, 500)
  }
})
