import { withAuth, successResponse, errorResponse, dbError, HttpError } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { normaliseKenyanPhone } from "@/lib/portal/resolve"
import { buildReminderMessage } from "@/lib/sms/templates"
import { checkRateLimit } from "@/lib/api/rate-limit"
import { sendSms, smsConfigured } from "@/lib/sms/provider"

/** GET /api/sms?tenant_id= — recent messages. */
export const GET = withAuth(async (request, { userId }) => {
  const supabase = await createClient()
  const tenantId = new URL(request.url).searchParams.get("tenant_id")
  let query = supabase
    .from("sms_messages")
    .select("id, tenant_id, phone, body, status, provider_ref, error, created_at, sent_at, tenants(full_name, first_name, last_name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25)
  if (tenantId) query = query.eq("tenant_id", tenantId)

  const { data, error } = await query
  if (error) return dbError("sms messages", error, 500)
  return successResponse(data || [])
})

/**
 * POST /api/sms/send
 * Body: { tenant_id, message? }
 *
 * Sends one reminder through the provider and records the real result. If no
 * provider is configured the message is recorded as skipped and the API says
 * so — it never reports a success it did not have.
 */
export const POST = withAuth(async (request, { supabase, userId }) => {
  const body = (await request.json().catch(() => ({}))) as { tenant_id?: string; message?: string }
  if (!body.tenant_id) throw new HttpError("Tenant is required", 400)

  const limit = checkRateLimit(`sms-send:${userId}`, 20, 60 * 60_000)
  if (!limit.ok) return errorResponse("Too many messages. Try again later.", 429)

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id, full_name, first_name, last_name, phone, properties(name)")
    .eq("id", body.tenant_id)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) return dbError("sms tenant", error, 500)
  if (!tenant) return errorResponse("Tenant not found", 404)

  const phone = normaliseKenyanPhone(tenant.phone)
  if (!phone) {
    return errorResponse("This tenant has no valid phone number for SMS", 400)
  }

  const tenantName =
    tenant.full_name || [tenant.first_name, tenant.last_name].filter(Boolean).join(" ") || "Tenant"

  const { data: invoice } = await supabase
    .from("rent_payments")
    .select("amount, late_fee, due_date")
    .eq("user_id", userId)
    .eq("tenant_id", tenant.id)
    .in("status", ["pending", "late", "partial"])
    .order("due_date", { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("company_name, full_name")
    .eq("user_id", userId)
    .maybeSingle()
  const { data: company } = await supabase.from("companies").select("name").eq("owner_id", userId).maybeSingle()

  if (!invoice && !(body.message || "").trim()) {
    throw new HttpError("This tenant has no unpaid invoice. Write a message instead.", 400)
  }

  const message =
    (body.message || "").trim() ||
    buildReminderMessage({
      tenantName,
      company: company?.name || (profile as any)?.company_name || (profile as any)?.full_name || "your landlord",
      amount: Number(invoice?.amount || 0) + Number(invoice?.late_fee || 0) || 0,
      dueDate: invoice?.due_date || null,
      currency: "KES",
    })

  if (message.length < 10 || message.length > 480) {
    throw new HttpError("Message must be between 10 and 480 characters", 400)
  }

  const service = createServiceClient()
  if (!service) return errorResponse("SMS is not configured", 503)

  if (!smsConfigured()) {
    await service.from("sms_messages").insert({
      user_id: userId,
      tenant_id: tenant.id,
      phone,
      body: message,
      status: "skipped",
      provider: "none",
      error: "No SMS provider configured",
    })
    return errorResponse("SMS is not configured. Add AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY.", 503)
  }

  const result = await sendSms({ to: phone, message })
  const { error: logError } = await service.from("sms_messages").insert({
    user_id: userId,
    tenant_id: tenant.id,
    phone,
    body: message,
    status: result.ok ? "sent" : "failed",
    provider: result.provider,
    provider_ref: result.ref || null,
    error: result.error || null,
    sent_at: result.ok ? new Date().toISOString() : null,
  })
  if (logError) console.error("[sms/send] could not log the message", logError.message)

  if (!result.ok) {
    return errorResponse(result.error || "The SMS gateway rejected the message", 502)
  }
  return successResponse({ ok: true, provider_ref: result.ref, phone, message })
})
