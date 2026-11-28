# The Company workspace

Bower's company section turns an owner-only shell into a real team
workspace: a directory of people, a team calendar, live presence, and
notifications — all scoped to one company.

- **Directory** — `/dashboard/company`
- **Calendar** — `/dashboard/company/calendar`
- **Invitation acceptance** — `/auth/accept-invite?token=…`

---

## What is in it

### The directory

Every active member of the company can open it — not just the owner.
That was the point of the rebuild: a company directory that only the
owner can read is not a directory.

Each person is a **row**, not a card: a 36px circular avatar, a presence
dot, their name, their job title, a department chip and their role. The
whole row opens a profile sheet with their contact details, their local
company time and — for admins — the controls to change their role or
remove them.

The list is searchable, filterable by role, status and department, and
windowed above 100 people so a large directory still scrolls at 60fps.

### Invitations

Inviting is a real workflow now, not a row insert.

1. An admin or manager sends an invitation from the **Invite** button.
2. The invitee gets a link. The link carries a 32-byte random token;
   only its SHA-256 hash is stored.
3. They open the link, set a name, a password and a department.
4. They join. The token is spent — a second attempt is rejected.
5. The inviter is notified that they joined.

Invitations expire after seven days and can be revoked. Nobody appears
in the directory until they have accepted.

### Presence

Live, over Supabase Realtime — a member sees who is online right now,
and a tab that is hidden shows as *away*. The database keeps a
last-seen snapshot as a fallback so someone who closed their laptop
still shows a sensible "last seen".

### The calendar

A team agenda, not a month grid. A grid is good for one person's
appointments and useless for a team; what a manager needs on Monday
morning is "who am I seeing today, in what order".

Meetings, viewings, inspections, holidays and focus blocks. Events are
visible to everyone unless they are marked private. Adding an event
notifies the team in real time.

### Notifications

Company notifications land in the existing Bower notification store,
tagged with the company. The bell in the company header shows the
company feed; the workspace bell in the top bar still shows everything,
so nothing is hidden by being on the wrong page.

### Profiles

A person has two records and they are kept in step.

`user_profiles` is the **personal** record: full name, photo, phone,
job title. It is the person's own to edit, from *My profile* in the
avatar menu or from *Edit my details* inside their own row.

`team_members` is the **company** record: role, department, status. It
belongs to the company. An admin edits it from a member's sheet; a
member cannot edit their own, and a database trigger rejects the
attempt even if a request reaches it by another path.

The two are joined on `user_id`. A photo uploaded in the profile sheet
shows on the person's directory row.

### The invitation email

Supabase Auth owns the account and the session — it sends the
confirmation, recovery and magic-link emails. The **invitation** email
is different and is sent by Resend, because it has to carry a
hashed, single-use, expiring company token that Supabase's own
templates cannot carry.

The flow:

1. An admin invites someone. The invitation row is created with a
   hashed token — the raw token is never stored and never returned by
   an API.
2. `lib/email/send.ts` posts the message to Resend. The body is
   `lib/email/templates.ts`: a table-based, inline-styled HTML email
   with a plain-text alternative, an ink header, and the acceptance
   link as both a button and a fallback URL.
3. The invitee opens the link. If they have no account yet, they sign
   up first; the invitation is remembered across the signup.
4. `POST /api/invitations/accept` verifies the token, and one atomic
   SQL function — `accept_company_invitation`, `FOR UPDATE`, so it
   cannot run twice — creates the membership.

**If `RESEND_API_KEY` is not set**, the send is skipped and the link is
written to the server log. The invitation still exists and can still be
redeemed; a missing key must never lose an invitation.

Supabase's own SMTP needs to move to a custom provider for production
— the default relay is capped at about 2 emails an hour. See
`BLOCKED.md` B10.

### The design system

**Nocturne**: pine ink, lime, mint, on a warm cream canvas. The full
reference is in [`design-system.md`](./design-system.md); the short
version:

- **Pine ink** (`--brand-ink`, `#07231C`) is the structural surface:
  the company band, the email header, the footer, the sign-in panel. It
  is the only place the palette goes dark.
- **Lime** (`--primary`, `#D8F25C`) is the loud accent: the primary
  action, the active navigation marker, the focus ring.
- **Mint** (`--live`, `#34E0A1`) is presence. Green means someone is
  here right now.
- **Pine** (`--pine`, `#0E4A37`) is brand text, links, icons and
  progress fills — everywhere lime would be unreadable.
- Each department takes one hue, each event type takes one hue, and
  each notification type has its own icon and severity rail.
- Motion is native CSS: `ease-expo` for arrivals, `ease-spring` for
  responses, and named entrance classes (`anim-row-in`, `anim-bloom`,
  `anim-notify-in`). `prefers-reduced-motion` is honoured globally.

The rule behind all of it: in a list, colour has to mean something, or
it is just noise. And the rule about lime: it is a light colour, so it
can be a button or a marker, but never a progress fill on cream.

---

## Who can do what

| Action | Owner | Admin / Manager | Agent | Accountant | Viewer |
|---|---|---|---|---|---|
| Read the directory | yes | yes | yes | yes | yes |
| Read the calendar | yes | yes | yes | yes | yes |
| Read presence | yes | yes | yes | yes | yes |
| Read own notifications | yes | yes | yes | yes | yes |
| Invite members | yes | yes | no | no | no |
| Revoke an invitation | yes | yes | no | no | no |
| Change a role or department | yes | yes (not self) | no | no | no |
| Remove a member | yes | yes (not self) | no | no | no |
| Create an event | yes | yes | yes | no | no |
| Edit or delete own event | yes | yes | yes | no | no |
| Edit or delete anyone's event | yes | yes | no | no | no |

