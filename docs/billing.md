# Billing architecture

One plan, two payment rails, one entitlement rule.

## What is real today

| Concern | M-Pesa | Stripe |
| --- | --- | --- |
| First payment | STK Push from checkout | Checkout session (`mode: subscription`) |
| Confirmation | Daraja callback **and** status poll | `checkout.session.completed` webhook |
| Renewal | Daily prompt job (`/api/cron/billing`) | Stripe charges, `invoice.paid` webhook applies it |
| Failure handling | 3-day grace, then pause | `invoice.payment_failed` → grace, then pause |
| Receipts | `subscription_payments` with M-Pesa receipt | `subscription_payments` with Stripe invoice number |

The trial is 14 days, created by `ensure_subscription()` on first dashboard
request. No card is required to start.

## Entitlement rule

`public.subscription_status(user)` is the only read model the app trusts. It
returns `is_active`, `days_left`, `reason`, grace state, renewal date and the
payment method. A user is allowed in when:

- `trialing` and the trial has not ended
- `active` and the paid period has not ended
- `past_due` and inside the grace window
- `canceled` but before `cancel_at`

Everything else redirects to billing. The dashboard middleware uses the same
function, so the UI and API cannot disagree.

## The only way access is extended

`public.grant_subscription_period(user_id, payment_id, days)`:

1. locks the payment row;
2. refuses to apply a payment that is already `active`/`subscribed`;
3. starts the new period at the later of now, the current period end, or the
   trial end (so paying early never burns days);
4. sets the subscription to `active`, clears grace and renewal attempts;
5. writes a `subscription_events` row.

Both the Daraja callback and the checkout poll call it, so closing the tab
after paying no longer loses the month. It is also safe to call twice.

## Renewals without a mandate

Daraja does not offer recurring debit. The honest equivalent:

- two days before `current_period_end`, the billing cron sends an STK prompt
  to the saved M-Pesa number;
- it retries once a day, up to three attempts;
- the account enters `past_due` with a 3-day grace if the prompt is not paid;
- after grace it becomes `expired` and the workspace pauses.

Auto-renew can be switched off from billing; then renewal is manual.

## Security

- `authenticated` has **no** INSERT/UPDATE on `subscriptions`,
  `subscription_payments` or `subscription_events`. A browser cannot grant
  itself a plan by editing a row.
- Cancel/reactivate run through SECURITY DEFINER functions that check
  `auth.uid()`.
- Stripe webhooks are signature-verified and deduplicated by event id.
- Daraja callbacks require the shared secret; the amount must match the plan
  price before a period is granted.
- Mock Daraja responses are refused by the entitlement path in every
  environment.

## Scheduling

`vercel.json` schedules:

- `/api/cron/run` daily at 03:00 UTC — lease, document, maintenance and
  recurring-expense scans
- `/api/cron/billing` daily at 06:00 UTC — state transitions, trial notices,
  M-Pesa renewal prompts, dunning

Both accept `Authorization: Bearer $CRON_SECRET` (billing also accepts
`BILLING_CRON_SECRET`). In production, an unset secret rejects the request.

## Before going live

1. Apply `supabase-setup/21-billing-lifecycle.sql` (or the Neon equivalent).
2. Set `MPESA_ENV=production` and follow `docs/mpesa-production.md`.
3. Configure the Stripe webhook to `/api/stripe/webhook` and set
   `STRIPE_WEBHOOK_SECRET`.
4. Set `CRON_SECRET` / `BILLING_CRON_SECRET` and confirm the scheduler runs.
5. Test one real M-Pesa payment, close the tab immediately, and confirm the
   plan activates from the callback.
6. Cancel and reactivate from billing to prove the RPC path works.
