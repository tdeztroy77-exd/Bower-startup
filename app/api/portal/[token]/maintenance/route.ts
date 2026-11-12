import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit"
import { resolvePortalToken, tenantDisplayName } from "@/lib/portal/resolve"

const CATEGORIES = new Set([
  "general",
  "plumbing",
  "electrical",
  "hvac",
  "appliances",
  "structural",
  "pest_control",
  "security",
  "cleaning",
  "repairs",
  "painting",
  "roofing",
  "flooring",
  "windows_doors",
  "landscaping",
  "other",
])

/**
 * POST /api/portal/[token]/maintenance
 * Body: { title, description, category? }
 *
 * Creates a real maintenance request attributed to the landlord and tenant,
 * and notifies the landlord in-app. Rate-limited so a leaked link cannot spam
 * the queue.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params
  const resolved = await resolvePortalToken(token)
  if (!resolved) return NextResponse.json({ error: "This link has expired or been revoked" }, { status: 404 })

  const { service, link, tenant } = resolved

  const limit = checkRateLimit(`portal-maint:${clientIdentifier(request)}`, 5, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please contact your landlord directly." },
      { status: 429, headers: { "Retry-After": String(limit.resetInSeconds) } },
    )
  }

  if (!tenant.property_id) {
    return NextResponse.json(
      { error: "This tenancy is not linked to a property. Ask your landlord to update the record." },
      { status: 400 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string
    description?: string
    category?: string
  }

  const title = (body.title || "").trim()
  const description = (body.description || "").trim()
  const category = CATEGORIES.has((body.category || "").trim()) ? body.category!.trim() : "general"

  if (title.length < 3 || title.length > 120) {
    return NextResponse.json({ error: "Give the issue a short title (3–120 characters)." }, { status: 400 })
  }
  if (description.length < 10 || description.length > 2000) {
    return NextResponse.json({ error: "Describe the issue in 10–2000 characters." }, { status: 400 })
  }

  const { data: property } = await service
    .from("properties")
    .select("name")
    .eq("id", tenant.property_id)
    .eq("user_id", link.user_id)
    .maybeSingle()

  const { data: created, error } = await service
    .from("maintenance_requests")
    .insert({
      user_id: link.user_id,
      property_id: tenant.property_id,
      tenant_id: tenant.id,
      title,
      description,
      category,
      priority: "medium",
      status: "open",
      notes: "Raised by the tenant through the portal.",
    })
    .select("id, created_at")
    .single()

  if (error) {
    console.error("[portal/maintenance] insert failed", error.message)
    return NextResponse.json({ error: "Could not send the request. Please contact your landlord." }, { status: 500 })
  }

  await service.from("notifications").insert({
    user_id: link.user_id,
    type: "maintenance_requested",
    title: "New maintenance request",
    message: `${tenantDisplayName(tenant)} raised “${title}”${property?.name ? ` at ${property.name}` : ""}.`,
    severity: "warning",
    link: `/dashboard/maintenance/${created.id}`,
    metadata: { tenant_id: tenant.id, request_id: created.id, source: "tenant_portal" },
  })

  return NextResponse.json({
    ok: true,
    reference: `MR-${created.id.slice(0, 6).toUpperCase()}`,
    message: "Your landlord has been notified.",
  })
}
