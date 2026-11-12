import { Button } from "@/components/ui/button"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Check, CreditCard, LifeBuoy, Sparkles, TriangleAlert } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PLANS, TRIAL_DAYS, formatPrice } from "@/lib/pricing"
import { SubscriptionControls } from "@/components/subscription-controls"
import { BillingControls } from "@/components/billing-controls"
import { BillingReadiness } from "@/components/billing-readiness"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { BRAND } from "@/lib/brand"
import { describeEntitlement, evaluateEntitlement, type SubscriptionRow } from "@/lib/billing/period"

export const dynamic = "force-dynamic"

type StatusShape = {
  is_active?: boolean
  is_trialing?: boolean
  trial_expired?: boolean
  is_past_due?: boolean
  in_grace?: boolean
  days_left?: number
  plan?: string | null
  plan_name?: string | null
  price_kes?: number | null
  reason?: string
  trial_ends_at?: string | null
  period_start?: string | null
  period_end?: string | null
  grace_ends_at?: string | null
  auto_renew?: boolean | null
  payment_method?: string | null
  payment_phone?: string | null
  renewal_attempts?: number | null
}

async function getSubscriptionState() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  let status: StatusShape | null = null
  try {
    const { data } = await supabase.rpc("subscription_status" as any, { p_user: user.id } as any)
    status = (Array.isArray(data) ? data[0] : data) as StatusShape | null
  } catch {
    /* RPC not installed on this deployment */
  }

  if (!status) {
    const { data } = await supabase
      .from("subscriptions")
      .select("*, plans(name, price_kes)")
      .eq("user_id", user.id)
      .maybeSingle()
    if (data) {
      const trialExpired =
        data.status === "trialing" && data.trial_ends_at && new Date(data.trial_ends_at) <= new Date()
      status = {
        is_active: !trialExpired && !["canceled", "expired"].includes(data.status),
        is_trialing: data.status === "trialing" && !trialExpired,
        trial_expired: trialExpired,
        is_past_due: data.status === "past_due",
        days_left: data.current_period_end
          ? Math.max(0, Math.ceil((new Date(data.current_period_end).getTime() - Date.now()) / 86400000))
          : 0,
        plan: data.plan_code,
        plan_name: (data as any).plans?.name || data.plan_code,
        price_kes: (data as any).plans?.price_kes || null,
        reason: trialExpired ? "trial_ended" : data.status,
        trial_ends_at: data.trial_ends_at,
        period_start: data.current_period_start,
        period_end: data.current_period_end,
        grace_ends_at: data.grace_ends_at,
        auto_renew: data.auto_renew,
        payment_method: data.last_payment_method,
        payment_phone: data.payment_phone,
        renewal_attempts: data.renewal_attempts,
      }
    }
  }

  return { user, status }
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; payment?: string }>
}) {
  const { reason, payment } = await searchParams
  const { user, status } = await getSubscriptionState()
  const supabase = await createClient()
  const { data: paymentHistory } = await supabase
    .from("subscription_payments")
    .select("id, plan_code, amount, phone, status, result_desc, mpesa_receipt, invoice_no, kind, provider, created_at, completed_at, period_start, period_end")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  const plan = PLANS[0]
  const row: SubscriptionRow | null = status
    ? {
        status: status.is_trialing
          ? "trialing"
          : status.is_past_due
            ? "past_due"
            : status.reason === "canceled"
              ? "canceled"
              : status.reason === "expired" || status.reason === "trial_ended"
                ? "expired"
                : "active",
        trial_ends_at: status.trial_ends_at,
        current_period_end: status.period_end,
        grace_ends_at: status.grace_ends_at,
        auto_renew: status.auto_renew,
        last_payment_method: status.payment_method,
        payment_phone: status.payment_phone,
        renewal_attempts: status.renewal_attempts,
      }
    : null

  const entitlement = evaluateEntitlement(row)
  const isTrialing = Boolean(status?.is_trialing)
  const isActive = Boolean(status?.is_active)
  const isPastDue = Boolean(status?.is_past_due)
  const canRenewWithMpesa = Boolean(status?.payment_phone)
  const nextCharge = status?.period_end || status?.trial_ends_at
  const nextChargeAmount = status?.price_kes || plan.price
  const checkoutHref = `/dashboard/billing/checkout?plan=${plan.code}${
    status?.payment_phone ? `&phone=${encodeURIComponent(status.payment_phone)}` : ""
  }`

  const stateLabel = isTrialing && isActive
    ? "trialing"
    : isPastDue
      ? "past_due"
      : entitlement.reason === "canceled"
        ? "canceled"
        : isActive
          ? "active"
          : "paused"

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing & renewal"
        eyebrow="Account"
        description="Plan, renewal date, payment method and every receipt — in one place."
        actions={
          isActive ? (
            <Button asChild size="sm" className="rounded-lg">
              <Link href={checkoutHref}>Renew now</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="rounded-lg">
              <Link href={checkoutHref}>Choose plan</Link>
            </Button>
          )
        }
      />

      {payment === "success" ? (
        <div className="rounded-2xl border border-success/20 bg-success/[0.06] px-4 py-3 text-[13px] text-success">
          Payment confirmed. Your plan and receipt are updated below.
        </div>
      ) : null}

      {!isActive && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.05] px-4 py-3">
          <TriangleAlert className="size-4 shrink-0 text-destructive" />
          <p className="min-w-0 flex-1 text-[13px] text-foreground">
            <span className="font-semibold">{entitlement.reason === "trial_ended" ? "Your trial has ended." : "Access is paused."}</span>{" "}
            <span className="text-muted-foreground">
              {entitlement.reason === "past_due"
                ? "The grace period has ended. Renew to restore the workspace."
                : reason === "trial_ended"
                  ? `Choose a plan to keep your records and settings.`
                  : "Choose a plan to continue."}
            </span>
          </p>
          <Button asChild size="sm" className="rounded-lg">
            <Link href={checkoutHref}>Renew</Link>
          </Button>
        </div>
      )}

      {isActive && (isTrialing || isPastDue) ? (
        <div
          className={
            isPastDue
              ? "flex flex-wrap items-center gap-3 rounded-2xl border border-warning/25 bg-warning/[0.06] px-4 py-3"
              : "flex flex-wrap items-center gap-3 rounded-2xl border border-primary/15 bg-secondary/70 px-4 py-3"
          }
        >
          <Sparkles className={isPastDue ? "size-4 shrink-0 text-warning" : "size-4 shrink-0 text-primary"} />
          <p className="min-w-0 flex-1 text-[13px] text-foreground">{describeEntitlement(entitlement)}</p>
          <Button asChild size="sm" variant={isPastDue ? "default" : "outline"} className="rounded-lg">
            <Link href={checkoutHref}>{isPastDue ? "Pay now" : "Add payment"}</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Plan status"
          description={isActive ? "Access is live" : "Access paused"}
          action={
            <StatusPill tone={stateLabel === "active" ? "success" : stateLabel === "trialing" ? "brand" : stateLabel === "past_due" ? "warning" : "danger"} dot>
              {stateLabel.replace("_", " ")}
            </StatusPill>
          }
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-[24px] font-semibold leading-none tracking-[-0.03em] text-foreground">
                {status?.plan_name || plan.name}
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">
                {formatPrice(nextChargeAmount)} / month
              </p>
              <dl className="mt-4 space-y-2 text-[12.5px]">
                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2">
                  <dt className="text-muted-foreground">{isTrialing ? "Trial ends" : "Next charge"}</dt>
                  <dd className="font-medium text-foreground">
                    {nextCharge
                      ? new Date(nextCharge).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2">
                  <dt className="text-muted-foreground">Payment method</dt>
                  <dd className="font-medium capitalize text-foreground">
                    {status?.payment_method === "stripe"
                      ? "Card (Stripe)"
                      : status?.payment_method
                        ? "M-Pesa"
                        : "None on file"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2">
                  <dt className="text-muted-foreground">Account</dt>
                  <dd className="max-w-[60%] truncate text-right font-medium text-foreground">{user.email}</dd>
                </div>
              </dl>
              {status?.renewal_attempts && status.renewal_attempts > 0 ? (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {status.renewal_attempts} renewal prompt{status.renewal_attempts === 1 ? "" : "s"} sent.
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-border/70 bg-background p-3.5">
              <BillingControls
                autoRenew={Boolean(status?.auto_renew ?? true)}
                paymentPhone={status?.payment_phone || null}
                canRenewWithMpesa={canRenewWithMpesa}
                checkoutHref={checkoutHref}
              />
            </div>
          </div>

          {isActive && !isTrialing ? (
            <div className="mt-4 border-t border-border/70 pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Cancellation
              </p>
              <SubscriptionControls canceled={entitlement.reason === "canceled"} />
            </div>
          ) : null}
        </Panel>

        <div className="space-y-4">
          <Panel title="Payment rails" description="Live readiness, no secrets shown">
            <BillingReadiness />
          </Panel>
          <Panel title="Billing help" description="A real person answers">
            <div className="flex items-start gap-2.5">
              <LifeBuoy className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="text-[12px] leading-6 text-muted-foreground">
                <p>Invoice, refund or procurement question?</p>
                <a href={`mailto:${BRAND.supportEmail}`} className="mt-1 block font-medium text-foreground hover:text-primary">
                  {BRAND.supportEmail}
                </a>
                <a href={BRAND.supportPhoneHref} className="block font-medium text-foreground hover:text-primary">
                  {BRAND.supportPhone}
                </a>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        title="Your plan"
        description={`${TRIAL_DAYS}-day trial, then one flat monthly price`}
        action={
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10.5px] font-semibold text-secondary-foreground">
            Everything included
          </span>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-[30px] font-semibold leading-none tracking-[-0.04em] tabular text-foreground">
              {formatPrice(plan.price)}
              <span className="ml-1.5 text-[12.5px] font-medium tracking-normal text-muted-foreground">/ month</span>
            </p>
            <p className="mt-2 max-w-md text-[12.5px] leading-5 text-muted-foreground">{plan.tagline}</p>
          </div>
          <Button asChild className="rounded-lg">
            <Link href={checkoutHref}>
              <Sparkles /> {isActive ? "Renew subscription" : "Start subscription"}
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-x-6 gap-y-2 border-t border-border/70 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          {plan.features.map((feature) => (
            <p key={feature} className="flex items-start gap-2 text-[12.5px] leading-5 text-muted-foreground">
              <Check className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={2.6} />
              {feature}
            </p>
          ))}
        </div>
      </Panel>

      <Panel title="Payment history" description="Every charge, renewal and receipt" bodyClassName="p-0">
        {paymentHistory?.length ? (
          <div className="overflow-x-auto">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Invoice / receipt</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th>Period</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((item: any) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap text-[12.5px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="text-[12px] capitalize text-muted-foreground">{item.kind || "initial"}</td>
                    <td className="font-mono text-[11px] text-muted-foreground">
                      {item.invoice_no || item.mpesa_receipt || "—"}
                    </td>
                    <td className="text-right text-[12.5px] font-semibold tabular text-foreground">
                      {formatPrice(Number(item.amount || 0))}
                    </td>
                    <td>
                      <StatusPill
                        tone={["active", "subscribed"].includes(item.status) ? "success" : item.status === "failed" ? "danger" : "warning"}
                        dot
                      >
                        {item.status}
                      </StatusPill>
                    </td>
                    <td className="whitespace-nowrap text-[11.5px] text-muted-foreground">
                      {item.period_start && item.period_end
                        ? `${new Date(item.period_start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} → ${new Date(item.period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyBlock
            icon={CreditCard}
            title="No payments yet"
            description="Receipts appear here as soon as the first payment is made."
          />
        )}
      </Panel>
    </div>
  )
}