Two things never happen: the owner cannot be demoted or removed, and
nobody can change their own role. Both would let one person quietly
lock the company out of its own admin screen.

The matrix lives in one place — `lib/company/permissions.ts` — and the
API, the UI and the tests all read from it.

---

## Staging checklist

Run through this on staging before it goes to production. The
migration must be applied first — see `BLOCKED.md` B1.

**Setup**

- [ ] Apply `supabase-setup/26-company-directory.sql`
- [ ] `select company_role('<company-id>'::uuid, auth.uid())` returns your role
- [ ] `select public.is_company_member('<company-id>'::uuid, auth.uid())` returns `true`

**Directory**

- [ ] Sign in as a plain member (not the owner) → the directory loads with the whole team
- [ ] The owner appears in the directory, first
- [ ] Search by name, email and job title
- [ ] Filter by department, role and status
- [ ] Click a row → the profile sheet opens with their details
- [ ] The presence dot shows you as online, and your colleague when they are on the same page

**Invitations**

- [ ] As an admin: **Invite** → an invitation is created with status `pending`
- [ ] `select status, expires_at from company_invitations` — the row is pending, and it has a `token_hash`, not a token
- [ ] Open the link from the server log → the accept form shows the company name
- [ ] Accept with a name, password and department → you are signed in and land on the directory
- [ ] The team now shows the new member
- [ ] The inviter has an `invite_accepted` notification
- [ ] Open the same link again → refused ("already been used")
- [ ] Revoke a pending invitation → it can no longer be accepted

**Calendar**

- [ ] As an agent: **Add event** → it appears in today's agenda
- [ ] Another member sees it without refreshing
- [ ] Their bell shows the new-event notification
- [ ] As a viewer: the **Add event** button is not there, and `POST /api/company/events` returns 403
- [ ] Move to the next month → the agenda changes
- [ ] An event that ends before it starts is refused

**Isolation — the important one**

- [ ] Sign in as Company A's member. Open Company B's member id directly in
      `GET /api/company/members/<id>` → **404**, not 403 and not 200
- [ ] `PATCH` and `DELETE` on that same id → **404**, and Company B's record is unchanged
- [ ] `GET /api/company/events` as Company A's member → only Company A's events
- [ ] The landlords panel is visible to owners and managers, and not to plain members

**Production**

- [ ] Apply the migration to production
- [ ] Repeat the invitation flow once, end to end, with a real person
- [ ] Enable it for the team

---

## API

Every route uses `withAuth` and resolves the caller's company before it
touches anything. Responses are bare keys — never wrapped in `data`.

| Route | Method | Who | Returns |
|---|---|---|---|
| `/api/company` | GET | any member | `{ workspace: { company, team, landlords, member } }` |
| `/api/company` | POST | admin | `410` — moved to the invitations endpoint |
| `/api/company/members` | GET | any member | `{ members, next_cursor }` |
| `/api/company/members/[id]` | GET | any member | `{ member }` |
| `/api/company/members/[id]` | PATCH | admin | `{ member }` |
| `/api/company/members/[id]` | DELETE | admin | `{ ok, member }` — a soft remove |
| `/api/company/invitations` | GET | admin | `{ invitations }` |
| `/api/company/invitations` | POST | admin | `{ ok, invitation, email }` |
| `/api/company/invitations/[id]` | DELETE | admin | `{ ok, invitation }` — revokes |
| `/api/invitations/accept` | POST | public | `{ ok, company_slug, company_name }` |
| `/api/company/presence` | GET | any member | `{ presence }` |
| `/api/company/presence/heartbeat` | POST | any member | `{ ok, status }` |
| `/api/company/events` | GET | any member | `{ events }` |
| `/api/company/events` | POST | admin, manager, agent | `{ event }` |
| `/api/company/events/[id]` | PATCH | creator, admin | `{ event }` |
| `/api/company/events/[id]` | DELETE | creator, admin | `{ ok }` |
| `/api/company/notifications` | GET | any member | `{ notifications, unread }` |
| `/api/company/notifications/[id]/read` | PATCH | own row | `{ ok, notification }` |
| `/api/company/notifications/read-all` | PATCH | own rows | `{ ok }` |

A raw invitation token is never returned by an API and never appears in
a response body.

---

## Where things live

| File | What |
|---|---|
| `lib/company/types.ts` | Every shared type |
| `lib/company/permissions.ts` | The permission matrix |
| `lib/company/auth.ts` | `requireCompanyMember`, `requireCompanyOwner` |
| `lib/company/directory.ts` | The directory query, shared by the API and the page |
| `lib/company/invitations.ts` | Token helpers and the invitation state machine |
| `lib/company/notify.ts` | The one notification writer |
| `supabase-setup/26-company-directory.sql` | Schema, RLS and the acceptance function |
| `components/company/` | The directory, the calendar, presence, the bell |
| `tests/company/` | authz, isolation, invitations, events |

`DECISIONS.md` records every choice that differs from the build brief,
and why. `BLOCKED.md` records what is not done yet.
