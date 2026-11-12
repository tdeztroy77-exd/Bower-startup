import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit"
import { loadSignRequest, toSignView } from "@/lib/esign/request"
import { appendSignatureCertificate, sha256 } from "@/lib/esign/signature"
import { renderTemplate } from "@/lib/templates/templates"

/**
 * GET /api/sign/[token]  — signing data, marks the first view.
 * POST /api/sign/[token] — records the signature, stores the signed .docx.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params
  const limit = checkRateLimit(`sign-view:${clientIdentifier(request)}`, 60, 60_000)
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  const loaded = await loadSignRequest(token, { recordView: true })
  if (!loaded) return NextResponse.json({ error: "This signing link is not active" }, { status: 404 })

  return NextResponse.json(toSignView(loaded))
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params
  const limit = checkRateLimit(`sign-submit:${clientIdentifier(request)}`, 10, 10 * 60_000)
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 })
  }

  const loaded = await loadSignRequest(token)
  if (!loaded) return NextResponse.json({ error: "This signing link is not active" }, { status: 404 })
  if (loaded.request.status === "signed") {
    return NextResponse.json({ error: "This document has already been signed" }, { status: 409 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string
    email?: string
    consent?: boolean
  }
  const name = (body.name || "").trim()
  const email = (body.email || "").trim()
  const consent = body.consent === true

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: "Type your full name to sign" }, { status: 400 })
  }
  if (!consent) {
    return NextResponse.json({ error: "You must agree to sign electronically" }, { status: 400 })
  }

  const ip =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  const agent = (request.headers.get("user-agent") || "unknown").slice(0, 250)

  try {
    const original = await renderTemplate(loaded.request.template_id, loaded.request.fields || {})
    const originalHash = sha256(original)
    const signedAt = new Date().toISOString()
    const signed = await appendSignatureCertificate(original, {
      documentTitle: loaded.meta?.title || loaded.request.template_id,
      signerName: name,
      signerEmail: email || null,
      signedAt,
      ip,
      userAgent: agent,
      originalHash,
    })
    const signedHash = sha256(signed)

    const { error: updateError } = await loaded.service
      .from("esign_requests")
      .update({
        status: "signed",
        signer_name: name,
        signer_email: email || null,
        signer_ip: ip,
        signer_agent: agent,
        signed_at: signedAt,
        document_hash: signedHash,
        signed_docx: signed.toString("base64"),
      })
      .eq("id", loaded.request.id)
      .in("status", ["sent", "viewed"])

    if (updateError) {
      console.error("[sign] could not store the signed document", updateError.message)
      return NextResponse.json({ error: "Could not record the signature" }, { status: 500 })
    }

    await loaded.service.from("esign_events").insert({
      request_id: loaded.request.id,
      event: "signed",
      name,
      email: email || null,
      ip,
      user_agent: agent,
    })

    await loaded.service.from("notifications").insert({
      user_id: loaded.request.user_id,
      type: "esign_signed",
      title: "Document signed",
      message: `${name} signed “${loaded.meta?.title || loaded.request.template_id}”.`,
      severity: "success",
      link: `/dashboard/tenants/${loaded.request.tenant_id}`,
      metadata: { request_id: loaded.request.id, document_hash: signedHash },
    })

    return NextResponse.json({
      ok: true,
      signed_at: signedAt,
      document_hash: signedHash,
      download: `/api/sign/${token}/document`,
    })
  } catch (error) {
    console.error("[sign] failed to generate the signed document", error)
    return NextResponse.json({ error: "Could not generate the signed document" }, { status: 500 })
  }
}
