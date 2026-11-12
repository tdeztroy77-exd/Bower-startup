import { withAuth, successResponse, errorResponse, HttpError, dbError } from "@/lib/api"
import { createServiceClient } from "@/lib/supabase/service"
import { createPortalToken, portalPath, PORTAL_TOKEN_DAYS } from "@/lib/portal/tokens"

/**
 * POST /api/tenants/[id]/portal-link
 *
 * Issues a new tenant portal link. Any previous unrevoked link for the tenant
 * is revoked first, so there is exactly one working link at a time.
 *
 * The raw token is returned once; only its SHA-256 hash is stored.
 */
export const POST = withAuth<{ id: string }>(async (request, { supabase, userId }, params) => {
  const tenantId = params?.id
  if (!tenantId) throw new HttpError("Tenant id is required", 400)

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id, full_name, first_name, last_name")
    .eq("id", tenantId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) return dbError("portal-link tenant lookup", error, 500)
  if (!tenant) return errorResponse("Tenant not found", 404)

  const service = createServiceClient()
  if (!service) return errorResponse("Tenant portal is not configured", 503)

  await service
    .from("tenant_portal_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .is("revoked_at", null)

  const token = createPortalToken()
  const { error: insertError } = await service.from("tenant_portal_tokens").insert({
    user_id: userId,
    tenant_id: tenantId,
    token_hash: token.hash,
    expires_at: token.expiresAt.toISOString(),
  })
  if (insertError) return dbError("portal-link insert", insertError, 500)

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get("origin") ||
    new URL(request.url).origin

  return successResponse({
    url: `${origin.replace(/\/$/, "")}${portalPath(token.raw)}`,
    expires_at: token.expiresAt.toISOString(),
    days: PORTAL_TOKEN_DAYS,
  })
})

/** DELETE /api/tenants/[id]/portal-link — revoke every active link. */
export const DELETE = withAuth<{ id: string }>(async (_request, { userId }, params) => {
  const tenantId = params?.id
  if (!tenantId) throw new HttpError("Tenant id is required", 400)

  const service = createServiceClient()
  if (!service) return errorResponse("Tenant portal is not configured", 503)

  const { error } = await service
    .from("tenant_portal_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .is("revoked_at", null)
  if (error) return dbError("portal-link revoke", error, 500)

  return successResponse({ revoked: true })
})
