# Feature plan — signature, statements, accounting, late fees, SMS

Status as of this build. "Done" means the route, the storage, the UI and a test
exist — not that it has been used against a live provider.

## Phase 1 — shipped in this build

| Feature | Storage | Routes | UI | Test |
| --- | --- | --- | --- | --- |
| E-signature | `esign_requests`, `esign_events` (23) | create/list/void, public sign, signed download | tenant Documents → Send for signature; public `/sign/[token]`; tenant Signatures panel with status, signed copy, withdraw | certificate appended to a real docx, hash + audit fields present |
| Owner statement PDF | none (derived) | `GET /api/reports/owner-statement` | Reports → month picker + PDF | PDF header + aggregation |
| Accounting export | none (derived) | `GET /api/export/accounting` | Settings → Data → format + date range | journals balance, codes map, 3 formats |
| Late fees | `late_fee_policies`, `late_fee_charges` (24) | policy GET/PATCH, apply now, daily cron | Finances → Late fees; columns in finance and tenant tables; appears in portal balance and journals | grace, flat, percent, cap, zero guards |
| SMS reminders | `sms_settings`, `sms_messages` (25) | settings GET/PATCH, send, history, daily cron | tenant SMS card; Settings → Notifications | copy, phone normalisation, refuses to fake a send |

## Phase 2 — next, in order

1. **Countersigned copy by email.** Send the signed `.docx` to both parties and
   record delivery against the request. Needs the email provider already used by
   auth; no new infrastructure.
2. **Signature status on the tenant list.** A column showing "unsigned / viewed /
   signed" so a landlord can chase without opening each tenant.
3. **SMS delivery receipts.** Africa's Talking delivery webhook → update
   `sms_messages.status` from `sent` to `delivered`/`failed`. Requires a public
   callback route and the provider's delivery URL configured.
4. **Accounting connections.** OAuth to Xero/QuickBooks instead of CSV only.
   Larger: token storage, mapping, reconciliation of edited journals.
5. **Per-property late-fee policy.** Today it is one policy per workspace.
   Property-level override is a column and a join away.
6. **Owner statement per property.** The endpoint already accepts
   `property_id`; add a property-detail action and a property column on the
   statement when the whole portfolio is selected.

## Rollout order

1. Apply migrations 23, 24, 25.
2. Set `SUPABASE_SERVICE_ROLE_KEY` (signing, late fees, SMS log).
3. Set `CRON_SECRET`, deploy the three cron entries in `vercel.json`.
4. Set `AFRICASTALKING_USERNAME` / `AFRICASTALKING_API_KEY` / `SMS_SENDER_ID`
   for SMS.
5. Smoke test: sign a receipt (not a lease) first; generate a statement; export
   a one-month journal; enable late fees on a test invoice; send one SMS to your
   own phone.

## Acceptance criteria

- A tenant can open a signing link on a phone, sign, and download a docx whose
  last page carries their name, the time, the IP and the original hash.
- A statement PDF for a month with no activity still renders (empty sections,
  not an error).
- Every journal row set balances to zero.
- Running the late-fee cron twice in a day applies each fee once.
- With SMS credentials removed, the UI says "not configured" and the log shows
  `skipped` — never `sent`.
