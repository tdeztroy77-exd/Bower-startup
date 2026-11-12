import { createServiceClient } from "@/lib/supabase/service"
import { hashPortalToken, isPortalTokenActive } from "@/lib/portal/tokens"

export type PortalTenant = {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  property_id: string | null
  monthly_rent: number | null
  status: string | null
  properties: { name: string | null; address: string | null } | null
}

/**
 * Resolve a raw portal token to its link + tenant, or null.
 * Shared by the read, pay and maintenance endpoints so the rules cannot drift.
 */
export async function resolvePortalToken(raw: string) {
  if (!raw || raw.length < 20) return null
  const service = createServiceClient()
  if (!service) return null

  const { data: link } = await service
    .from("tenant_portal_tokens")
    .select("id, user_id, tenant_id, expires_at, revoked_at")
    .eq("token_hash", hashPortalToken(raw))
    .maybeSingle()

  if (!isPortalTokenActive(link)) return null

  const { data: tenant } = await service
    .from("tenants")
    .select("id, full_name, first_name, last_name, phone, property_id, monthly_rent, status, properties(name, address)")
    .eq("id", link!.tenant_id)
    .eq("user_id", link!.user_id)
    .maybeSingle()

  if (!tenant) return null
  return { service, link: link!, tenant: tenant as unknown as PortalTenant }
}

export function tenantDisplayName(tenant: PortalTenant): string {
  return (
    tenant.full_name ||
    [tenant.first_name, tenant.last_name].filter(Boolean).join(" ") ||
    "Tenant"
  )
}

export function normaliseKenyanPhone(input: string | null | undefined): string | null {
  if (!input) return null
  const phone = input.replace(/[^\d+]/g, "")
  const match = phone.match(/^(?:\+?254|0)?(7\d{8})$/)
  return match ? `254${match[1]}` : null
}
