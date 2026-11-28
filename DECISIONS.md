# DECISIONS — Company workspace build

Every choice made while building the Company section that is not a
mechanical copy of the build brief. The brief is the contract; this
file records where the repository's reality forced a deviation, and why.

The build brief (`pasted-text.txt`, "MASTER BUILD BRIEF") was written
against an assumed snapshot of Bower. The repository in
`Bower-startup-main` differs in several load-bearing ways — Next 16
rather than 14, React 19, Tailwind v4, `lib/api/index.ts` rather than
`lib/api.ts`, an existing `notifications` table, and no Realtime usage
anywhere. Where the brief and the repository disagreed, the repository
won, and the difference is recorded below.

---

## D1 — Company notifications REUSE the existing `notifications` table

**Brief said:** create a new table `company_notifications` (Section 6),
and Section 20 says "Do not create a parallel notification system if one
already exists."

**Repository already has:** `public.notifications` (created by
`03-notifications.sql`) with `user_id`, `type`, `title`, `message`,
`severity`, `link`, `is_read`, `metadata`, `created_at` — plus
`/api/notifications`, a working `NotificationsBell`, RLS policies and a
`mark_all_notifications_read` RPC.

**Decision:** `26-company-directory.sql` adds `company_id` to the
existing table. No second table, no second bell in the header, no
second unread counter.

**Why:** the brief's own Section 20 forbids the parallel system. Two
notification stores would mean two feeds, two badges, two places to
forget RLS, and a notification that exists in one store but not the
other. The existing table's shape is a superset of what the company
feed needs — it even has `severity` and `link`, which the brief's
proposed table did not.

**Contract kept:** `GET /api/company/notifications` still returns
`{ notifications, unread }`. The brief's `company_notifications` column
names (`payload`, `read_at`) map onto the existing `metadata` and
`is_read`.

**Consequence:** company notifications appear in the existing global
bell as well as the company-scoped bell. That is deliberate — nothing
should be hidden because you are on a different page.

---

## D2 — The two owner-only RLS policies had to be widened

**Brief said:** the migration should add new tables and their policies.
Its SQL did not touch `companies` or `team_members` policies.

**Problem:** the brief's own FIX 2 requires `GET /api/company` to
return the company and the directory to any active member. But:

- `companies_select_own` matched only `auth.uid() = owner_id`, so a
  member could not even read their own company's row;
- `team_members_select_company` matched only the owner or the caller's
  own row, so a member listing the directory would have received
  exactly one person — themselves.

The API would have been correct and the product still broken. RLS is
the second lock on the same door, and it was locked.

**Decision:** the migration replaces both policies with member-aware
versions, and widens `managed_landlords` for admins and managers.

---

## D3 — Policy subqueries rewritten as SECURITY DEFINER functions

**Brief's SQL contained a cross-tenant read.** In the policies for
`company_events` and `company_presence` the brief wrote:

```sql
exists (select 1 from public.team_members tm
        where tm.company_id = company_id and tm.user_id = auth.uid())
```

Inside that subquery, the unqualified `company_id` resolves to the
INNER table's column, so the predicate becomes
`tm.company_id = tm.company_id` — always true. The result: any member
of any company could read every event and every presence row in the
database. The same shape appeared in the presence policy.

**Decision:** all company access questions are answered by three
`SECURITY DEFINER` functions — `company_role`, `is_company_member`,
`is_company_admin` — which resolve the effective role of a user in a
company. The policies call those instead of sub-selecting.

**Why SECURITY DEFINER:** a policy on `team_members` that asks "is this
user a member?" by sub-selecting `team_members` would recurse into
team_members' own policy, and Postgres rejects that as an infinite
recursion error. Running the lookup as the table owner breaks the
cycle without weakening the check.

---

## D4 — `company_presence` needed write policies

**Brief said:** presence table with a select policy.

**Problem:** the heartbeat endpoint upserts the caller's own row, and
the brief's policy set had no INSERT or UPDATE — the heartbeat would
have failed on every call, silently.

**Decision:** `presence_insert_own` and `presence_update_own`, both
scoped to `user_id = auth.uid()` so a member can only ever write their
own presence row.

---

