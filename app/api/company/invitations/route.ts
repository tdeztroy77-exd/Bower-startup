import { NextResponse } from "next/server"
import { z } from "zod"
import { withAuth, dbError, errorResponse } from "@/lib/api"
import { CompanyAuthError, requireCompanyMember } from "@/lib/company/auth"
import { can } from "@/lib/company/permissions"
import { COMPANY_ROLES, type CompanyInvitation } from "@/lib/company/types"
import {
  createInvitationToken,
  expireStaleInvitations,
  normalizeEmail,
} from "@/lib/company/invitations"
import { sendInviteEmail } from "@/lib/email/invite"

export const runtime = "nodejs"

/**
 * GET  /api/company/invitations?status=pending
 * POST /api/company/invitations
 *
 * An invitation is a PENDING record in `company_invitations`. It only
 * becomes a membership when the invitee redeems the token — the old
 * flow wrote a `team_members` row the moment the owner typed an email,
 * so people who never agreed to anything were sitting in the directory.
 */

const InviteSchema = z.object({
  email: z.string().trim().email().max(160),
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(COMPANY_ROLES as [string, ...string[]]).default("agent"),
  department: z.string().trim().max(80).optional(),
  job_title: z.string().trim().max(120).optional(),
})

const INVITATION_COLUMNS =
  "id, company_id, email, name, role, department, job_title, invited_by, invited_by_name, expires_at, accepted_at, revoked_at, status, created_at"

export const GET = withAuth(async (request, { supabase, userId }) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    if (!can(member.role, "invite_members")) {
      return errorResponse("Only admins and managers can view invitations", 403)
    }

    const url = new URL(request.url)
    const status = url.searchParams.get("status") ?? "pending"

    let query = supabase
      .from("company_invitations")
      .select(INVITATION_COLUMNS)
      .eq("company_id", company.id)

    if (status !== "all") {
      query = query.eq("status", status)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) return dbError("app/api/company/invitations/route.ts", error, 500)

    return NextResponse.json({ invitations: (data as CompanyInvitation[]) ?? [] })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/invitations/route.ts", e, 500)
  }
})

export const POST = withAuth(async (request, { supabase, userId }) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    if (!can(member.role, "invite_members")) {
      return errorResponse("Only admins and managers can invite teammates", 403)
    }

    const parsed = InviteSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      )
    }

    const email = normalizeEmail(parsed.data.email)
    const role = parsed.data.role as CompanyInvitation["role"]

    // Clear invitations whose time is up so the partial unique index on
    // (company_id, lower(email)) does not block a fresh invite for the
    // same address.
    await expireStaleInvitations(supabase, company.id)

    // Already on the team?
    const { data: existingMember, error: memberError } = await supabase
      .from("team_members")
      .select("id, name, status")
      .eq("company_id", company.id)
      .eq("email", email)
      .maybeSingle()

    if (memberError) {
      return dbError("app/api/company/invitations/route.ts", memberError, 500)
    }
    if (existingMember && existingMember.status !== "removed") {
      return errorResponse("That person is already a member of this company", 409)
    }

    // Already invited?
    const { data: pending, error: pendingError } = await supabase
      .from("company_invitations")
      .select("id")
      .eq("company_id", company.id)
      .eq("status", "pending")
      .ilike("email", email)
      .maybeSingle()

    if (pendingError) {
      return dbError("app/api/company/invitations/route.ts", pendingError, 500)
    }
    if (pending) {
      return errorResponse("There is already a pending invitation for that email", 409)
    }

    const token = createInvitationToken()

    const { data: invitation, error: insertError } = await supabase
      .from("company_invitations")
      .insert({
        company_id: company.id,
        email,
        name: parsed.data.name ?? null,
        role,
        department: parsed.data.department ?? null,
        job_title: parsed.data.job_title ?? null,
        token_hash: token.hash,
        invited_by: userId,
        invited_by_name: member.name,
        expires_at: token.expiresAt.toISOString(),
        status: "pending",
      })
      .select(INVITATION_COLUMNS)
      .single()

    if (insertError) {
      return dbError("app/api/company/invitations/route.ts", insertError, 500)
    }

    const origin =
      request.headers.get("origin") ??
      new URL(request.url).origin

    const mail = await sendInviteEmail({
      to: email,
      companyName: company.name,
      inviterName: member.name,
      token: token.raw,
      role,
      expiresAt: token.expiresAt,
      origin,
    })

    // NOTE: the raw token is deliberately NOT part of this response. It
    // exists in the mail (and, until a transport is wired up, in the
    // server log) and nowhere else.
    return NextResponse.json(
      {
        ok: true,
        invitation,
        email: { delivered: mail.delivered, reason: mail.reason },
      },
      { status: 201 },
    )
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/invitations/route.ts", e, 500)
  }
})
