import { NextResponse } from "next/server"
import { z } from "zod"
import { withAuth, dbError, errorResponse } from "@/lib/api"
import { CompanyAuthError, requireCompanyMember } from "@/lib/company/auth"
import { can, canEditEvent } from "@/lib/company/permissions"
import { notifyMany } from "@/lib/company/notify"
import { COMPANY_EVENT_TYPES, type CompanyEvent } from "@/lib/company/types"

export const runtime = "nodejs"

/**
 * PATCH  /api/company/events/[eventId]
 * DELETE /api/company/events/[eventId]
 *
 * You may edit your own event. Admins and managers may edit anyone's.
 * Everybody else gets a 403.
 */

const EVENT_COLUMNS =
  "id, company_id, title, description, starts_at, ends_at, type, property_id, location, created_by, created_by_name, visibility, created_at, updated_at"

const UpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    starts_at: z.string().datetime({ offset: true }).optional(),
    ends_at: z.string().datetime({ offset: true }).optional(),
    type: z.enum(COMPANY_EVENT_TYPES as [string, ...string[]]).optional(),
    property_id: z.string().uuid().nullable().optional(),
    location: z.string().trim().max(160).nullable().optional(),
    visibility: z.enum(["company", "private"]).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update",
  })

async function loadEvent(supabase: any, companyId: string, eventId: string) {
  const { data, error } = await supabase
    .from("company_events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (error) throw error
  return (data as CompanyEvent | null) ?? null
}

export const PATCH = withAuth(async (request, { supabase, userId }, params) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    const event = await loadEvent(supabase, company.id, params.eventId)

    // An event id from another company is invisible, not merely forbidden.
    if (!event) return errorResponse("Event not found", 404)

    if (
      !canEditEvent(
        { user_id: userId, role: member.role, is_owner: member.is_owner },
        event,
        { isOwnerOfCompany: member.is_owner },
      )
    ) {
      return errorResponse("You cannot edit this event", 403)
    }

    const parsed = UpdateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      )
    }

    const startsAt = parsed.data.starts_at ?? event.starts_at
    const endsAt = parsed.data.ends_at ?? event.ends_at

    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      return errorResponse("The end time must be after the start time", 400)
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.title !== undefined) update.title = parsed.data.title
    if (parsed.data.description !== undefined) update.description = parsed.data.description
    if (parsed.data.starts_at !== undefined) update.starts_at = parsed.data.starts_at
    if (parsed.data.ends_at !== undefined) update.ends_at = parsed.data.ends_at
    if (parsed.data.type !== undefined) update.type = parsed.data.type
    if (parsed.data.property_id !== undefined) update.property_id = parsed.data.property_id
    if (parsed.data.location !== undefined) update.location = parsed.data.location
    if (parsed.data.visibility !== undefined) update.visibility = parsed.data.visibility

    const { data: updated, error: updateError } = await supabase
      .from("company_events")
      .update(update)
      .eq("id", params.eventId)
      .eq("company_id", company.id)
      .select(EVENT_COLUMNS)
      .single()

    if (updateError) {
      return dbError("app/api/company/events/[eventId]/route.ts", updateError, 500)
    }

    await announceEventChange(supabase, company.id, updated as CompanyEvent, member.name, userId)

    return NextResponse.json({ event: updated })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/events/[eventId]/route.ts", e, 500)
  }
})

export const DELETE = withAuth(async (_request, { supabase, userId }, params) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    const event = await loadEvent(supabase, company.id, params.eventId)
    if (!event) return errorResponse("Event not found", 404)

    if (
      !canEditEvent(
        { user_id: userId, role: member.role, is_owner: member.is_owner },
        event,
        { isOwnerOfCompany: member.is_owner },
      )
    ) {
      return errorResponse("You cannot delete this event", 403)
    }

    const { error } = await supabase
      .from("company_events")
      .delete()
      .eq("id", params.eventId)
      .eq("company_id", company.id)

    if (error) {
      return dbError("app/api/company/events/[eventId]/route.ts", error, 500)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/events/[eventId]/route.ts", e, 500)
  }
})

/** Tell the team that an event moved. */
async function announceEventChange(
  supabase: any,
  companyId: string,
  event: CompanyEvent,
  actorName: string,
  actorId: string,
) {
  if (event.visibility !== "company") return

  const { data: teammates } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .not("user_id", "is", null)

  const recipients = ((teammates as any[]) ?? [])
    .map((row) => row.user_id)
    .filter((id): id is string => Boolean(id) && id !== actorId)

  await notifyMany(supabase, recipients.map((userId) => ({ userId })), {
    companyId,
    type: "event_updated",
    title: `${event.title} was updated`,
    message: `${actorName} updated "${event.title}" on the team calendar.`,
    severity: "info",
    link: "/dashboard/company/calendar",
    payload: { event_id: event.id, starts_at: event.starts_at },
  })
}
