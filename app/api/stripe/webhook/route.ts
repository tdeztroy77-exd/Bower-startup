import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

/**
 * POST /api/stripe/webhook
 *
 * Stripe is the renewal rail for card subscribers: it charges on its own
 * schedule, and these events keep our entitlement in sync. The M-Pesa rail is
 * renewed by the billing cron instead.
 *
 * Idempotency: every event id is recorded in `billing_webhook_events` before
 * any state is touched. A replayed event is acknowledged without reapplying.
 */
export const runtime = "nodejs"

function periodFromSubscription(subscription: any): { start: Date; end: Date } {
  const item = subscription?.items?.data?.[0]
  const start = item?.current_period_start ?? subscription?.current_period_start
  const end = item?.current_period_end ?? subscription?.current_period_end
  return {
    start: start ? new Date(start * 1000) : new Date(),
    end: end ? new Date(end * 1000) : new Date(Date.now() + 30 * 86_400_000),
  }
}

function mapStripeStatus(status: string): "active" | "past_due" | "canceled" | "expired" {
  switch (status) {
    case "active":
    case "trialing":
      return "active"
    case "past_due":
    case "unpaid":
      return "past_due"
    case "canceled":
      return "canceled"
    default:
      return "expired"
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 })
  }

  const payload = await req.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { error: eventError } = await db
    .from("billing_webhook_events")
    .insert({ provider: "stripe", event_id: event.id, event_type: event.type })
  if (eventError?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (eventError) {
    console.error("[stripe/webhook] could not record event", eventError.message)
    return NextResponse.json({ error: "Unable to record webhook" }, { status: 503 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as any
        const userId = session.metadata?.user_id as string | undefined
        if (!userId) break

        await db
          .from("subscription_payments")
          .update({
            status: "active",
            provider: "stripe",
            stripe_payment_intent_id:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
            completed_at: new Date().toISOString(),
            result_desc: "Stripe checkout completed",
          })
          .eq("stripe_session_id", session.id)
          .eq("user_id", userId)

        let period = { start: new Date(), end: new Date(Date.now() + 30 * 86_400_000) }
        let stripeSubscriptionId: string | null =
          typeof session.subscription === "string" ? session.subscription : null
        if (stripeSubscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId)
          period = periodFromSubscription(subscription)
          await db.from("subscription_payments").update({
            invoice_no: `PD-${new Date().toISOString().slice(0, 7).replace("-", "")}-${session.id.slice(-8).toUpperCase()}`,
            period_start: period.start.toISOString(),
            period_end: period.end.toISOString(),
            kind: "initial",
          }).eq("stripe_session_id", session.id).eq("user_id", userId)
        }

        await db.from("subscriptions").upsert(
          {
            user_id: userId,
            plan_code: "pro",
            status: "active",
            current_period_start: period.start.toISOString(),
            current_period_end: period.end.toISOString(),
            grace_ends_at: null,
            trial_ends_at: null,
            renewal_attempts: 0,
            auto_renew: true,
            provider: "stripe",
            last_payment_method: "stripe",
            stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
            stripe_subscription_id: stripeSubscriptionId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )

        await db.from("subscription_events").insert({
          user_id: userId,
          event: "payment_succeeded",
          to_plan: "pro",
          to_status: "active",
          reason: "stripe checkout completed",
          actor: "system",
          metadata: { session_id: session.id },
        })

        await db.from("notifications").insert({
          user_id: userId,
          type: "billing_payment_succeeded",
          title: "Subscription active",
          message: "Your card payment was confirmed. The workspace is active.",
          severity: "success",
          link: "/dashboard/billing",
        })
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as any
        const stripeSubscriptionId: string | null =
          typeof invoice.subscription === "string" ? invoice.subscription : null
        if (!stripeSubscriptionId) break

        const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId)
        const period = periodFromSubscription(subscription)
        const { data: row } = await db
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", stripeSubscriptionId)
          .maybeSingle()
        const userId = row?.user_id || (invoice.metadata?.user_id as string | undefined)
        if (!userId) break

        await db.from("subscriptions").update({
          status: "active",
          current_period_start: period.start.toISOString(),
          current_period_end: period.end.toISOString(),
          grace_ends_at: null,
          renewal_attempts: 0,
          canceled_at: null,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId)

        // Keep a receipt row for the renewal charge, keyed to the invoice.
        const invoiceNo = invoice.number || `STRIPE-${invoice.id}`
        const { data: existing } = await db
          .from("subscription_payments")
          .select("id")
          .eq("invoice_no", invoiceNo)
          .maybeSingle()
        if (!existing) {
          await db.from("subscription_payments").insert({
            user_id: userId,
            plan_code: "pro",
            amount: Math.round(Number(invoice.amount_paid || invoice.amount_due || 2490) / 100),
            phone: "stripe",
            status: "active",
            provider: "stripe",
            kind: "renewal",
            invoice_no: invoiceNo,
            stripe_payment_intent_id:
              typeof invoice.payment_intent === "string" ? invoice.payment_intent : null,
            result_desc: "Stripe renewal",
            period_start: period.start.toISOString(),
            period_end: period.end.toISOString(),
            completed_at: new Date().toISOString(),
          })
        }

        await db.from("subscription_events").insert({
          user_id: userId,
          event: "payment_succeeded",
          to_plan: "pro",
          to_status: "active",
          days_granted: 30,
          reason: "stripe renewal",
          actor: "system",
          metadata: { invoice: invoiceNo },
        })
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any
        const stripeSubscriptionId: string | null =
          typeof invoice.subscription === "string" ? invoice.subscription : null
        if (!stripeSubscriptionId) break
        const { data: row } = await db
          .from("subscriptions")
          .select("user_id, current_period_end")
          .eq("stripe_subscription_id", stripeSubscriptionId)
          .maybeSingle()
        if (!row?.user_id) break

        const graceEnd = row.current_period_end
          ? new Date(new Date(row.current_period_end).getTime() + 3 * 86_400_000)
          : new Date(Date.now() + 3 * 86_400_000)

        await db.from("subscriptions").update({
          status: "past_due",
          grace_ends_at: graceEnd.toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", row.user_id)

        await db.from("subscription_events").insert({
          user_id: row.user_id,
          event: "payment_failed",
          from_status: "active",
          to_status: "past_due",
          reason: "stripe invoice failed",
          actor: "system",
        })
        await db.from("notifications").insert({
          user_id: row.user_id,
          type: "billing_payment_failed",
          title: "Card payment failed",
          message: `We could not charge your card. Update it within 3 days to keep access.`,
          severity: "critical",
          link: "/dashboard/billing",
        })
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any
        const period = periodFromSubscription(subscription)
        const status = mapStripeStatus(subscription.status)
        await db.from("subscriptions").update({
          status,
          current_period_end: period.end.toISOString(),
          cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
          auto_renew: !subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscription.id)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any
        await db.from("subscriptions").update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          cancel_at: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : new Date().toISOString(),
          auto_renew: false,
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscription.id)
        break
      }

      default:
        break
    }
  } catch (error) {
    console.error("[stripe/webhook] handler failed", event.type, error)
    // Do not acknowledge: Stripe will retry. The event row is already stored,
    // so remove it to allow the retry to be processed.
    await db.from("billing_webhook_events").delete().eq("provider", "stripe").eq("event_id", event.id)
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
