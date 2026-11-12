import { withAuth, successResponse, errorResponse, dbError, HttpError } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { smsConfigured, smsProviderName } from "@/lib/sms/provider"

const DEFAULTS = { enabled: false, days_before: 3, sender_id: null as string | null }

/** GET /api/sms/settings — settings + whether a provider is wired. */
export const GET = withAuth(async (_request, { userId }) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sms_settings")
    .select("enabled, days_before, sender_id, updated_at")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) return dbError("sms settings", error, 500)

  return successResponse({
    settings: data || DEFAULTS,
    configured: smsConfigured(),
    provider: smsProviderName(),
  })
})

/** PATCH /api/sms/settings — service role write; the browser cannot set it directly. */
export const PATCH = withAuth(async (request, { userId }) => {
  const body = (await request.json().catch(() => ({}))) as {
    enabled?: boolean
    days_before?: number
    sender_id?: string
  }
  const service = createServiceClient()
  if (!service) return errorResponse("SMS is not configured", 503)

  const days = Number(body.days_before ?? DEFAULTS.days_before)
  if (!Number.isFinite(days) || days < 0 || days > 14) {
    throw new HttpError("Reminder lead time must be between 0 and 14 days", 400)
  }

  const { data, error } = await service
    .from("sms_settings")
    .upsert(
      {
        user_id: userId,
        enabled: body.enabled === true,
        days_before: Math.round(days),
        sender_id: (body.sender_id || "").trim().slice(0, 11) || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single()
  if (error) return dbError("sms settings update", error, 500)

  return successResponse({ settings: data, configured: smsConfigured(), provider: smsProviderName() })
})