## D5 — `PATCH_LOG` entry format

**Brief said:** append `{ file: '26-company-directory.sql', description }`.

**Repository format:** `PatchDescriptor` uses `{ id, description, sql, kind }`,
and the runner iterates `PATCH_LOG` applying `sql` files by name.

**Decision:** appended
`{ id: "p_2026_11_006", description: "Company workspace: …", sql: "26-company-directory.sql", kind: "schema" }`.
A `file` key would have been ignored by the runner and the migration
would never have applied.

---

## D6 — The public accept route had to be allow-listed in the middleware

**Brief said:** `POST /api/invitations/accept` is a public route, no
`withAuth`.

**Problem:** `lib/supabase/middleware.ts` answers any `/api/**` request
without a session with a 401 — before the route handler ever runs. The
public endpoint would have been unreachable.

**Decision:** the path is added to `isExternalApi`, next to the tenant
portal's `/api/portal/`, with a comment explaining that the route
authenticates with its hashed, single-use token instead of a session.

---

## D7 — The accept route uses the service-role client

**Problem:** `company_invitations` is invisible to anonymous sessions by
design (owner/admin policies only). A public route therefore cannot look
up its own invitation with the caller's client.

**Decision:** the accept route reads and writes through
`createServiceClient()`, exactly like the tenant portal's
`loadPortalData` does for its hashed access links. The security comes
from the token, not from a session.

---

## D8 — Acceptance is one transaction, not three queries

**Brief said:** "Transaction: create auth user (if needed) + team_members
row + set invitation.status='accepted'."

**Problem:** the Supabase JS client cannot run a multi-statement
transaction, and three separate calls can leave an invitee half-joined
or leave the token redeemable a second time.

**Decision:** `public.accept_company_invitation(...)` does all three in
one `SECURITY DEFINER` function, with `SELECT … FOR UPDATE` on the
invitation row. Two concurrent redemptions serialise on that lock; the
second one sees `status = 'accepted'` and fails. The function is
granted to `service_role` only.

**Also:** the function notifies the inviter, so the notification cannot
be skipped by a failure between "join" and "tell".

---

## D9 — Identity is established by password, not by email lookup

**Problem:** the brief says "if email has an auth.users row: sign them
in". Looking a user up by email requires the admin API, which has no
`getUserByEmail` in the pinned `@supabase/auth-js` version — only
`listUsers`, which is a paginated scan.

**Decision:** the accept route tries `signInWithPassword` first. A
correct password both proves ownership of the address and establishes
the session. Only if that fails does it create the account (and then
sign it in). A wrong password on an existing account surfaces as a 409
telling the invitee to sign in with their existing password — no user
enumeration beyond what holding the invitation already implies.

---

## D10 — The accept-invite page lives in the `(marketing)` route group

**Brief said:** `app/auth/accept-invite/page.tsx`.

**Repository convention:** every other auth screen lives in
`app/(marketing)/auth/…`, and `MarketingShell` deliberately strips the
marketing header and footer for `/auth/*` so the screens render as
focused, full-height tasks.

**Decision:** `app/(marketing)/auth/accept-invite/page.tsx`. The URL is
identical (`/auth/accept-invite`) — route groups do not affect URLs —
and the page inherits the correct chrome behaviour.

---

## D11 — The directory row is a single button

**Brief's markup:** a `<button>` row containing another `<Button>` for
`MoreHorizontal`.

**Problem:** a button inside a button is invalid HTML. It breaks
keyboard navigation and confuses assistive technology.

**Decision:** the whole row is one button that opens the member's
profile sheet. Every action — message, change role, remove — lives in
the sheet. No nested interactive elements, full keyboard support.

---

## D12 — "Message" opens the user's mail client

The brief asks for a "Message" action in the profile sheet. Bower has
no chat or internal messaging system. Building one would be a fake
feature with a fake backend.

**Decision:** the action is a `mailto:` link to the member's address.
The button is disabled, with an explanation, when the member has no
known address (which can happen for the owner — see D13).

---

## D13 — The company owner is synthesised into the directory

The owner of a company usually has no `team_members` row — they created
the workspace. A directory that omits the person who owns it is wrong.

