import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit"
import { loadPortalData } from "@/lib/portal/data"

/**
 * GET /api/portal/[token]
 * Public tenant portal data, resolved only through a hashed active token.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const limit = checkRateLimit(`portal:${clientIdentifier(request)}`, 60, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.resetInSeconds) } },
    )
  }

  const { token } = await ctx.params
  const data = await loadPortalData(token)
  if (!data) return NextResponse.json({ error: "This link has expired or been revoked" }, { status: 404 })

  return NextResponse.json(data)
}
