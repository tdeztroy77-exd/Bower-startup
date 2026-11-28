import { NextResponse } from "next/server"
import { withAuth, dbError } from "@/lib/api"
import { CompanyAuthError, requireCompanyMember } from "@/lib/company/auth"
import { can } from "@/lib/company/permissions"
import { loadDirectory } from "@/lib/company/directory"

export const runtime = "nodejs"

/**
 * GET /api/company/members
 *
 * The company directory. Any ACTIVE member may read it — the previous
 * version was owner-only, which made the whole company directory
 * pointless for the people it was built for.
 *
 * Query: search?, department?, role?, status?, cursor?, limit?
 *
 * The query itself lives in `lib/company/directory.ts` so this route and
 * the server-rendered page can never disagree about who is in the team.
 */

export const GET = withAuth(async (request, { supabase, userId }) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    if (!can(member.role, "read_directory")) {
      return NextResponse.json({ error: "You cannot read this directory" }, { status: 403 })
    }

    const url = new URL(request.url)

    const result = await loadDirectory(supabase, company, {
      search: url.searchParams.get("search"),
      department: url.searchParams.get("department"),
      role: url.searchParams.get("role"),
      status: url.searchParams.get("status"),
      cursor: Number(url.searchParams.get("cursor") || 0),
      limit: Number(url.searchParams.get("limit") || 0) || undefined,
    })

    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/members/route.ts", e, 500)
  }
})
