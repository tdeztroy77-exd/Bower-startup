import { NextRequest, NextResponse } from "next/server"
import { loadSignRequest } from "@/lib/esign/request"
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit"

/**
 * GET /api/sign/[token]/document
 * Downloads the signed .docx. Only available once the request is signed.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params
  const limit = checkRateLimit(`sign-doc:${clientIdentifier(request)}`, 20, 60_000)
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  const loaded = await loadSignRequest(token)
  if (!loaded) return NextResponse.json({ error: "This signing link is not active" }, { status: 404 })
  if (loaded.request.status !== "signed") {
    return NextResponse.json({ error: "This document has not been signed yet" }, { status: 409 })
  }

  const { data } = await loaded.service
    .from("esign_requests")
    .select("signed_docx")
    .eq("id", loaded.request.id)
    .maybeSingle()

  if (!data?.signed_docx) return NextResponse.json({ error: "Signed document not found" }, { status: 404 })

  const bytes = Buffer.from(data.signed_docx, "base64")
  const filename = `${loaded.request.template_id}-signed-${loaded.request.id.slice(0, 8)}.docx`

  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  })
}
