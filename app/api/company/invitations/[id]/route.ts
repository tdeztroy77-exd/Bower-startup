import { NextResponse } from "next/server"
import { withAuth, dbError, errorResponse } from "@/lib/api"
import { CompanyAuthError, requireCompanyMember } from "@/lib/company/auth"
import { can } from "@/lib/company/permissions"
import { notify } from "@/lib/company/notify"
import type { CompanyInvitation } from "@/lib/company/types"

export const runtime = "nodejs"

/**
 * DELETE /api/company/invitations/[id]
 *
 * Revokes a pending invitation. The row is kept with status 'revoked'
 * so the history of who was invited and when is not lost — the token
 * is dead either way, because acceptance only accepts `pending` rows.
 */

export const DELETE = withAuth(async (_request, { supabase, userId }, params) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    if (!can(member.role, "revoke_invitation")) {
      return errorResponse("Only admins and managers can revoke invitations", 403)
    }

    const { data: invitation, error: loadError } = await supabase
      .from("company_invitations")
      .select("id, email, name, role, status, invited_by, company_id")
      .eq("id", params.id)
      .maybeSingle()

    if (loadError) {
      return dbError("app/api/company/invitations/[id]/route.ts", loadError, 500)
    }

    if (!invitation) {
      return errorResponse("Invitation not found", 404)
    }

    // Cross-tenant guard: an invitation id from another company must be
    // invisible, not merely unmodifiable.
    if (invitation.company_id !== company.id) {
      return errorResponse("Invitation not found", 404)
    }

    if (invitation.status === "accepted") {
      return errorResponse("That invitation has already been accepted", 409)
    }
    if (invitation.status === "revoked") {
      return NextResponse.json({ ok: true, invitation: invitation as CompanyInvitation })
    }

    const { data: updated, error: updateError } = await supabase
      .from("company_invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("company_id", company.id)
      .select(
        "id, company_id, email, name, role, department, job_title, invited_by, invited_by_name, expires_at, accepted_at, revoked_at, status, created_at",
      )
      .single()

    if (updateError) {
      return dbError("app/api/company/invitations/[id]/route.ts", updateError, 500)
    }

    if (invitation.invited_by && invitation.invited_by !== userId) {
      await notify(supabase, {
        companyId: company.id,
        userId: invitation.invited_by,
        type: "invite_revoked",
        title: "Invitation revoked",
        message: `The invitation for ${invitation.email} was revoked.`,
        severity: "warning",
        link: "/dashboard/company",
        payload: { email: invitation.email },
      })
    }

    return NextResponse.json({ ok: true, invitation: updated })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/invitations/[id]/route.ts", e, 500)
  }
})
