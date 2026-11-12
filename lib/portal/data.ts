import { createServiceClient } from "@/lib/supabase/service"
import { hashPortalToken, isPortalTokenActive } from "@/lib/portal/tokens"

export type PortalData = {
  tenant: {
    name: string
    phone: string | null
    status: string | null
    lease_start: string | null
    lease_end: string | null
    monthly_rent: number | null
  }
  property: { name: string | null; address: string | null } | null
  owner: { company: string; contact_name: string | null; phone: string | null }
  balance: number
  payments: Array<{
    id: string
    amount: number
    late_fee: number
    total: number
    due_date: string | null
    paid_date: string | null
    status: string | null
    method: string | null
    reference: string | null
    settled: boolean
  }>
  expires_at: string
  token_id: string
}

const settledStatus = (status: string | null) => status === "paid" || status === "completed"

/**
 * Load the tenant portal payload for a raw token.
 *
 * Returns null for an unknown, expired or revoked link. The tenant record is
 * the only record returned: no national IDs, notes, documents or other tenants.
 */
export async function loadPortalData(raw: string): Promise<PortalData | null> {
  if (!raw || raw.length < 20) return null
  const service = createServiceClient()
  if (!service) return null

  const { data: link } = await service
    .from("tenant_portal_tokens")
    .select("id, user_id, tenant_id, expires_at, revoked_at")
    .eq("token_hash", hashPortalToken(raw))
    .maybeSingle()

  if (!isPortalTokenActive(link)) return null

  const [{ data: tenant }, { data: payments }] = await Promise.all([
    service
      .from("tenants")
      .select("id, full_name, first_name, last_name, phone, property_id, lease_start_date, lease_end_date, monthly_rent, status, properties(name, address)")
      .eq("id", link!.tenant_id)
      .eq("user_id", link!.user_id)
      .maybeSingle(),
    service
      .from("rent_payments")
      .select("id, amount, late_fee, due_date, paid_date, status, payment_method, reference_number")
      .eq("tenant_id", link!.tenant_id)
      .eq("user_id", link!.user_id)
      .order("due_date", { ascending: false })
      .limit(12),
  ])

  if (!tenant) return null

  const [{ data: profile }, { data: company }] = await Promise.all([
    service.from("user_profiles").select("full_name, company_name, phone").eq("user_id", link!.user_id).maybeSingle(),
    service.from("companies").select("name").eq("owner_id", link!.user_id).maybeSingle(),
  ])

  await service
    .from("tenant_portal_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", link!.id)

  const tenantName =
    tenant.full_name || [tenant.first_name, tenant.last_name].filter(Boolean).join(" ") || "Tenant"
  const balance = (payments || [])
    .filter((payment) => !settledStatus(payment.status) && !["cancelled", "canceled"].includes(payment.status || ""))
    .reduce((sum, payment) => sum + Number(payment.amount || 0) + Number(payment.late_fee || 0), 0)

  return {
    tenant: {
      name: tenantName,
      phone: tenant.phone,
      status: tenant.status,
      lease_start: tenant.lease_start_date,
      lease_end: tenant.lease_end_date,
      monthly_rent: tenant.monthly_rent,
    },
    property: tenant.properties
      ? { name: (tenant.properties as any).name, address: (tenant.properties as any).address }
      : null,
    owner: {
      company: company?.name || profile?.company_name || "Your landlord",
      contact_name: profile?.full_name || null,
      phone: profile?.phone || null,
    },
    balance,
    payments: (payments || []).map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount || 0),
      late_fee: Number(payment.late_fee || 0),
      total: Number(payment.amount || 0) + Number(payment.late_fee || 0),
      due_date: payment.due_date,
      paid_date: payment.paid_date,
      status: payment.status,
      method: payment.payment_method,
      reference: payment.reference_number,
      settled: settledStatus(payment.status),
    })),
    expires_at: link!.expires_at,
    token_id: link!.id,
  }
}