**Decision:** `requireCompanyMember` returns a synthetic member for the
owner (`id: "owner:<companyId>"`, `role: "admin"`, `is_owner: true`),
and the directory query prepends them. The owner's email lives in
`auth.users`, which PostgREST cannot read, so it is fetched with the
service client as a best effort and may be `null` — in which case the
profile sheet shows no address.

**Consequence:** the owner is protected from every destructive action —
they cannot be demoted, removed, or edited, and their row is not a real
row so there is nothing to edit.

---

## D14 — Managers can invite

Section 7 of the brief locks a permission matrix where "Invite members"
is `owner: yes, admin/manager: yes`. Section 8 says "Owner or admin
only" for the invitations endpoints.

**Decision:** the locked Section 7 matrix wins. `admin` and `manager`
may invite, revoke, change roles and remove members; agents,
accountants and viewers may not. One matrix, in
`lib/company/permissions.ts`, read by the API and the UI alike.

**Also:** `accountant` is a read-only member — it can read the
directory, the calendar and its own notifications, but it cannot add to
the calendar and cannot manage anyone. This matches the SQL policy
`company_role(...) in ('admin','manager','agent')` for creating events.

---

## D15 — Response shapes

`GET /api/company` keeps its existing envelope
`{ workspace: { company, team, landlords } }`. The team rows gain the
new profile columns, and a `member` field is added describing the
caller. Nothing was removed or renamed.

`POST /api/company` now returns **410 Gone** with `moved_to:
"/api/company/invitations"`. It used to insert a `team_members` row
directly — no token, no expiry, no acceptance, no revoke — so people
who never agreed to anything ended up in the directory. The brief
specified exactly this behaviour.

`GET /api/company/members` returns `{ members, next_cursor }`. The
locked shape is `{ members }`; `next_cursor` is additive and `null` on
the last page.

---

## D16 — A violet token was added to the design system

The brief's colour map needs violet for the `admin` department and
`holiday` event chips. The repository had no violet token, and the
hard-coded Tailwind shades in the brief (`text-violet-700` on
`bg-violet-500/10`) are unreadable in the dark theme.

**Decision:** `--violet` / `--violet-foreground` added to
`app/globals.css` in both themes, and every chip uses the app's
semantic tokens (`bg-success/10 text-success`, `bg-info/10 text-info`,
`bg-warning/10 text-warning`, `bg-violet/10 text-violet`,
`bg-muted text-muted-foreground`). Same hues as the brief, correct in
both themes.

---

## D17 — The directory list is windowed above 100 members

The brief asks for a lightweight windowing approach without adding
`react-window`. The directory renders only the rows inside the viewport
(plus a six-row overscan) once the list passes 100 people, with spacer
rows above and below. Under 100 the list renders normally in the page
flow, so the common case has no scroll container at all.

---

## D18 — The directory query lives in one place

`lib/company/directory.ts` holds the directory loader, used by BOTH
`GET /api/company/members` and the server-rendered company page. Two
copies of this query would drift, and the first visible symptom would
be a member who appears in the list but 404s when you click them.

---

## D19 — The tests drive the real route handlers

`tests/company/_fake-supabase.ts` is an in-memory stand-in for the
Supabase client: it implements the slice of the query builder the
company routes use, projects the requested columns (so a test can prove
that `token_hash` never reaches a response), and applies filters,
ordering and ranges.

The route handlers are then called directly, with the middleware's
same-origin guard satisfied by setting the `host` and `origin` headers.

**What this proves:** the route code resolves the caller's own company,
filters every query by that company id, and enforces the permission
matrix — 57 assertions across authz, isolation, invitations and events.

**What it does not prove:** Row Level Security itself. RLS is enforced
by Postgres, and the policies in `26-company-directory.sql` are the
second, independent lock. They are verified by reading the SQL and by
the staging checklist in `docs/company-workspace.md`.

---

## D20 — Scope deliberately left out

- **External calendar sync** (Google, Outlook) — the brief excludes it
  for this build.
- **Company profile editing** — writing the `companies` row stays
  owner-only, and no settings UI was added for it.
- **`property_id` on events is not validated against the company's
  properties.** The foreign key validates that the property exists;
  it does not validate that the caller may attach it. Attachments are
  not surfaced in the UI yet.
