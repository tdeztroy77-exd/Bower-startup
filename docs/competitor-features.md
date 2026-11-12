# The five features: how the market does it, and what we built

This file is the working note behind the e-signature, owner statement,
accounting export, late fee and SMS features. It records the pattern each
mature product uses, and the specific choice made here.

## 1. E-signature on the lease

**How the category does it.** Buildium, AppFolio and RentRedi all treat signing
as a state machine on a document: prepared → sent → viewed → signed, with an
audit trail per recipient and a signed copy stored against the tenancy. The
signature itself is usually a typed name plus consent (a "simple electronic
signature" under e-signature laws), backed by timestamp, IP and user agent.
Certificate-authority signing is rare in small-landlord software.

**What we built.** A signing request points at a generated template plus its
fields. The link is random, hashed at rest and expires in 14 days. Signing
renders the same `.docx`, appends a certificate page (signer, time, IP, device,
original document SHA-256), hashes the signed result and stores it with the
request. The landlord sees the link once and the tenant sees a mobile signing
page. Every view and the signature are recorded in `esign_events`.

**Deliberate limit.** It is a simple electronic signature, not a PKI
certificate. The page says so, and the certificate page says so.

## 2. Owner statements as PDF

**How the category does it.** Property management products produce a monthly
owner statement: income collected, expenses paid, net distribution, occupancy,
arrears, and the line items behind each total. It is downloadable, dated and
generated from the same ledger as the dashboard.

**What we built.** `GET /api/reports/owner-statement?month=YYYY-MM` aggregates
the month, adds portfolio occupancy and total arrears, and renders an A4 PDF
with pdf-lib: header, three summary figures, a payments table, an expenses
table and a footer on every page. The reports screen links to the current
month; the endpoint accepts a property filter.

## 3. Accounting export

**How the category does it.** Xero and QuickBooks both import a journal CSV.
The reliable pattern is double-entry rows: rent received debits a money account
and credits rent income; an expense debits its category and credits the money
account. Accountants remap codes to their chart.

**What we built.** `buildJournalRows` produces balanced journals with explicit
account codes (1000 cash, 1010 M-Pesa clearing, 4000 rent income, 4100 late fee
income, 5100–6900 expense categories, 1100 rent receivable). Three renderers:
Xero manual journal, QuickBooks journal and a generic double-entry CSV. The
Settings → Data tab has a date range and format picker. Every journal is
asserted to balance in tests.

## 4. Automated late fees

**How the category does it.** Late fees are a policy, not a hard-coded rule:
grace days, flat or percentage, capped, applied once per invoice, with a note
on the invoice and a notification. The good products default it off and warn
that the tenancy agreement must allow the fee.

**What we built.** A per-landlord policy (`late_fee_policies`), one charge per
invoice (`late_fee_charges.payment_id` unique), a capped calculator, manual
"apply now" and a daily cron. Charged fees are written onto the invoice and
flow into the tenant portal balance and the journal export. The UI states the
legal caution rather than hiding it.

**Deliberate limit.** No compounding and no daily escalation. Kenyan tribunals
have struck down punitive late-fee terms.

## 5. SMS reminders for tenants without email

**How the category does it.** Landlord tools use a local gateway (Africa's
Talking in Kenya, Twilio elsewhere) with a per-message log and a daily reminder
job. The failure mode to avoid is reporting "sent" when the gateway rejected
the message or was never configured.

**What we built.** Africa's Talking integration with a hard rule: without
credentials, messages are recorded as `skipped` and the API returns 503. The
log shows sent/failed/skipped with the provider reference. Settings control
whether reminders run and how many days before rent is due; the daily cron
targets active tenants with a phone and **no email**, one message per tenant per
20 hours. A tenant page card sends a manual reminder and shows the log.

## What still is not here

- Signature fields placed on a specific page (we append a certificate page).
- Sending a countersigned copy by email (the signed file is downloadable).
- Provider webhooks for SMS delivery receipts (we store gateway acceptance).
- Per-property late-fee policies (one policy per workspace).
- Accounting sync (export only; no OAuth connection to Xero/QuickBooks).
