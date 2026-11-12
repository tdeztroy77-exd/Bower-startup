import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { applyLateFeesForUser } from "@/lib/late-fees/apply"
import type { LateFeePolicy } from "@/lib/late-fees/compute"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET/POST /api/cron/late-fees
 *
 * Daily sweep across every workspace with late fees enabled. Idempotent per
 * invoice (unique payment_id) so running it twice cannot double-charge.
 */
function authorised(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return process.env.NODE_ENV !== "production"
  const header = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim()
  return header === expected || request.headers.get("x-cron-secret") === expected
}

async function run(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

  const { data: policies, error } = await service
    .from("late_fee_policies")
    .select("user_id, enabled, grace_days, fee_type, amount, percent, cap")
    .eq("enabled", true)

  if (error) {
    console.error("[cron/late-fees] policy query failed", error.message)
    return NextResponse.json({ error: "Policy query failed" }, { status: 500 })
  }

  const results: Array<{ user_id: string; applied: number; total: number }> = []
  for (const row of policies || []) {
    try {
      const result = await applyLateFeesForUser(service, row.user_id, {
        policy: row as unknown as LateFeePolicy,
      })
      results.push({ user_id: row.user_id, applied: result.applied, total: result.total })
    } catch (e) {
      console.error("[cron/late-fees] failed for a workspace", e)
    }
  }

  return NextResponse.json({
    ok: true,
    ran_at: new Date().toISOString(),
    workspaces: (policies || []).length,
    total_applied: results.reduce((sum, row) => sum + row.applied, 0),
    total_amount: results.reduce((sum, row) => sum + row.total, 0),
    results,
  })
}

export async function GET(request: NextRequest) {
  return run(request)
}

export async function POST(request: NextRequest) {
  return run(request)
}
