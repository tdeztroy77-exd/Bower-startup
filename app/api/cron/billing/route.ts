import { NextRequest, NextResponse } from "next/server"
import { darajaConfigured, darajaMockMode, stkPush } from "@/lib/mpesa/daraja"
import { billingConfigured, billingDb, notifyUser } from "@/lib/billing/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET/POST /api/cron/billing
 *
 * Daily billing sweep:
 *   1. move subscription state forward (trial ended, period ended → grace,
 *      grace ended → paused)
 *   2. remind people whose trial is about to end
 *   3. send M-Pesa renewal prompts for subscriptions that renew automatically
 *   4. nudge past-due accounts once a day
 *
 * Stripe renewals do not appear here: Stripe charges on its own schedule and
 * the webhook applies the result. This job is the M-Pesa equivalent.
 *
 * Auth: `Authorization: Bearer $BILLING_CRON_SECRET` (falling back to
 * `CRON_SECRET`). In production an unset secret is a hard failure.
 */
function authorised(req: NextRequest): boolean {
  const expected = process.env.BILLING_CRON_SECRET || process.env.CRON_SECRET
  if (!expected) return process.env.NODE_ENV !== "production"
  const header = req.headers.get("authorization") || ""
  const headerSecret = header.replace(/^Bearer\s+/i, "").trim()
  const alt = req.headers.get("x-cron-secret") || ""
  return headerSecret === expected || alt === expected
}

async function run(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!billingConfigured()) {
    return NextResponse.json({ error: "Billing database is not configured" }, { status: 503 })
  }

  const db = billingDb()
  const summary: Record<string, unknown> = {}

  // 1) state machine
  const { data: sync, error: syncError } = await db.rpc("billing_sync_status")
  if (syncError) {
    console.error("[cron/billing] billing_sync_status failed", syncError.message)
    summary.sync_error = "state sync failed"
  } else {
    summary.sync = sync
  }

  const nowIso = new Date().toISOString()
  const soon = new Date(Date.now() + 3 * 86_400_000).toISOString()

  // 2) trial ending notices (once per day)
  const { data: trials } = await db
    .from("subscriptions")
    .select("user_id, trial_ends_at, last_renewal_notice_at")
    .eq("status", "trialing")
    .lte("trial_ends_at", soon)
    .gte("trial_ends_at", nowIso)

  let trialNotices = 0
  for (const trial of trials || []) {
    const lastNotice = trial.last_renewal_notice_at ? new Date(trial.last_renewal_notice_at).getTime() : 0
    if (Date.now() - lastNotice < 20 * 3_600_000) continue
    const daysLeft = Math.max(
      1,
      Math.ceil((new Date(trial.trial_ends_at).getTime() - Date.now()) / 86_400_000),
    )
    await notifyUser(db, trial.user_id, {
      type: "billing_trial_ending",
      title: "Trial ending soon",
      message: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left. Add a payment method to keep the workspace running.`,
      severity: "warning",
      link: "/dashboard/billing",
    })
    await db
      .from("subscriptions")
      .update({ last_renewal_notice_at: nowIso })
      .eq("user_id", trial.user_id)
    trialNotices += 1
  }
  summary.trial_notices = trialNotices

  // 3) M-Pesa renewals
  const mpesaReady = darajaConfigured() || darajaMockMode()
  summary.mpesa_configured = darajaConfigured()
  const renewalResults: Array<{ userId: string; status: string }> = []

  if (mpesaReady) {
    const { data: due, error: dueError } = await db.rpc("billing_due_for_renewal", { p_limit: 25 })
    if (dueError) {
      console.error("[cron/billing] renewal queue failed", dueError.message)
      summary.renewal_error = "queue unavailable"
    } else {
      for (const row of (due || []) as Array<{
        user_id: string
        plan_code: string
        phone: string
        amount_kes: number
        renewal_attempts: number
      }>) {
        const attempt = Number(row.renewal_attempts || 0) + 1
        try {
          const push = await stkPush({
            phone: row.phone,
            amount: Number(row.amount_kes),
            accountReference: `SUB-${row.plan_code.toUpperCase()}`,
            transactionDesc: "Bower renewal",
          })
          const ok = push.ResponseCode === "0" && !push.mocked
          const { error: insertError } = await db.from("subscription_payments").insert({
            user_id: row.user_id,
            plan_code: row.plan_code,
            amount: Number(row.amount_kes),
            phone: row.phone,
            checkout_request_id: push.CheckoutRequestID,
            merchant_request_id: push.MerchantRequestID,
            status: ok ? "initiated" : "failed",
            provider: "mpesa",
            kind: "renewal",
            attempt,
            result_desc: push.ResponseDescription,
          })
          if (insertError) {
            console.error("[cron/billing] could not record renewal payment", insertError.message)
          }
          await db
            .from("subscriptions")
            .update({ renewal_attempts: attempt, last_renewal_attempt_at: nowIso })
            .eq("user_id", row.user_id)

          await notifyUser(db, row.user_id, {
            type: ok ? "billing_renewal_prompt" : "billing_payment_failed",
            title: ok ? "Renewal prompt sent" : "Renewal prompt failed",
            message: ok
              ? "Check your phone for the M-Pesa prompt to renew Bower."
              : "We could not send the M-Pesa prompt. Open billing to renew manually.",
            severity: ok ? "info" : "warning",
            link: "/dashboard/billing",
            metadata: { attempt },
          })
          renewalResults.push({ userId: row.user_id, status: ok ? "prompted" : "failed" })
        } catch (error) {
          console.error("[cron/billing] renewal push failed", error)
          await db
            .from("subscriptions")
            .update({ renewal_attempts: attempt, last_renewal_attempt_at: nowIso })
            .eq("user_id", row.user_id)
          renewalResults.push({ userId: row.user_id, status: "error" })
        }
      }
    }
  }
  summary.renewals = renewalResults

  // 4) past-due nudges (once a day)
  const { data: pastDue } = await db
    .from("subscriptions")
    .select("user_id, grace_ends_at")
    .eq("status", "past_due")
    .not("grace_ends_at", "is", null)
    .gt("grace_ends_at", nowIso)

  let dunning = 0
  for (const row of pastDue || []) {
    const { data: recent } = await db
      .from("notifications")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("type", "billing_past_due")
      .gte("created_at", new Date(Date.now() - 20 * 3_600_000).toISOString())
      .limit(1)
      .maybeSingle()
    if (recent) continue
    await notifyUser(db, row.user_id, {
      type: "billing_past_due",
      title: "Payment needed",
      message: "Access pauses at the end of the grace period. Renew from billing.",
      severity: "critical",
      link: "/dashboard/billing",
    })
    dunning += 1
  }
  summary.past_due_notices = dunning

  return NextResponse.json({ ok: true, ran_at: nowIso, ...summary })
}

export async function GET(request: NextRequest) {
  return run(request)
}

export async function POST(request: NextRequest) {
  return run(request)
}
