import { NextResponse } from "next/server"
import { withAuth, dbError, errorResponse } from "@/lib/api"
import { CompanyAuthError, requireCompanyMember, toCompanyMember, toOwnerMember } from "@/lib/company/auth"
import { isCompanyAdmin } from "@/lib/company/permissions"
import { loadDirectory } from "@/lib/company/directory"

/**
 * /api/company
 * GET  — the workspace (team + landlords + company)
 * POST — retired; invites now live in their own endpoint
 */

export const runtime = "nodejs"

/**
 * GET /api/company
 *
 * Any ACTIVE member of the company may read this. It used to be
 * owner-only, which meant a team member could not see their own
 * colleagues — the opposite of what a company workspace is for.
 *
 * The managed landlords stay with owners and managers: that is the
 * agency's business, not the whole team's to browse.
 *
 * The response shape is unchanged — `{ workspace: { company, team,
 * landlords } }` — with the team rows extended with the new profile
 * columns and a `member` field describing the caller.
 */
export const GET = withAuth(async (_request, { supabase, userId }) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    const directory = await loadDirectory(supabase, company, { status: "all", limit: 200 })

    const team = directory.members.map((entry) => ({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      role: entry.role,
      avatar_url: entry.avatar_url,
      department: entry.department,
      job_title: entry.job_title,
      phone: entry.phone,
      status: entry.status,
      last_seen_at: entry.last_seen_at,
      accepted_at: entry.accepted_at,
      is_owner: entry.is_owner,
    }))

    const landlords = isCompanyAdmin(member)
      ? (
          await supabase
            .from("managed_landlords")
            .select("id, name, units, manager, revenue_share, status")
            .eq("company_id", company.id)
            .order("name")
        ).data ?? []
      : []

    return NextResponse.json({
      workspace: {
        company: {
          id: company.id,
          name: company.name,
          type: company.type,
          address: company.address,
          phone: company.phone,
          website: company.website,
          logo_url: company.logo_url,
        },
        team,
        landlords,
        member: {
          id: member.id,
          role: member.role,
          user_id: member.user_id,
          is_owner: member.is_owner,
        },
      },
    })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      // No company at all is not an error — it is an empty workspace.
      if (e.status === 404) return NextResponse.json({ workspace: null })
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/route.ts", e, 500)
  }
})

/**
 * POST /api/company — retired.
 *
 * This used to insert a `team_members` row the moment the owner typed
 * an email: no token, no expiry, no acceptance step, no way to revoke.
 * People who never agreed to anything ended up sitting in the
 * directory.
 *
 * Inviting is now POST /api/company/invitations, which creates a
 * pending invitation with a single-use, expiring token. A membership
 * row is created only when that token is redeemed.
 */
export const POST = withAuth(async (_request, { supabase, userId }) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    if (!isCompanyAdmin(member)) {
      return errorResponse("Only admins and managers can invite teammates", 403)
    }

    return NextResponse.json(
      {
        error:
          "This endpoint no longer creates team members. Use POST /api/company/invitations to send an invitation.",
        moved_to: "/api/company/invitations",
        company_id: company.id,
      },
      { status: 410 },
    )
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/route.ts", e, 500)
  }
})

export { toCompanyMember, toOwnerMember }
