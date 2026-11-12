import { withAuth, successResponse, errorResponse, dbError } from "@/lib/api"
import { createServiceClient } from "@/lib/supabase/service"

/** POST /api/esign/[id]/void — withdraw a signing link. */
export const POST = withAuth<{ id: string }>(async (_request, { userId }, params) => {
  const service = createServiceClient()
  if (!service) return errorResponse("E-signature is not configured", 503)

  const { data, error } = await service
    .from("esign_requests")
    .update({ status: "void", voided_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", userId)
    .in("status", ["sent", "viewed"])
    .select("id, status")
    .maybeSingle()

  if (error) return dbError("esign void", error, 500)
  if (!data) return errorResponse("Signing request not found or already completed", 404)
  return successResponse(data)
})
