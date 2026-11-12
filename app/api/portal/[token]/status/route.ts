import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit"
import { resolvePortalToken } from "@/lib/portal/resolve"

/**
 * GET /api/portal/[token]/status?checkout=...
 * Polls the status of a payment prompt created from this portal. Scoped to the
 * tenant behind the token, so one link cannot inspect another tenant's payment.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params
  const resolved = await resolvePortalToken(token)
  if (!resolved) return NextResponse.json({ error: "This link has expired" }, { status: 404 })

  const limit = checkRateLimit(`portal-status:${clientIdentifier(request)}`, 120, 60_000)
  if (!limit.ok) return NextResponse.json({ error: "Too many checks" }, { status: 429 })

  const checkout = new URL(request.url).searchParams.get("checkout")
  if (!checkout) return NextResponse.json({ error: "Missing checkout id" }, { status: 400 })

  const { service, link, tenant } = resolved
  const { data: transaction } = await service
    .from("mpesa_transactions")
    .select("id, status, result_desc, mpesa_receipt, payment_id")
    .eq("checkout_request_id", checkout)
    .eq("tenant_id", tenant.id)
    .eq("user_id", link.user_id)
    .maybeSingle()

  if (!transaction) return NextResponse.json({ status: "unknown" }, { status: 404 })

  return NextResponse.json({
    status: transaction.status,
    message: transaction.result_desc,
    receipt: transaction.mpesa_receipt,
    payment_id: transaction.payment_id,
  })
}
