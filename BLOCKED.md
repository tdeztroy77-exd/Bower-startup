# BLOCKED — Company workspace build

Things that are NOT done, that could NOT be finished inside this build,
or that need a human decision before the feature goes live.

Ordered by how much they block the team test.

---

## B1 — The migration has not been applied to any database

`supabase-setup/26-company-directory.sql` is written and reviewed but
**has not been run anywhere**. The build brief forbids `supabase db
push`, `supabase link`, `supabase db reset --linked` and any command
against a remote database, and this environment has no Supabase project
configured.

**Before any of this works**, the migration must be applied to staging:

```sql
-- run in the Supabase SQL editor, or via your normal migration runner
\i supabase-setup/26-company-directory.sql
```

It is idempotent — re-running it is safe.

**It must run before:** the team members profile columns, the
invitations table, presence, the calendar and the `company_id` column on
`notifications` all exist. Every route in this build will fail without
it, because the tables they read are not there yet.

**Check after applying:**

```sql
select company_role('<your-company-id>'::uuid, auth.uid());
-- should return 'admin' for the owner, your role for a member
```

---

## B2 — The invitation email now sends; the sender domain is not verified yet

**Update:** the transport is built and **proven**. `lib/email/send.ts`
posts to Resend over plain `fetch` (no SDK), `lib/email/templates.ts`
holds the branded HTML, and `lib/email/invite.ts` calls both. A real
invitation was sent and accepted by the provider during this build:

```json
{ "to": "…", "ok": true, "delivered": true, "id": "01a2…" }
```

The API still never returns the token — by design.

**What is left:** `bower.africa` is registered in Resend but its four
DNS records are not added yet, so sending from
`no-reply@bower.africa` is refused with a 403. The records are listed
in `docs/email-setup.md`. Until they are added, the invitation still
exists and can still be redeemed — the link falls back to the server log
rather than being lost.

**One thing to be careful of:** the fallback log line contains a
working invitation link. That is deliberate (an invitation must never
be lost) but it means a raw token can end up in a log aggregator. If
Bower adopts a log aggregator, redact that line.

---

## B3 — Realtime presence runs on a public channel

The presence channel is `company-presence-{companyId}` on the anon key,
which is Supabase's default for Realtime. A member who knows a company
id could subscribe to that channel and observe who is online in it.

**Why it is left this way for now:** locking it down properly means
private channels plus `realtime.messages` policies, and a mistake in
that policy breaks Realtime for the whole project. The data is
low-sensitivity (presence only), and the only presence path that carries
identity — the `company_presence` table — is protected by RLS, so a
member can only ever read their own company's last-seen rows.

**To close it:** add `realtime.messages` policies that check
`public.is_company_member(...)` against the topic's company id, then
switch the client to `supabase.channel(name, { config: { private: true } })`.

---

## B4 — No live end-to-end run was possible here

This environment has no Supabase project and no `.env`, so the new pages
were verified by type-checking, by the test suite and by reading the
code — not by clicking through a running app against a real database.

**What that leaves unproven:**

- the SQL migration executing cleanly against a live Postgres;
- Realtime presence actually syncing between two browsers;
- the Postgres change feed delivering notifications to the bell;
- the accept flow creating a real auth user through the admin API.

`docs/company-workspace.md` has the staging checklist for all four.

---

## B5 — Pre-existing TypeScript errors in the repository

`npx tsc --noEmit` fails on the repository as it was handed over. These
errors are **not** from this build — they are in files this build never
touched:

```
app/api/paybill/route.ts                     (6 × 'supabase' is possibly 'null')
app/api/paybill/test-payment/route.ts        (5 × the same + checkoutRequestId)
app/dashboard/contacts/page.tsx               (implicit any)
components/paybill-account-form.tsx           (implicit any)
lib/system.ts                                 (Expected 2-3 arguments, but got 1)
```

The production build is unaffected because `next.config.mjs` sets
`typescript.ignoreBuildErrors: true`. But a CI step that runs `tsc
--noEmit` directly will still fail, and it will look like this build's
fault. **This build adds zero new type errors** — verified by filtering
the compiler output to the files it touched.

**Recommendation:** fix the paybill and contacts errors in a separate
change, then turn `ignoreBuildErrors` back off so the build protects
itself again.

---

## B6 — `property_id` on a calendar event is not validated

The column has a foreign key to `properties`, so it cannot point at a
property that does not exist — but it is not checked against the
company's own portfolio, and the event UI does not offer a property
picker yet. A caller who knows a property id could attach another
company's property to their event.

**Impact is low** today: the property name is not resolved or displayed
(the event row shows the location instead), and attaching a property
grants no access to it.

**To close it:** validate `property_id` against the properties the
caller's company manages, and add the property picker to the event
dialog.

---

## B7 — The owner row cannot be edited

The company owner has no `team_members` row, so their directory entry is
synthesised. That means the owner cannot set their own department, job
title or phone number from the profile sheet — there is no row to
write.

**Why:** ownership is singular and lives on `companies.owner_id`
(architecture decision A1). Letting the owner edit a team_members row
that duplicates ownership would create two sources of truth for the same
person.

**If the owner wants a profile:** add `owner_id` (or a
`company_admins` table) with the same profile columns, and render the
owner from there.

---

## B8 — No company switcher yet

A user may belong to several companies — one `team_members` row per
company (A2), and `listCompanyContexts()` in `lib/company/auth.ts`
resolves all of them.

**Not built:** the UI to switch between them. Today
`requireCompanyMember` resolves the caller's own company first, then
their earliest active membership, and every route accepts an explicit
`companyId` for when the switcher exists.

**To build it:** a switcher in the dashboard header that writes the
selected company id into the URL (`/dashboard/company?company=<id>`) and
have the routes read it.

---