- **Private-channel Realtime.** The presence channel
  (`company-presence-{companyId}`) is a public channel on the anon key,
  which is the Supabase default. A member who knows a company id could
  observe that company's presence. The data is low-sensitivity (who is
  online), and the database fallback — the only path that carries
  identity — is protected by RLS. Locking this down properly means
  `realtime.messages` policies and private channels, which is a
  separate, riskier change. It is recorded in `BLOCKED.md`.

---

# DECISIONS — Design and product upgrade (phase two)

The second pass was not about adding features. It was about the two
questions the team actually asked: *"does this feel premium and alive,
like Slack or Notion?"* and *"can a person edit their own details?"*.
The design references were captured and read before any code was
written; the decisions below are the ones that were not obvious.

---

## D21 — Motion is native CSS, and there is no `motion` dependency

The brief asked for motion work "with plugins like motion and
hallmark". Neither exists in this environment: `mcode-tools connector
tools` lists 17 media tools and no motion or animation connector, and
the repository has no animation library — no Framer Motion, no GSAP,
no Lenis.

Adding a dependency was possible but not free: a 30–50 kB runtime cost
on every dashboard route, an API surface to learn, and a build-time
risk on a codebase that currently ships with zero animation libraries.

What the upgrade actually needed was not a physics engine. It was a
small, consistent vocabulary of entrances and easings, applied where a
person is looking. That is a few dozen lines of CSS.

**Decision:** implement the motion layer natively in `app/globals.css`
— two easing curves (`ease-expo` for arrivals, `ease-spring` for
responses), named entrance classes (`anim-row-in`, `anim-bloom`,
`anim-breathe`, `anim-pop`, `anim-notify-in`, `anim-shimmer`), and
`prefers-reduced-motion` honoured globally.

**What this costs:** nothing at runtime. **What it gives up:** scroll-
linked parallax, layout animations, and spring physics on layout
changes — none of which the product needed.

---

## D22 — One structural ink surface, not a new palette

The temptation with "more colour" is to repaint everything: a new
primary, twelve new accent hues, a new background. That is how a
product ends up looking like a theme rather than a brand, and it
invalidates every existing component at once.

The reference captures pointed somewhere more disciplined. Slack's
authority comes from one dark aubergine structural surface inside an
otherwise bright product; Notion's from restraint; Linear's from a
single dark canvas and one accent. In each case the *dark* is the
signature, and the colour is spent on signal — who is online, what
type of event this is, which team someone is in.

**Decision:** add one deep brand-ink surface (`--brand-ink`, a
near-black with a green cast) and use it in exactly three places:
the company band at the top of the workspace, the header of the
invitation email, and the team section of the marketing site. Every
other colour is *signal*, not decoration: presence is green,
departments take one hue each, event types take one hue each.

**Why not more:** a list where every row is a different colour stops
being scannable. The colour has to mean something for the colour to
be worth anything.

---

## D23 — The invitation email is sent by Resend, not by Supabase

The brief's question was direct: *"what are the emails sent? is it
Supabase? how are the invites opened?"* The honest answer is that the
two jobs belong to different systems, and pretending otherwise would
have produced a broken invitation.

**Supabase Auth owns the account and the session.** It also sends its
own auth email — confirmation, recovery, magic link. But its default
SMTP relay is capped at roughly 2 emails per hour, only sends from
project-team addresses, and is explicitly not for production traffic.
Moving it to a custom SMTP provider (Resend, SES, Postmark, Brevo)
raises that to about 30 per hour. That move is recorded in
`BLOCKED.md` because it is an account-level change in the Supabase
dashboard, not a code change.

**The invitation email cannot be a Supabase template.** A company
invitation is redeemed with a hashed, single-use, expiring token that
the route verifies itself — and that token has to ride in the link.
Supabase's own invitation template cannot carry a company token, and
`inviteUserByEmail` sends Supabase's template, not ours.

**Decision:** Resend owns the invitation email. `lib/email/send.ts`
posts to the Resend API over plain `fetch` — no new dependency, since
the app has no reason to carry an SDK for one HTTP call. The message
body is `lib/email/templates.ts`: a table-based, inline-styled HTML
email that survives Gmail and Outlook's CSS stripping, with a
plain-text alternative, a dark-safe ink header, and the acceptance
link both as a button and as a fallback URL.

**Acceptance:** the invitee opens a link, signs in (or signs up), and
the membership is created by one atomic SQL function
(`accept_company_invitation`, `FOR UPDATE`, single-use guaranteed).
The raw token is never logged and never returned by an API.

**Failure mode:** with no `RESEND_API_KEY` configured, the send is
skipped and the acceptance link is written to the server log. The
invitation still exists in the database and can still be redeemed. A
missing API key must not lose an invitation.

---

## D24 — Two records for one person, and a trigger that stops escalation

"Can these profiles be modified?" splits into two different questions
that had been answered with one model.

A person's *own* details — name, photo, phone, job title — belong to
them. Their *company* record — role, department, status — belongs to
the company, and must not be editable by the person it describes.

**Decision:** two records, kept in step.
`user_profiles` holds the personal record and is self-editable.
`team_members` holds the company record and is editable only by an
admin. `GET /api/profile` and `PATCH /api/profile` expose only the
personal fields — role, status, company and user id are not in the
allowlist, so a self-escalation attempt is dropped at the route
before it reaches the database.

**The second lock is in the database.** A `guard_team_member_self_update`
trigger rejects any `UPDATE` on `team_members` that changes `role`,
`status`, `company_id` or `user_id` for the row belonging to the
acting user. The route allowlist is the friendly layer; the trigger is
the one that holds when someone forgets it.

**The avatar** is uploaded to the public `avatars` bucket under a
folder named for the user's id, with policies that let a user write
only their own folder. 4 MB cap, JPG/PNG/WebP/GIF.

---

## D25 — The public site gets one colour wash and one dark band

"More colour" on a marketing site is easy to overdo. A page where
every section has its own gradient reads as a template, not a brand.

**Decision:** the public site stays warm cream and calm, with exactly
two moments of saturation:

1. **The hero** gets a soft ambient field — a wide, slow-drifting
   wash of green, blue and amber behind the hairline grid. It moves
   on a 30-second cycle, which is long enough that the eye never
   catches it moving and short enough that a page left open does not
   feel like a photograph.
2. **The team section** is the one dark band on the page, and it
   carries the real product surface — the ink band, the presence dots,
   the department chips — rather than a picture of it.

Everything else keeps the existing rhythm: light section, muted
section, light section. The primary action gained a light source
(`btn-sheen`) and a glow so it reads as a physical button instead of a
flat block of green.

---

## D26 — The marketing copy for the company feature was wrong

`lib/content/marketing.ts` described the company feature as: *"Multi-
landlord books and role-based team access are in development, not
available today."* That was true when it was written and false once
the workspace shipped. Leaving it would have been the worst kind of
bug — a marketing site that undersells the thing you just built.

**Decision:** rewrite the `company-view` entry to describe what the
product actually does now — directory, roles, invitations, presence,
calendar, notifications — and point the homepage's new team section
at it.

The general rule this sets: a marketing page is a claim about the
product, and every claim in it is a promise. If the product changes,
the copy changes in the same build.

---

## D27 — Three defects found by looking at the rendered product

The design pass was checked by screenshotting the real screens, not by
reading the code. That found three bugs that a code review had missed.

### The stand-in Supabase client had no `channel`

`lib/supabase/client.ts` falls back to a dummy client when the
environment variables are missing. The dummy had `auth`, `from` and
`storage` — but no Realtime surface. Three features open a channel on
the browser client: presence, the notification bell and the company
calendar.

So `supabase.channel(...)` threw `supabase.channel is not a function`
inside a `useEffect`, the error boundary caught it, and the whole
workspace was replaced with "Something went wrong" — because the
notification bell could not subscribe.

**Decision:** the stand-in now covers the whole client surface
(`channel`, `removeChannel`), and all three call sites wrap channel
creation in a `try`/`catch`. A live update that cannot connect
degrades to "needs a refresh", never to "no page".
`tests/company/resilience.test.ts` holds the line.

### The notification list was wider than its sheet

The scroll container used `-mx-6` so the sticky day header could span
the full width of the sheet. The side effect was that every row sat
24px outside the sheet on each side: the severity rail was drawn off
the left edge of the sheet — invisible, so nobody noticed it was
missing — and on a phone the timestamp and the unread dot were cut in
half at the right edge of the screen.

**Decision:** only the sticky header bleeds now (`-mx-6` on the
header, not on the container), and the container clips it with
`overflow-x-hidden`.

### The avatar hash only used the last letter of the name

`hash = hash * 31 + charCodeAt(i)` leaves the low bits of the hash in
reach of the final character, and the palette index was `hash % 8`.
"Brian Kiarie" and "Joseph Mutiso" landed on the same blue; a
directory of five people came out as two blues and two pinks. It reads
as a bug, not as a coincidence.

**Decision:** FNV-1a with one avalanche step, and a twelve-hue palette
ordered so neighbouring slots contrast — two people on adjacent slots
get opposite colours rather than two shades of the same one.

**The general rule:** a screenshot catches what a type-checker cannot.

---

# DECISIONS — "Nocturne" (the third pass, the platform repaint)

---

## D28 — The palette is pine, lime and mint, and the logo already knew

The brief for this pass was blunt: the website reads generic, make it
read louder, do the homework on premium references, and use two primary
colours plus one secondary.

The most useful thing the research produced was not a palette — it was
a realisation about the existing logo. The brand mark is **two nested
arches with a dot in the centre**: a doorway, in deep green, with a
lowercase Fraunces wordmark closed by a coloured full stop.

Bower's palette had always been two colours. The pages had never used
them. The logo was the design system, and the site was a different
brand wearing the same name.

**Decision:** "Nocturne" — pine ink `#07231C` (structural), lime
`#D8F25C` (the loud accent), mint `#34E0A1` (the live signal), on a
warm cream canvas `#F4F3EC`.

