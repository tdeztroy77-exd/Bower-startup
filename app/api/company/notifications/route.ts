import { NextResponse } from "next/server"
import { withAuth, dbError } from "@/lib/api"
import { CompanyAuthError, requireCompanyMember } from "@/lib/company/auth"
import { can } from "@/lib/company/permissions"
import type { CompanyNotification } from "@/lib/company/types"

export const runtime = "nodejs"

/**
 * GET /api/company/notifications
 *
 * The company-scoped notification feed.
 *
 * These rows live in the EXISTING `notifications` table, extended with a
 * `company_id` column — Bower does not run a second notification store.
 * A person only ever sees their own rows (`user_id = auth.uid()`), and
 * the RLS policy on the table says so independently of this route.
 *
 * Query: unreadOnly?, limit?
 */

const NOTIFICATION_COLUMNS =
  "id, company_id, type, title, message, severity, link, is_read, metadata, created_at"

export const GET = withAuth(async (request, { supabase, userId }) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    if (!can(member.role, "read_notifications")) {
      return NextResponse.json({ error: "You cannot read these notifications" }, { status: 403 })
    }

    const url = new URL(request.url)
    const unreadOnly = url.searchParams.get("unreadOnly") === "1"
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") || 50), 1),
      200,
    )

    let query = supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("company_id", company.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq("is_read", false)
    }

    const { data, error } = await query

    if (error) return dbError("app/api/company/notifications/route.ts", error, 500)

    const notifications = (data as CompanyNotification[]) ?? []

    // The unread count is the number of unread rows for this company —
    // one extra query, not a count per row.
    const { count, error: countError } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("user_id", userId)
      .eq("is_read", false)

    if (countError) {
      console.error("[api/company/notifications] unread count failed", countError)
    }

    return NextResponse.json({ notifications, unread: count ?? 0 })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/notifications/route.ts", e, 500)
  }
})
