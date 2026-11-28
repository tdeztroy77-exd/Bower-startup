import { NextResponse } from "next/server"
import { z } from "zod"
import { withAuth, dbError, errorResponse } from "@/lib/api"
import { CompanyAuthError, requireCompanyMember } from "@/lib/company/auth"
import { can } from "@/lib/company/permissions"
import { notifyMany } from "@/lib/company/notify"
import { COMPANY_EVENT_TYPES, type CompanyEvent } from "@/lib/company/types"

export const runtime = "nodejs"

/**
 * GET  /api/company/events?from=&to=&type=&memberId=
 * POST /api/company/events
 *
 * The team calendar. Native — no Google or Outlook sync in this build.
 *
 * Events are company-scoped and returned in time order. The range filter
 * uses OVERLAP, not containment: an event that starts before the window
 * and ends inside it still shows up, which is what a calendar is
 * expected to do.
 */

const EVENT_COLUMNS =
  "id, company_id, title, description, starts_at, ends_at, type, property_id, location, created_by, created_by_name, visibility, created_at, updated_at"

const CreateSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).optional(),
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }),
    type: z.enum(COMPANY_EVENT_TYPES as [string, ...string[]]).default("meeting"),
    property_id: z.string().uuid().optional(),
    location: z.string().trim().max(160).optional(),
    visibility: z.enum(["company", "private"]).default("company"),
  })
  .refine((body) => new Date(body.ends_at).getTime() > new Date(body.starts_at).getTime(), {
    message: "The end time must be after the start time",
    path: ["ends_at"],
  })

export const GET = withAuth(async (request, { supabase, userId }) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    if (!can(member.role, "read_events")) {
      return errorResponse("You cannot read this calendar", 403)
    }

    const url = new URL(request.url)
    const from = url.searchParams.get("from")
    const to = url.searchParams.get("to")
    const type = url.searchParams.get("type")
    const memberId = url.searchParams.get("memberId")

    let query = supabase.from("company_events").select(EVENT_COLUMNS).eq("company_id", company.id)

    // Overlap, not containment: an event that started before the window
    // but ends inside it still belongs on the calendar.
    if (from) {
      query = query.gte("ends_at", from)
    }
    if (to) {
      query = query.lte("starts_at", to)
    }
    if (type) {
      query = query.eq("type", type)
    }
    if (memberId) {
      query = query.eq("created_by", memberId)
    }

    const { data, error } = await query.order("starts_at", { ascending: true })

    if (error) return dbError("app/api/company/events/route.ts", error, 500)

    return NextResponse.json({ events: (data as CompanyEvent[]) ?? [] })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/events/route.ts", e, 500)
  }
})

export const POST = withAuth(async (request, { supabase, userId }) => {
  try {
    const { company, member } = await requireCompanyMember(supabase, userId)

    if (!can(member.role, "create_event")) {
      return errorResponse("You cannot add to this calendar", 403)
    }

    const parsed = CreateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      )
    }

    const { data: event, error } = await supabase
      .from("company_events")
      .insert({
        company_id: company.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        starts_at: parsed.data.starts_at,
        ends_at: parsed.data.ends_at,
        type: parsed.data.type,
        property_id: parsed.data.property_id ?? null,
        location: parsed.data.location ?? null,
        created_by: userId,
        created_by_name: member.name,
        visibility: parsed.data.visibility,
      })
      .select(EVENT_COLUMNS)
      .single()

    if (error) return dbError("app/api/company/events/route.ts", error, 500)

    // Tell the team — unless the event is private to its creator.
    if (parsed.data.visibility === "company") {
      const { data: teammates } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("company_id", company.id)
        .eq("status", "active")
        .not("user_id", "is", null)

      const recipients = ((teammates as any[]) ?? [])
        .map((row) => row.user_id)
        .filter((id): id is string => Boolean(id) && id !== userId)

      // The owner is not always a team_members row.
      if (company.owner_id !== userId) {
        recipients.push(company.owner_id)
      }

      await notifyMany(supabase, recipients.map((userId) => ({ userId })), {
        companyId: company.id,
        type: "event_created",
        title: `${parsed.data.title} was added to the calendar`,
        message: `${member.name} added "${parsed.data.title}" to the ${company.name} calendar.`,
        severity: "info",
        link: "/dashboard/company/calendar",
        payload: {
          event_id: event.id,
          type: parsed.data.type,
          starts_at: parsed.data.starts_at,
        },
      })
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch (e) {
    if (e instanceof CompanyAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return dbError("app/api/company/events/route.ts", e, 500)
  }
})