## Not blocking, but not done either

- **Private-channel Realtime** — see B3.
- **Google / Outlook calendar sync** — explicitly excluded by the brief.
- **Company profile settings** — writing the `companies` row stays
  owner-only; no settings screen was added.
- **Bulk member actions** — invite, edit and remove are one member at a
  time.
- **The global notification bell** still shows company notifications
  alongside personal ones. That is deliberate (see DECISIONS.md D1), but
  if it becomes noise, the fix is to filter `company_id is null` in
  `GET /api/notifications`.

---

# BLOCKED — Design and product upgrade (phase two)

---

## B9 — There is no motion or "hallmark" connector to build with

The request was to *"build stuff with plugins like motion and
hallmark"*. Neither exists here.

`mcode-tools connector tools` returns 17 media tools — image, video,
audio, music, document — and nothing for animation or motion design.
The repository has no animation library either: no Framer Motion, no
GSAP, no Lenis, and the brief's own rule was not to install packages
outside the allowed list.

**What was done instead:** the motion layer is native CSS —
`app/globals.css` now carries two easing curves, six named entrance
classes, and a global `prefers-reduced-motion` guard. See DECISIONS.md
D21.

**What this means:** if the intent was specifically Framer Motion's
physics or scroll-linked animation, that is not what shipped. The
needs the upgrade had — staggered rows, a blooming presence dot, a
notification that arrives, a colour field that drifts — are all
achievable in CSS at zero runtime cost. If a specific library is
required, that is a package decision for a human.

---

## B10 — Supabase's own SMTP still needs moving to a custom provider

Unrelated to the invitation email (which Resend sends), Supabase Auth
still sends the account emails: confirmation, recovery, and magic
link. On the default relay that is roughly **2 emails per hour**, and
it only sends from project-team addresses — Supabase's own terms say
the built-in service is not for production traffic.

Moving it to a custom SMTP provider (Resend, SES, Postmark, Brevo)
raises the limit to about **30 per hour**. That is an account-level
change in the Supabase dashboard — SMTP settings and verified sender
domain — not a code change, so it needs a human with dashboard access.

**Until it is done:** a user who signs up in a burst may wait hours for
a confirmation email, and no invitation can rescue them because the
invitation and the account confirmation are two different emails.

---

## B11 — The dark-mode switch now ships; the accent picker does not

**Update (third pass):** the in-app theme switch is **built** —
`components/dashboard/theme-toggle.tsx`, in the product's top bar, with
Light / Dark / System, backed by `next-themes` with `attribute="class"`
so there is no flash of the wrong theme on load. The dark theme was
re-tuned for a low-luminance canvas rather than inverted: true near-black
with a pine cast, not `#000000`; elevation layered by background
lightness; avatar tints as glows rather than solid fills.

**Still not built, on purpose:** accent customisation. The 2026
research calls it a baseline expectation, and it would have been cheap —
a `data-accent` attribute and three blocks of CSS. It was left out
because a product that lets you recolour itself looks like a template,
and the brief asked for a decided palette. The theme changes the canvas;
the brand does not change. If it is wanted later, it is a small,
contained change.

**Also still missing:** the marketing site has no theme control of its
own — it follows the system preference. That is the normal behaviour
for a public site and is not considered a gap.

---

## B12 — Avatars are stored raw, with no processing

Uploaded avatars go to the public `avatars` bucket under a folder
named for the user's id, capped at 4 MB, and are served as-is. There
is no resize, no re-encode, no EXIF strip, no CDN.

That means a 4 MB phone photo stays a 4 MB phone photo, and it is
served from the application's own domain. For a workspace where every
member's avatar is rendered in every row, that is a real page-weight
problem at scale.

**To fix:** an image-processing step on upload (sharp, or a Supabase
Edge Function), writing a thumbnail alongside the original. That needs
a storage policy change, so it is not done here.

---

## B13 — The migration must be applied as a unit

`supabase-setup/26-company-directory.sql` grew in phase two: it now
also creates the `avatars` storage bucket with its policies, adds
`user_profiles.avatar_url`, and installs the
`guard_team_member_self_update` trigger.

**It is still one file and it is still idempotent** — but it is now
more load-bearing than before. Applying it in pieces is not
supported; run the whole file.

---

## Not blocking, but not done either

- **Private-channel Realtime** — see B3.
- **Google / Outlook calendar sync** — explicitly excluded by the brief.
- **Company profile settings** — writing the `companies` row stays
  owner-only; no settings screen was added.
- **Bulk member actions** — invite, edit and remove are one member at a
  time.
- **The global notification bell** still shows company notifications
  alongside personal ones. That is deliberate (see DECISIONS.md D1), but
  if it becomes noise, the fix is to filter `company_id is null` in
  `GET /api/notifications`.


---

## B14 — The Resend API key was shared in a conversation, not in a secret store

The key used during this build was pasted into the conversation and
written to a local `.env.local`. That file is covered by `.gitignore`
(`.env*`, except `.env.example`) and was excluded from the delivered
archive — but **a key that has been pasted into a chat transcript
should be treated as exposed**, because transcripts are copied,
logged and retained by tooling that is not the secret store.

**Do this before production:**

1. Create a fresh key in Resend (the account already has three; the one
   used here is named `Tenvikooxxa`).
2. Set it on the deployment — Vercel → Settings → Environment
   Variables → `RESEND_API_KEY`, marked for all environments.
3. Delete the key used during the build from the Resend dashboard.
4. Never put the real key in `.env.example` — that file is tracked.

**Also still true:** `bower.africa` is registered in Resend but not
verified, so it cannot send yet. The four DNS records are in
`docs/email-setup.md`. Until they are added, sending from
`no-reply@bower.africa` is refused with a 403 and the invitation link
falls back to the server log.
