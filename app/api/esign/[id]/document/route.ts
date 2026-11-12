import { NextResponse } from "next/server"
import { withAuth, errorResponse, dbError } from "@/lib/api"
import { createServiceClient } from "@/lib/supabase/service"

/**
 * GET /api/esign/[id]/document
 *
 * Owner-side download of a completed signature. The raw signing token is not
 * kept by the landlord, so the signed file is served by request id after an
 * ownership check.
 */
export const GET = withAuth<{ id: string }>(async (_request, { userId }, params) => {
  const service = createServiceClient()
  if (!service) return errorResponse("E-signature is not configured", 503)

  const { data, error } = await service
    .from("esign_requests")
    .select("id, template_id, status, signed_docx, signer_name")
    .eq("id", params.id)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) return dbError("esign document", error, 500)
  if (!data) return errorResponse("Signing request not found", 404)
  if (data.status !== "signed" || !data.signed_docx) {
    return errorResponse("This document has not been signed yet", 409)
  }

  const bytes = Buffer.from(data.signed_docx, "base64")
  const filename = `${data.template_id}-signed-${data.id.slice(0, 8)}.docx`

  return new NextResponse(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  })
})
