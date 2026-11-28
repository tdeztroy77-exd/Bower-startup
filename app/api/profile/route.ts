import { NextResponse } from "next/server"
import { z } from "zod"
import { withAuth, dbError } from "@/lib/api"
import { createServiceClient } from "@/lib/supabase/service"

export const runtime = "nodejs"

/**
 * GET  /api/profile — the caller's own profile
 * PATCH /api/profile — update the caller's own profile
 *
 * A person may change their own name, photo, phone number and job
 * title. They may NOT change their role, their status, or which
 * company they belong to — those belong to whoever administers the
 * team, and the database says so too (see the
 * `guard_team_member_self_update` trigger in the migration).
 *
 * The profile lives in two places, and both are kept in step:
 *   `user_profiles`  — the personal record (name, phone, photo). It
 *                      drives the dashboard sidebar for everyone.
 *   `team_members`   — the company record (job title, photo). It is
 *                      what the directory shows.
 *
 * The membership row is written through the service role because the
 * RLS policy on `team_members` is admin-only by design — a member may
 * not edit rows in general. The route below is the gate, and it
 * writes an explicit allowlist of fields and nothing else.
 */

const UpdateSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    job_title: z.string().trim().max(120).nullable().optional(),
    avatar_url: z.string().trim().url().max(600).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update",
  })

export const GET = withAuth(async (_request, { supabase, userId }) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("full_name, first_name, last_name, phone, city, county, timezone, avatar_url")
      .eq("user_id", userId)
      .maybeSingle()

    if (profileError) {
      return dbError("app/api/profile/route.ts", profileError, 500)
    }

    const { data: membership, error: memberError } = await supabase
      .from("team_members")
      .select("id, company_id, role, department, job_title, avatar_url, companies(name)")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle()

    if (memberError) {
      return dbError("app/api/profile/route.ts", memberError, 500)
    }

    const row = membership as any

    return NextResponse.json({
      profile: {
        user_id: userId,
        email: user?.email ?? null,
        full_name: (profile as any)?.full_name ?? null,
        phone: (profile as any)?.phone ?? null,
        city: (profile as any)?.city ?? null,
        county: (profile as any)?.county ?? null,
        timezone: (profile as any)?.timezone ?? "Africa/Nairobi",
        avatar_url: (profile as any)?.avatar_url ?? row?.avatar_url ?? null,
        job_title: row?.job_title ?? null,
        department: row?.department ?? null,
        role: row?.role ?? null,
        company_id: row?.company_id ?? null,
        company_name: row?.companies?.name ?? null,
        membership_id: row?.id ?? null,
      },
    })
  } catch (e) {
    return dbError("app/api/profile/route.ts", e, 500)
  }
})

export const PATCH = withAuth(async (request, { supabase, userId }) => {
  try {
    const parsed = UpdateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      )
    }

    const { full_name, phone, job_title, avatar_url } = parsed.data

    // --- the personal record (RLS: you may update your own row) -------
    const profileUpdate: Record<string, unknown> = {}
    if (full_name !== undefined) profileUpdate.full_name = full_name
    if (phone !== undefined) profileUpdate.phone = phone
    if (avatar_url !== undefined) profileUpdate.avatar_url = avatar_url

    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await supabase
        .from("user_profiles")
        .update(profileUpdate)
        .eq("user_id", userId)

      if (error) {
        return dbError("app/api/profile/route.ts", error, 500)
      }
    }

    // --- the company record ------------------------------------------
    // Only the fields a person owns. Role, status, company_id and
    // user_id are deliberately absent from this list.
    const memberUpdate: Record<string, unknown> = {}
    if (full_name !== undefined) memberUpdate.name = full_name
    if (phone !== undefined) memberUpdate.phone = phone
    if (job_title !== undefined) memberUpdate.job_title = job_title
    if (avatar_url !== undefined) memberUpdate.avatar_url = avatar_url

    if (Object.keys(memberUpdate).length > 0) {
      const service = createServiceClient()

      if (service) {
        const { error } = await service
          .from("team_members")
          .update(memberUpdate)
          .eq("user_id", userId)

        if (error) {
          return dbError("app/api/profile/route.ts", error, 500)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return dbError("app/api/profile/route.ts", e, 500)
  }
})
