import { NextResponse } from "next/server"
import { z } from "zod"
import { withAuth, dbError, errorResponse } from "@/lib/api"
import {
  CompanyAuthError,
  requireCompanyMember,
  toCompanyMember,
  toOwnerMember,
} from "@/lib/company/auth"
import { can, canManageMember, canRemoveMember } from "@/lib/company/permissions"
import { notify } from "@/lib/company/notify"
import { COMPANY_ROLES, type CompanyMember } from "@/lib/company/types"

export const runtime = "nodejs"

/**
 * GET    /api/company/members/[memberId]
 * PATCH  /api/company/members/[memberId]
 * DELETE /api/company/members/[memberId]
 *
 * Reading a colleague is open to every active member. Changing or
 * removing one is admin-only, and never applies to the owner or to
 * yourself.
 *
 * Removal is SOFT: the row is kept with status = 'removed' so the
 * history of the team survives, while the member loses access
 * immediately (an active membership is what grants access).
 */

const MEMBER_COLUMNS =
  "id, company_id, user_id, name, email, role, avatar_url, department, job_title, phone, status, last_seen_at, invited_at, accepted_at"

const UpdateSchema = z
  .object({
    role: z.enum(COMPANY_ROLES as [string, ...string[]]).optional(),
    department: z.string().trim().max(80).nullable().optional(),
    job_title: z.string().trim().max(120).nullable().optional(),
    status: z.enum(["active", "suspended", "removed"]).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update",
  })

/** The synthetic owner row is addressed as `owner:<companyId>`. */
function isOwnerId(memberId: string): boolean {
  return memberId.startsWith("owner:")
}

export const GET = withAuth(async (_request, { supabase, userId }, params) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    if (!can(member.role, "read_directory")) {
      return errorResponse("You cannot read this directory", 403)
    }

    if (isOwnerId(params.memberId)) {
      const owner = toOwnerMember(company, { user_id: company.owner_id })
      return NextResponse.json({ member: owner })
    }

    const { data, error } = await supabase
      .from("team_members")
      .select(MEMBER_COLUMNS)
      .eq("id", params.memberId)
      .eq("company_id", company.id)
      .maybeSingle()

    if (error) return dbError("app/api/company/members/[memberId]/route.ts", error, 500)

    // A member id from another company is invisible, not merely forbidden.
    if (!data) return errorResponse("Member not found", 404)

    return NextResponse.json({ member: toCompanyMember(data, company) })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/members/[memberId]/route.ts", e, 500)
  }
})

export const PATCH = withAuth(async (request, { supabase, userId }, params) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    if (!can(member.role, "change_member")) {
      return errorResponse("Only admins and managers can change a member", 403)
    }

    if (isOwnerId(params.memberId)) {
      return errorResponse("The company owner cannot be edited", 403)
    }

    const parsed = UpdateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      )
    }

    const { data: existing, error: loadError } = await supabase
      .from("team_members")
      .select(MEMBER_COLUMNS)
      .eq("id", params.memberId)
      .eq("company_id", company.id)
      .maybeSingle()

    if (loadError) {
      return dbError("app/api/company/members/[memberId]/route.ts", loadError, 500)
    }
    if (!existing) return errorResponse("Member not found", 404)

    const target = toCompanyMember(existing, company)

    if (!canManageMember({ user_id: userId, role: member.role, is_owner: member.is_owner }, target)) {
      return errorResponse("You cannot change this member", 403)
    }

    const update: Record<string, unknown> = {}
    if (parsed.data.role !== undefined) update.role = parsed.data.role
    if (parsed.data.department !== undefined) update.department = parsed.data.department
    if (parsed.data.job_title !== undefined) update.job_title = parsed.data.job_title
    if (parsed.data.status !== undefined) update.status = parsed.data.status

    const { data: updated, error: updateError } = await supabase
      .from("team_members")
      .update(update)
      .eq("id", params.memberId)
      .eq("company_id", company.id)
      .select(MEMBER_COLUMNS)
      .single()

    if (updateError) {
      return dbError("app/api/company/members/[memberId]/route.ts", updateError, 500)
    }

    const next = toCompanyMember(updated, company)

    if (parsed.data.role !== undefined && parsed.data.role !== target.role && target.user_id) {
      await notify(supabase, {
        companyId: company.id,
        userId: target.user_id,
        type: "role_changed",
        title: `Your role is now ${parsed.data.role}`,
        message: `${member.name} changed your role in ${company.name} from ${target.role} to ${parsed.data.role}.`,
        severity: "info",
        link: "/dashboard/company",
        payload: { role: parsed.data.role, previous_role: target.role },
      })
    }

    if (parsed.data.status === "removed" && target.user_id) {
      await notify(supabase, {
        companyId: company.id,
        userId: target.user_id,
        type: "member_removed",
        title: `You were removed from ${company.name}`,
        message: `${member.name} removed you from the company workspace.`,
        severity: "warning",
        link: null,
        payload: {},
      })
    }

    return NextResponse.json({ member: next })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/members/[memberId]/route.ts", e, 500)
  }
})

export const DELETE = withAuth(async (_request, { supabase, userId }, params) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    if (!can(member.role, "remove_member")) {
      return errorResponse("Only admins and managers can remove a member", 403)
    }

    if (isOwnerId(params.memberId)) {
      return errorResponse("The company owner cannot be removed", 403)
    }

    const { data: existing, error: loadError } = await supabase
      .from("team_members")
      .select(MEMBER_COLUMNS)
      .eq("id", params.memberId)
      .eq("company_id", company.id)
      .maybeSingle()

    if (loadError) {
      return dbError("app/api/company/members/[memberId]/route.ts", loadError, 500)
    }
    if (!existing) return errorResponse("Member not found", 404)

    const target = toCompanyMember(existing, company)

    if (!canRemoveMember({ user_id: userId, role: member.role, is_owner: member.is_owner }, target)) {
      return errorResponse("You cannot remove this member", 403)
    }

    // Soft remove — the row stays, the access goes.
    const { data: updated, error: updateError } = await supabase
      .from("team_members")
      .update({ status: "removed" })
      .eq("id", params.memberId)
      .eq("company_id", company.id)
      .select(MEMBER_COLUMNS)
      .single()

    if (updateError) {
      return dbError("app/api/company/members/[memberId]/route.ts", updateError, 500)
    }

    if (target.user_id) {
      await notify(supabase, {
        companyId: company.id,
        userId: target.user_id,
        type: "member_removed",
        title: `You were removed from ${company.name}`,
        message: `${member.name} removed you from the company workspace.`,
        severity: "warning",
        link: null,
        payload: {},
      })
    }

    return NextResponse.json({ ok: true, member: toCompanyMember(updated, company) })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/members/[memberId]/route.ts", e, 500)
  }
})

export type { CompanyMember }
