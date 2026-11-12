import { withAuth, successResponse, errorResponse, HttpError, dbError } from "@/lib/api"
import { createServiceClient } from "@/lib/supabase/service"
import { createSignToken, SIGN_TOKEN_DAYS } from "@/lib/esign/signature"
import { getTemplate } from "@/lib/templates/templates"

/**
 * POST /api/esign
 * Body: { tenant_id, template_id, fields }
 *
 * Creates a signing request and returns the private signing link once. Any
 * earlier un-signed request for the same tenant and template is voided so a
 * tenant is never asked to sign two versions.
 */
export const POST = withAuth(async (request, { supabase, userId }) => {
  const body = (await request.json().catch(() => ({}))) as {
    tenant_id?: string
    template_id?: string
    fields?: Record<string, string>
  }

  if (!body.tenant_id || !body.template_id) {
    throw new HttpError("Tenant and template are required", 400)
  }
  const meta = getTemplate(body.template_id)
  if (!meta) throw new HttpError("Unknown template", 404)

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", body.tenant_id)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) return dbError("esign tenant lookup", error, 500)
  if (!tenant) return errorResponse("Tenant not found", 404)

  const service = createServiceClient()
  if (!service) return errorResponse("E-signature is not configured", 503)

  await service
    .from("esign_requests")
    .update({ status: "void", voided_at: new Date().toISOString() })
    .eq("tenant_id", body.tenant_id)
    .eq("template_id", body.template_id)
    .eq("user_id", userId)
    .in("status", ["sent", "viewed"])

  const token = createSignToken()
  const { error: insertError } = await service.from("esign_requests").insert({
    user_id: userId,
    tenant_id: body.tenant_id,
    template_id: body.template_id,
    fields: body.fields || {},
    token_hash: token.hash,
    expires_at: token.expiresAt.toISOString(),
    status: "sent",
  })
  if (insertError) return dbError("esign insert", insertError, 500)

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get("origin") ||
    new URL(request.url).origin

  return successResponse({
    url: `${origin.replace(/\/$/, "")}/sign/${token.raw}`,
    expires_at: token.expiresAt.toISOString(),
    days: SIGN_TOKEN_DAYS,
    template: meta.title,
  })
})

/** GET /api/esign?tenant_id= — signing history for a tenant. */
export const GET = withAuth(async (request, { supabase, userId }) => {
  const tenantId = new URL(request.url).searchParams.get("tenant_id")
  let query = supabase
    .from("esign_requests")
    .select("id, tenant_id, template_id, status, created_at, signed_at, signer_name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25)
  if (tenantId) query = query.eq("tenant_id", tenantId)

  const { data, error } = await query
  if (error) return dbError("esign list", error, 500)
  return successResponse(data || [])
})
