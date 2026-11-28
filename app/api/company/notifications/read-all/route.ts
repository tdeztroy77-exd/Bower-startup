import { NextResponse } from "next/server"
import { withAuth, dbError } from "@/lib/api"
import { CompanyAuthError, requireCompanyMember } from "@/lib/company/auth"

export const runtime = "nodejs"

/**
 * PATCH /api/company/notifications/read-all
 *
 * Mark every unread company notification as read. Own rows only.
 */
export const PATCH = withAuth(async (_request, { supabase, userId }) => {
  try {
    const { company } = await requireCompanyMember(supabase, userId)

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("company_id", company.id)
      .eq("user_id", userId)
      .eq("is_read", false)

    if (error) {
      return dbError("app/api/company/notifications/read-all/route.ts", error, 500)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/notifications/read-all/route.ts", e, 500)
  }
})
