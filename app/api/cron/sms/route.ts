import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendSms, smsConfigured } from "@/lib/sms/provider"
import { buildReminderMessage } from "@/lib/sms/templates"
import { normaliseKenyanPhone } from "@/lib/portal/resolve"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET/POST /api/cron/sms
 *
 * Daily reminders for tenants without an email address. One message per tenant
 * per 20 hours. If the gateway is not configured the job does nothing and says
 * so — it does not log fake sends.
 */
function authorised(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return process.env.NODE_ENV !== "production"
  const header = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim()
  return header === expected || request.headers.get("x-cron-secret") === expected
}

async function run(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (!smsConfigured()) {
    return NextResponse.json({ ok: true, configured: false, sent: 0, note: "SMS provider not configured" })
  }

  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

  const { data: settingsRows } = await service
    .from("sms_settings")
    .select("user_id, days_before")
    .eq("enabled", true)
  if (!settingsRows?.length) return NextResponse.json({ ok: true, sent: 0, workspaces: 0 })

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const settings of settingsRows) {
    const lead = Number(settings.days_before ?? 3)
    const windowEnd = new Date(Date.now() + lead * 86_400_000).toISOString().slice(0, 10)

    const { data: tenants } = await service
      .from("tenants")
      .select("id, full_name, first_name, last_name, phone, email")
      .eq("user_id", settings.user_id)
      .eq("status", "active")
      .not("phone", "is", null)
      .or("email.is.null,email.eq.")

    const [{ data: profile }, { data: company }] = await Promise.all([
      service.from("user_profiles").select("company_name, full_name").eq("user_id", settings.user_id).maybeSingle(),
      service.from("companies").select("name").eq("owner_id", settings.user_id).maybeSingle(),
    ])
    const sender = company?.name || profile?.company_name || profile?.full_name || "your landlord"

    for (const tenant of tenants || []) {
      const phone = normaliseKenyanPhone(tenant.phone)
      if (!phone) {
        skipped += 1
        continue
      }

      const { data: recent } = await service
        .from("sms_messages")
        .select("id")
        .eq("user_id", settings.user_id)
        .eq("tenant_id", tenant.id)
        .gte("created_at", new Date(Date.now() - 20 * 3_600_000).toISOString())
        .limit(1)
        .maybeSingle()
      if (recent) {
        skipped += 1
        continue
      }

      const { data: invoice } = await service
        .from("rent_payments")
        .select("amount, late_fee, due_date")
        .eq("user_id", settings.user_id)
        .eq("tenant_id", tenant.id)
        .in("status", ["pending", "late", "partial"])
        .lte("due_date", windowEnd)
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle()
      if (!invoice) {
        skipped += 1
        continue
      }

      const tenantName =
        tenant.full_name || [tenant.first_name, tenant.last_name].filter(Boolean).join(" ") || "Tenant"
      const message = buildReminderMessage({
        tenantName,
        company: sender,
        amount: Number(invoice.amount || 0) + Number(invoice.late_fee || 0),
        dueDate: invoice.due_date,
      })
      const result = await sendSms({ to: phone, message })

      await service.from("sms_messages").insert({
        user_id: settings.user_id,
        tenant_id: tenant.id,
        phone,
        body: message,
        status: result.ok ? "sent" : "failed",
        provider: result.provider,
        provider_ref: result.ref || null,
        error: result.error || null,
        sent_at: result.ok ? new Date().toISOString() : null,
      })
      if (result.ok) sent += 1
      else if (result.error) errors.push(result.error)
    }
  }

  return NextResponse.json({
    ok: true,
    ran_at: new Date().toISOString(),
    sent,
    skipped,
    errors: errors.slice(0, 5),
  })
}

export async function GET(request: NextRequest) {
  return run(request)
}

export async function POST(request: NextRequest) {
  return run(request)
}
