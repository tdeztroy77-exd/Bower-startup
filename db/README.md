# Database guide

Bower stores its data in Postgres. Authentication and file storage are
handled by Supabase; the application tables live in Postgres (Neon in the current
deployment). There are two provisioning paths, and they are **not**
interchangeable — pick one per environment.

## 1. Supabase SQL editor path (canonical for a Supabase-hosted install)

Run the files in `supabase-setup/` **in filename order** in the Supabase SQL
editor. Each file is written to be idempotent (`create table if not exists`,
`drop policy if exists` + `create policy`, etc.), so re-running a file is safe.

| File | Purpose |
| --- | --- |
| `00-signup-bootstrap.sql` | Creates the profile row when a user signs up. |
| `01-create-tables.sql` | Core tables, indexes, RLS policies and the private storage bucket. |
| `02-add-missing-columns.sql` | Additive repair for databases created before later columns existed. |
| `03-notifications.sql` | In-app notification table and triggers. |
| `04-property-photos.sql` | Property photo table and storage policy. |
| `05-recurring-expenses.sql` | Recurring expense templates and generated rows. |
| `06-document-expiry.sql` | Document expiry columns and reminder scan. |
| `07-maintenance-reminders.sql` | Maintenance reminder scan. |
| `08-tenant-portal.sql` | Historical tenant portal tables (superseded by tenant records). |
| `09-mpesa.sql` | M-Pesa STK push transaction log. |
| `10-operations-module.sql` | Paybills, C2B, quotations, damages, companies, reconciliation. |
| `11-backup-patch.sql` | Backup, restore and patch bookkeeping tables. |
| `12-auto-backup.sql` | Scheduled backup preference + prune function. |
| `13-paybill-counters.sql` | Atomic paybill counters. |
| `14-subscriptions.sql` | Plans, subscriptions, trial state. |
| `15-subscription-payments.sql` | Per-user subscription STK intents. |
| `15-repair-live-schema.sql` | Repairs columns missing on early deployments. |
| `16-payment-hardening.sql` | Idempotency keys, callback fields, Stripe checkout. |
| `16-plans-single-price.sql` | Seeds the single Pro plan at KES 2,490. |
| `16-payment-reconciliation-hardening.sql` | Reconciliation constraints and audit fields. |
| `17-subscription-lifecycle-hardening.sql` | Cancel / expire / reactivate state machine. |
| `18-billing-idempotency.sql` | One payment per checkout attempt. |
| `19-paybill-property-linkage.sql` | Paybill ↔ property ownership link. |
| `20-settings-and-backup-repair.sql` | Settings and backup column repair. |
| `21-billing-lifecycle.sql` | Grace periods, renewal queue, idempotent grant, subscription write lock-down. |
| `22-tenant-portal.sql` | Hashed, expiring tenant portal links (service-role only). |
| `23-esignature.sql` | Signing requests, audit events, signed document storage. |
| `24-late-fees.sql` | Late fee policy and one-per-invoice charges. |
| `25-sms-reminders.sql` | SMS reminder settings and delivery log. |

> **Numbering note.** Some numbers appear twice (`15-*`, `16-*`) because files
> were added after they were first applied. The numeric prefix is a reading aid,
> not a unique key — the **full filename** is the identity. Do not rename an
> already-applied file: the patch runner in `lib/system.ts` tracks it by name.
> If you add a file, give it the next unused number and register it in
> `PATCH_LOG`.

## 2. Neon runner path (canonical for the app's own Postgres)

```bash
npm run db:migrate
```

`lib/db/migrate.ts` reads `db/migrations/*.sql` in lexical order, splits each
file into statements (comment-aware, dollar-quote-aware), wraps each migration
in a transaction and records applied files in `_migrations`.

| File | Purpose |
| --- | --- |
| `db/migrations/001-core.sql` | Core application tables (app-side scoping, no auth FKs). |
| `db/migrations/002-support.sql` | Notifications, photos, expenses, M-Pesa, operations. |
| `db/migrations/004-marketing-forms.sql` | Public form submissions (contact, newsletter, leads). |
| `db/migrations/005-encryption.sql` | Encrypted columns + blind indexes for lookups. |

> `003` is intentionally unused: the numbering came from an older split and the
> gap is documented rather than filled, so existing `_migrations` rows keep
> matching their files.

## Security model

- **Application scoping.** Every user-owned table has a `user_id`. Every query in
  `app/api/**` and the server components filters on the signed-in user's id.
- **Row-level security.** On the Supabase path, RLS is enabled on every
  application table and policies scope rows to `auth.uid() = user_id`. On the
  Neon path, RLS is not relied on — application scoping is the control.
- **Private storage.** The `documents` bucket is **private**. Files are read
  through short-lived signed URLs; no permanent public URL is issued.
- **Sensitive fields.** Identity and contact fields listed in
  `lib/crypto/pii-columns.ts` are encrypted with the application key, with blind
  index columns for exact-match lookups. See
  `audit/design/encryption-design.md`.

## Adding a migration

1. Create the next numbered file in the path used by your environment.
2. Write it to be idempotent. Additive changes only where possible.
3. If it is a Supabase-path file, register it in `PATCH_LOG` (`lib/system.ts`)
   with a new `p_YYYY_MM_NNN` id and its exact filename.
4. Never edit an already-applied file to change behaviour — add a new patch.
5. Update `db/SCHEMA.md` if tables, columns or indexes changed.

## Backup and retention

- User-initiated backups are written to the `backups` table (payload inline under
  5 MB, otherwise to private storage) and are downloadable from the dashboard.
- `run_all_scans()` drives the lease, document, maintenance and recurring-expense
  reminder scans from `POST /api/cron/run`.
- Backups are pruned by `prune_old_backups()` according to each workspace's
  retention preference.

'## Billing lifecycle

- A paid period that ends moves to `past_due` with a 3-day grace, then `expired`.
- `grant_subscription_period(user, payment, days)` is the only path that extends access. It locks the payment row and refuses to apply a payment twice.
- M-Pesa renewals are prompts sent by `/api/cron/billing` (no recurring mandate exists in Daraja). Stripe renews itself and the webhook applies the result.
- `authenticated` has no INSERT/UPDATE on `subscriptions` or `subscription_payments`; cancel/reactivate go through SECURITY DEFINER functions.

## Known gaps (pre-launch)'

- Enum values written by the app and the SQL `CHECK` constraints should be
  cross-checked after any new status value is introduced; there is no automated
  test for that yet.
- `updated_at` triggers exist for the core tables but not every auxiliary table.
  Prefer setting `updated_at` explicitly in new code until that is audited.
- There is no migration test against a scratch database in CI.
