import { withAuth, successResponse, errorResponse, dbError, HttpError } from "@/lib/api"
import { createServiceClient } from "@/lib/supabase/service"
import { applyLateFeesForUser } from "@/lib/late-fees/apply"
import { DEFAULT_POLICY } from "@/lib/late-fees/compute"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/late-fees — current policy and recent charges.
 * PATCH /api/late-fees — update the policy (service role; browser cannot write).
 */
export const GET = withAuth(async (_request, { userId }) => {
  const supabase = await createClient()
  const { data: policy, error } = await supabase
    .from("late_fee_policies")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) return dbError("late-fees policy", error, 500)

  const { data: charges } = await supabase
    .from("late_fee_charges")
    .select("id, amount, applied_at, waived, tenants(full_name, first_name, last_name)")
    .eq("user_id", userId)
    .order("applied_at", { ascending: false })
    .limit(10)

  return successResponse({ policy: policy || DEFAULT_POLICY, charges: charges || [] })
})

export const PATCH = withAuth(async (request, { userId }) => {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const service = createServiceClient()
  if (!service) return errorResponse("Late fees are not configured", 503)

  const enabled = body.enabled === true
  const graceDays = Number(body.grace_days)
  const feeType = body.fee_type === "percent" ? "percent" : "flat"
  const amount = Number(body.amount)
  const percent = Number(body.percent)
  const cap = Number(body.cap)

  if (!Number.isFinite(graceDays) || graceDays < 0 || graceDays > 30) {
    throw new HttpError("Grace days must be between 0 and 30", 400)
  }
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
    throw new HttpError("Flat fee must be between 0 and 1,000,000", 400)
  }
  if (!Number.isFinite(percent) || percent < 0 || percent > 50) {
    throw new HttpError("Percentage must be between 0 and 50", 400)
  }
  if (!Number.isFinite(cap) || cap < 0 || cap > 1_000_000) {
    throw new HttpError("Cap must be between 0 and 1,000,000", 400)
  }

  const { data, error } = await service
    .from("late_fee_policies")
    .upsert(
      {
        user_id: userId,
        enabled,
        grace_days: Math.round(graceDays),
        fee_type: feeType,
        amount,
        percent,
        cap,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single()

  if (error) return dbError("late-fees policy update", error, 500)
  return successResponse(data)
})

/** POST /api/late-fees — apply the policy now. */
export const POST = withAuth(async (_request, { userId }) => {
  const service = createServiceClient()
  if (!service) return errorResponse("Late fees are not configured", 503)
  const result = await applyLateFeesForUser(service, userId)
  return successResponse(result)
})
