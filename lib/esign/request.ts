import { createServiceClient } from "@/lib/supabase/service"
import { getTemplate } from "@/lib/templates/templates"
import { hashSignToken, isSignTokenActive } from "@/lib/esign/signature"

export type SignRequestView = {
  id: string
  template_id: string
  template_title: string
  fields: Record<string, string>
  status: string
  expires_at: string
  tenant_name: string
  property_name: string | null
  signed_at: string | null
  signer_name: string | null
}

/**
 * Resolve a signing link and mark the first view. Service-role only; the raw
 * token never touches the database.
 */
export async function loadSignRequest(raw: string, options: { recordView?: boolean } = {}) {
  if (!raw || raw.length < 20) return null
  const service = createServiceClient()
  if (!service) return null

  const { data: request } = await service
    .from("esign_requests")
    .select("id, user_id, tenant_id, template_id, fields, status, expires_at, signed_at, signer_name, viewed_at")
    .eq("token_hash", hashSignToken(raw))
    .maybeSingle()

  if (!isSignTokenActive(request)) return null

  const [{ data: tenant }, { data: property }, meta] = await Promise.all([
    service
      .from("tenants")
      .select("full_name, first_name, last_name, property_id")
      .eq("id", request!.tenant_id)
      .maybeSingle(),
    service
      .from("tenants")
      .select("properties(name)")
      .eq("id", request!.tenant_id)
      .maybeSingle(),
    Promise.resolve(getTemplate(request!.template_id)),
  ])

  if (!tenant) return null

  if (options.recordView && request!.status === "sent") {
    const now = new Date().toISOString()
    await service
      .from("esign_requests")
      .update({ status: "viewed", viewed_at: now })
      .eq("id", request!.id)
      .eq("status", "sent")
    await service.from("esign_events").insert({ request_id: request!.id, event: "viewed" })
  }

  const tenantName =
    tenant.full_name || [tenant.first_name, tenant.last_name].filter(Boolean).join(" ") || "Tenant"

  return {
    service,
    request: request!,
    tenantName,
    propertyName: (property as any)?.properties?.name || null,
    meta,
  }
}

export function toSignView(input: NonNullable<Awaited<ReturnType<typeof loadSignRequest>>>): SignRequestView {
  return {
    id: input.request.id,
    template_id: input.request.template_id,
    template_title: input.meta?.title || input.request.template_id,
    fields: (input.request.fields || {}) as Record<string, string>,
    status: input.request.status,
    expires_at: input.request.expires_at,
    tenant_name: input.tenantName,
    property_name: input.propertyName,
    signed_at: input.request.signed_at || null,
    signer_name: input.request.signer_name || null,
  }
}
