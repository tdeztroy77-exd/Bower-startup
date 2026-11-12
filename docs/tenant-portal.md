# Tenant portal

A tenant gets a private link to their own rent account — no account, password or
app install. The link is the authentication.

## What the tenant can do

- see the outstanding balance and their lease dates
- pay an unpaid invoice with an M-Pesa prompt (amount taken from the invoice on the server)
- raise a maintenance request that lands in the landlord's queue with a notification
- see their settled payment history and receipts

They cannot see other tenants, national IDs, landlord notes, uploaded documents
or any workspace settings.

## How the link works

1. Landlord opens a tenant record → **Tenant portal → Create portal link**.
2. Server generates 32 random bytes, returns `/portal/<token>` once, and stores
   only `sha256(token)` in `tenant_portal_tokens`.
3. The link expires after 30 days and can be revoked. Creating a new link
   revokes the previous one, so there is exactly one working link per tenant.
4. Every request re-hashes the token and checks `expires_at` / `revoked_at`.

The table has RLS enabled with **no policies** and `revoke all` from `anon` and
`authenticated`; only the service role can read or write it.

## Endpoints

| Route | Auth | Purpose |
| --- | --- | --- |
| `POST /api/tenants/[id]/portal-link` | session (owner) | Issue a link |
| `DELETE /api/tenants/[id]/portal-link` | session (owner) | Revoke links |
| `GET /api/portal/[token]` | token | Portal data |
| `POST /api/portal/[token]/pay` | token | Send an M-Pesa prompt for one invoice |
| `GET /api/portal/[token]/status?checkout=` | token | Poll that prompt |
| `POST /api/portal/[token]/maintenance` | token | Create a maintenance request |

`/api/portal/*` is allowed through the session middleware because the token is
the credential; each handler validates it and applies its own rate limit.

## Payment path

The portal never trusts an amount from the browser. It loads the invoice by id,
checks it belongs to the tenant behind the token, checks it is unpaid, and sends
that amount to Daraja. The normal callback (`/api/mpesa/callback`) settles the
invoice and the tenant sees it on refresh.

## Rate limits

- 60 reads/minute per IP
- 6 payment attempts / 10 minutes
- 5 maintenance requests / hour
- 120 status polls/minute

## Before going live

1. Apply `supabase-setup/22-tenant-portal.sql`.
2. Confirm `SUPABASE_SERVICE_ROLE_KEY` is set (the portal uses it server-side only).
3. Open a tenant, create a link, and test it on a phone: balance, pay, report a repair.
4. Revoke the link and confirm the page shows "not active".
