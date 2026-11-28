# Email setup — Resend

Bower sends **two different kinds of email**, through **two different
systems**. Confusing them is the most common way to get this wrong.

| Email | Sent by | Why |
|---|---|---|
| Sign-up confirmation, password reset, magic link | **Supabase Auth** (its SMTP) | These are account emails. Supabase owns the account and the session. |
| Company invitation | **Resend** | The link carries a hashed, single-use, expiring company token. Supabase's templates cannot carry it. |

---

## What is done

- The transport is written: `lib/email/send.ts` (Resend over plain
  `fetch`, no SDK) and `lib/email/templates.ts` (the branded HTML).
- `lib/email/invite.ts` calls both, and never throws — a failed email
  must not roll back the invitation that was just created.
- **If the message does not go out, the invitation is never lost.** The
  acceptance link is written to the server log, so an admin can send it
  by hand. This holds whether the transport is missing entirely, the
  sender domain is unverified, or the provider is down.
- The raw token is never stored in the database, never returned by an
  API, and never logged except in that one server-side fallback.
- `scripts/email-test.ts` sends the real invitation template through
  the real transport, so "the email works" can be checked rather than
  assumed.

---

## What a human still has to do

### 1. Verify `bower.africa` in Resend

The domain is **already registered** in the Resend account, but it is
`not_started` — it needs four DNS records at whoever hosts
`bower.africa` (the registrar). Add these:

| Type | Name | Value | Priority |
|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDC+GHttc9qlBjEnx5rIiKvpqDI9GHd1a+RsY+RhCmVMTXq2y27nsm27o5H+O23QbSjope6ZDd403o6DC2Z5vGsOFlBC5XmnimxPZL51RpKgjoi4Tqk2l8nYDCe6kl3OhAkEV4jG3WjPVxfeOWATfbh424vtdJ+XtPl12OfBqUnFQIDAQAB` | — |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| CNAME | `rsend` | `send.forge.rmta.net` | — |

Until they are added, Resend refuses to send from `bower.africa`:

```
403 {"message":"The bower.africa domain is not verified."}
```

Resend checks the records itself — after adding them, open the domain
in the Resend dashboard and it will go green, usually within a few
minutes.

### 2. Set the environment variables

On the deployment (Vercel), set:

```
RESEND_API_KEY=<the resend api key>
EMAIL_FROM=Bower <no-reply@bower.africa>
```

Locally, they belong in `.env.local` — which `.gitignore` already
covers (`.env*`, except `.env.example`). **Never put the real key in
`.env.example`**: that file is tracked.

### 3. Move Supabase's own SMTP to a custom provider

Unrelated to Resend, but it caps the product. On the default relay
Supabase sends roughly **2 emails an hour**, and only from project-team
addresses. With a custom SMTP provider configured it starts at about
**30 an hour**.

Supabase dashboard → Authentication → Emails → SMTP Settings.

---

## Checking that it works

```bash
npm run email:test -- you@yourdomain.com
```

That sends the real branded invitation through the real transport and
prints what the provider said. A working send looks like:

```json
{
  "to": "you@yourdomain.com",
  "ok": true,
  "delivered": true,
  "id": "01a2…"
}
```

---

## Sending from a domain that is not verified

While `bower.africa` is still pending, the account's verified domain
can be used instead:

```bash
EMAIL_FROM="Bower <no-reply@nomadsridgesafari.com>" npm run email:test -- you@yourdomain.com
```

That is a temporary measure for checking the pipeline — the invitation
email should carry Bower's own domain before it goes to a customer.
