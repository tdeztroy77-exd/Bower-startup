# M-Pesa production checklist (Daraja)

Bower runs against **Daraja production** by default. The sandbox is only
selected when `MPESA_ENV` is exactly `sandbox`; a missing or misspelt value is
treated as production and the request fails loudly rather than silently using
fake money. Mock responses are only honoured when `NODE_ENV` is `development`
or `test`, and a mocked result can never activate a paid plan.

## 1. Safaricom Daraja setup

1. Create an app on the [Daraja portal](https://developer.safaricom.co.ke) and
   request **production** access for:
   - Lipa na M-Pesa Online (STK Push)
   - Customer to Business (C2B) — only needed if tenants pay your paybill
2. Copy the production consumer key and consumer secret.
3. Confirm your shortcode **type**:
   - PayBill number → `MPESA_SHORTCODE_TYPE="paybill"`
   - Till / Buy Goods number → `MPESA_SHORTCODE_TYPE="till"`
4. Copy the production passkey for that shortcode.

## 2. Environment

```env
MPESA_ENV="production"
MPESA_CONSUMER_KEY="..."
MPESA_CONSUMER_SECRET="..."
MPESA_SHORTCODE="174379"            # your paybill / till number
MPESA_SHORTCODE_TYPE="paybill"      # or "till"
MPESA_PASSKEY="..."
MPESA_CALLBACK_URL="https://app.bower.africa/api/mpesa/callback"
MPESA_CALLBACK_SECRET="..."         # long random string, also sent to Safaricom
MPESA_ALLOWED_CALLBACK_IPS="196.201.214.200,196.201.214.206,196.201.213.114"
MPESA_ADMIN_EMAILS="you@bower.africa"
```

Rules enforced by the code:

- `MPESA_CALLBACK_URL` must be **HTTPS** and must not point at localhost in
  production; otherwise `darajaConfigured()` returns false and checkout shows
  "mobile payment unavailable".
- Callbacks are rejected when `MPESA_CALLBACK_SECRET` is unset.
- C2B validation/confirmation fail closed when `MPESA_ALLOWED_CALLBACK_IPS` is
  empty.

## 3. Register the callback URLs

With `MPESA_ADMIN_EMAILS` set and signed in as one of those addresses, call
`POST /api/mpesa/c2b/register` once per environment. It registers the
validation and confirmation URLs with Safaricom.

## 4. Go-live verification

1. Open **Billing → Renewal readiness** in the dashboard. It calls
   `/api/mpesa/readiness` and lists configuration issues without revealing
   secrets.
2. Buy the plan yourself with **KES 1** on a sandbox build first if you can;
   in production, do a full-price test with a real number and refund it.
3. Confirm all four things:
   - the STK prompt arrives on the phone
   - the callback lands (`/api/mpesa/callback` returns 200)
   - the payment appears in **Billing → Payment history** with a receipt
   - the period end moves forward by one month
4. Close the checkout tab immediately after paying and confirm the
   subscription still activates (the callback, not the browser poll, is the
   source of truth).

## 5. Renewals

M-Pesa has no recurring mandate. Renewal is honest automation:

- `POST /api/cron/billing` runs daily (see `vercel.json`).
- Two days before the period ends it sends an STK prompt to the saved number.
- It retries once a day, up to three attempts.
- If the payment does not land, the plan moves to `past_due` with a 3-day
  grace period, then access pauses.
- Stripe subscribers are renewed by Stripe itself; the webhook applies the
  result and records a receipt.

Point the cron at a scheduler that sends
`Authorization: Bearer $BILLING_CRON_SECRET` (or `CRON_SECRET`). Vercel Cron
does this automatically when the environment variable exists.

## 6. What NOT to do

- Do not set `MPESA_SANDBOX_MOCK=1` in production. It is ignored and reported
  as a configuration issue.
- Do not put card data or M-Pesa PINs anywhere in this app. The PIN is entered
  on the customer's phone; cards are handled by Stripe Checkout.
- Do not reuse a checkout request id. The renewal job retires prompts older
  than five minutes and issues a fresh one.