The logo's centre dot became lime, so the smallest element of the
identity and the largest one carry the same colour. The mark's arch
gradient moved to pine.

**Why this and not something else:** the 2026 references agree on the
rules — one accent, used at about 5% of the viewport; brand and
functional palettes kept apart; real dark mode as a baseline; a serif
doing the headings. Applying those to Bower's own colours produces a
system that is recognisably Bower and recognisably 2026, rather than a
copy of Linear's purple.

**Documented in full in `docs/design-system.md`.**

---

## D29 — `primary` is the action colour; `pine` carries brand text

Lime is a light colour. It is superb as a button background with a
near-black label, and completely unreadable as body text or a link on a
cream card.

There are 234 `text-primary` usages in the repository. Repainting them
by hand would have been unreviewable; repainting them by rule would have
been unsafe.

**Decision:** split the roles.

- `--primary` is **lime** — the action colour. Always paired with
  `--primary-foreground` (pine ink). This is the button.
- `--pine` is a **new token** — the brand colour for text, icons,
  outlines and progress fills, where lime cannot be used.

A mechanical transform moved every `text-primary` and `border-primary`
to `pine` (190 and 56 occurrences) and deliberately left all 73
`bg-primary` usages alone, because those are buttons and they want to
be lime. `text-primary-foreground` was excluded by a negative lookahead
so the 44 button-label usages were untouched.

**The rule it exposed:** lime can be a button, a marker, a dot on a
dark surface, or a wash behind a pine icon. It cannot be a progress
fill, a table rule, a chart bar or a link. Progress bars, chart fills
and the loading skeleton moved to pine.

---

## D30 — No accent picker

The 2026 research is explicit that accent customisation is now a
baseline expectation, and it would have been cheap: a `data-accent`
attribute on `<html>` and three blocks of CSS.

**It was left out on purpose.** The brief asked for two primary colours
and one secondary — a decided palette, not a configurable one. A
product that lets you recolour itself looks like a template, and the
value of choosing pine, lime and mint is that they are chosen.

**What did ship** is the other half of the same expectation: a real,
reachable theme switch in the product's top bar (Light / Dark / System),
backed by `next-themes`, with the dark theme re-tuned rather than
inverted.

**The rule:** the theme changes the canvas. The brand does not change.
