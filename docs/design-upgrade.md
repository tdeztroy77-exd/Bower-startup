# The design upgrade — what changed and why

> **The current system is "Nocturne" and it is documented in
> [`design-system.md`](./design-system.md).** This file is the history:
> what was wrong, what the references said, and what was built and why.

A record of the second pass over the Company section and the public
site: what was wrong, what the references said, what was built, and
the rules that now hold.

---

## The honest starting point

The first thing to say is that the product was **not** bad. It was
well-crafted, consistent and calm. The typography was good, the
spacing was disciplined, the information architecture was sound.

The problem was that calm, on a screen with no colour and no motion,
reads as **flat** — and flat reads as **cheap**. Nothing in the
interface said "this is expensive software" or "this team is serious".
It looked like a well-made internal tool, because that is what it
was.

The reference captures made this concrete. Side by side:

| | What it does well | What Bower was missing |
|---|---|---|
| **Slack** | One dark aubergine structural surface inside a bright product; colour spent entirely on signal | Any structural anchor; colour meant nothing |
| **Notion** | Restraint, and a legible rhythm you can predict | Rhythm was there; legibility of *state* was not |
| **Linear** | A single dark canvas, one accent, motion that confirms an action | No accent, no motion, no confirmation |
| **Stripe** | Depth: layered shadows, a light source, and colour that washes the background rather than sitting on it | One flat plane of cream |

The conclusion was not "add more colour". It was **"colour has to mean
something, and something has to be dark"**.

---

## The rules that came out of it

**1. One structural ink surface.**
`--brand-ink` is a near-black with a green cast. It appears in exactly
three places: the company band at the top of the workspace, the header
of the invitation email, and the team section of the public site. It
is the only place the palette goes dark, which is exactly what makes
it read as an anchor rather than as a theme.

**2. Colour is signal.**
Presence is green — always. Each department takes one hue. Each event
type takes one hue. Each notification type has its own icon *and* its
own severity rail. A row in a list can be scanned for state because
the colour means something. Decorative colour was left out.

**3. Motion confirms, it does not perform.**
Two easing curves, six named entrance classes, and a global
`prefers-reduced-motion` guard. A row arrives staggered by 26ms; a
presence dot blooms once and then breathes; a notification slides in.
Nothing loops for decoration.

**4. Depth comes from a light source, not from a shadow.**
The primary action has a highlight at its top left and a glow beneath
it. The product mockup has a coloured bloom behind it. The dark band
has a grain over it so it does not read as flat vector.

**5. The public site gets one wash of colour and one dark band — no
more.**
The hero carries a soft, slow-drifting field of green, blue and amber.
The team section is the one dark band on the page, and it carries the
real product surface rather than a picture of it. Everything else
stays warm cream. A marketing page where every section has its own
gradient reads as a template; a page with two moments of colour reads
as a brand.

---

## What was actually built

### In the product

- **The company band** — a deep ink header with a brand sweep, a grain
  overlay, an avatar stack of the people who are online right now, and
  the viewer's own avatar, which opens their profile.
- **The directory** — a 3px presence rail on the leading edge of every
  row (green working now, amber here-but-away, nothing when offline),
  a live ring on the avatar, "Active now" as a label rather than a
  tooltip, and a staggered entrance.
- **Avatars** — twelve solid, saturated tints in the light theme,
  seeded from the member's user id so a person's colour never changes.
  The palette is ordered so that neighbouring slots contrast: two
  people who land on adjacent slots get opposite colours, not two
  shades of the same one.
- **The member sheet** — a presence ring around the avatar, a facts
  list that reads as a table rather than a stack of boxes, and role
  and department as separate, labelled things.
- **Notifications** — grouped by day (Today / Yesterday / a date),
  each type with its own icon, a severity rail on the leading edge,
  unread state in the background, and a sticky day header.
- **The calendar** — an event-type rail per row and a stronger time
  block. Still a list, never a month grid.

### On the public site

- **The hero** — an ambient colour field that drifts on a 30-second
  cycle, long enough that the eye never catches it moving; a primary
  action with a sheen and a glow that lifts on hover; a secondary
  action that lifts with it.
- **A new team section** — the one dark band on the page, carrying a
  drawing of the real screen: the ink band, the presence dots, the
  department chips, the calendar strip.
- **Corrected copy** — the `company-view` feature page said *"role-
  based team access are in development, not available today"*. That
  was true when it was written and false the moment the workspace
  shipped. It now describes what the product does.

---

## Three defects found while checking the work

These were not design choices. They were bugs, found by looking at the
rendered product rather than the code.

**1. The stand-in Supabase client had no `channel`.**
When the environment variables are missing, the app falls back to a
dummy client. That dummy had `auth`, `from` and `storage` — but no
Realtime. So opening the notification bell, the presence channel or
the calendar threw `supabase.channel is not a function` inside a
`useEffect`, the error boundary caught it, and the **whole workspace
was replaced with "Something went wrong"** because the bell could not
subscribe. A non-essential live-update feature had taken the page
down. The dummy now stands in for the whole client surface, and all
three call sites are wrapped so a channel that cannot open degrades to
"no live updates" rather than to "no page".

**2. The notification list was 24px wider than its sheet.**
The scroll container used `-mx-6` so the sticky day header would span
the full width. The side effect was that the rows sat 24px outside the
sheet on each side: the severity rail was drawn off the left edge of
the sheet (invisible), and on a phone the timestamp and the unread
dot were cut in half at the right edge of the screen. Only the sticky
header bleeds now, and the container clips it.

**3. The avatar hash only used the last letter of the name.**
`hash = hash * 31 + charCode` puts the low bits of the hash in reach
of the final character, and the palette index was `hash % 8`. So
"Brian Kiarie" and "Joseph Mutiso" landed on the same blue, and a
directory of five people came out as two blues and two pinks — which
reads as a bug, not a coincidence. The hash is now FNV-1a with an
avalanche step, and the palette is twelve hues wide.

---

## What this did not do

- **No animation library.** There is no `motion` or `hallmark`
  connector in this environment, and the repository has no animation
  dependency. The motion layer is native CSS — see DECISIONS.md D21.
- **No dark-mode switch.** The tokens exist and `next-themes` is wired,
  so the product renders correctly in dark mode (it was checked with
  screenshots), but there is no visible control to ask for it. That is
  a pre-existing gap, recorded in BLOCKED.md B11.
- **No scroll-linked animation, no layout transitions.** The product
  did not need them, and they are the things a library would have
  been for.


---

# Pass three — "Nocturne": the whole platform

The second pass made the Company section feel alive. It left the rest
of the product and the public site in the old, quiet palette — and the
complaint was fair: **the website was still generic**, and the product
had no identity of its own.

## The homework

Eleven 2026 design sources were read and eight live sites were captured
and compared (Ramp, Attio, Clay, Linear, Vercel, Miro, Mercury). The
convergence was unusually clear:

- **The brand colour is the accent, never the dominant.** If the brand
  colour fills more than about 5% of the viewport in steady state,
  something is wrong.
- **Brand and functional palettes are separate.** Brand colours are for
  marketing; a distinct functional palette (success, warning, error,
  info, neutrals) is for the product.
- **Real dark mode is a baseline.** "Products without real dark mode
  feel as dated as products without responsive layouts a decade ago."
- **Editorial typography in the product** — a serif or display face for
  headers — is "one of the clearest signals of a premium brand" in 2026.
- **Ramp's formula** is the one that answered "louder": a saturated
  colour (chartreuse) and a deep navy, tamed with disciplined
  whitespace and clean typography.
- **Clay's formula** is the one that answered "colour rhythm": a
  colour-coded section system, where each section carries its own hue.

## What Bower already had

Looking hard at the existing logo was the most useful part of the
research. The brand mark is **two nested arches with a dot in the
centre** — a doorway — in deep green, and the wordmark is lowercase
Fraunces closed with a coloured full stop.

So Bower's palette had always been two colours. The pages just never
used them. The logo was the design system; the site was a different
brand wearing the same name.

## The decision

**Nocturne**: pine ink, lime, mint.

```
PINE INK  #07231C   structural
LIME      #D8F25C   the loud one
MINT      #34E0A1   the live one
CREAM     #F4F3EC   the canvas
```

- **Pine ink** replaced the old brand ink as the structural colour — the
  company band, the footer, the sign-in panel. Deeper, colder, and
  unmistakably the same green as the logo.
- **Lime** is the loud accent: the primary action, the active navigation
  marker, the focus ring, the marker swipe on the hero headline. The
  logo's centre dot became lime, so the smallest and largest elements
  of the identity carry the same colour.
- **Mint** is the signal: presence, live states, healthy states.

## What changed across the platform

**The tokens.** `primary` is now lime (the action colour, always paired
with a pine-ink label) and a new `pine` token carries brand text, links,
icons and outlines, where lime would be unreadable. A mechanical,
auditable transform moved 190 `text-primary` and 56 `border-primary`
usages to `pine` and left all 73 `bg-primary` (the buttons) alone.

**The rule about lime.** Lime is a light colour; it cannot be a fill on
a light surface. Progress bars, chart fills and table rules moved to
pine. This is the single most common mistake when a brand accent is a
bright yellow, and it was made and caught in this pass.

**The public site.** The hero got bigger type (76px), a lime marker
swipe on the word that matters, and a product frame with a lime bloom
behind it. Two sections became colour-coded bands — mint for money in,
lime for tenants — and the footer became a pine-ink anchor. The page now
has a rhythm instead of being one flat cream sheet.

**The product.** A lime rail on the active navigation item, lime icon
tiles instead of five different colours, pine progress fills, and a real
theme switch (Light / Dark / System) in the top bar.

**Auth.** The sign-in panel became pine ink with the product floating on
it, so the first screen a user sees says what the product is before they
type anything.

## What was deliberately not done

**No accent picker.** The research says accent customisation is a 2026
expectation, and it would have been easy — a `data-accent` attribute and
three blocks of CSS. It was left out on purpose: a product that lets you
recolour itself looks like a template, and the brief asked for two
primary colours and one secondary, not a palette picker. The theme
changes the canvas; the brand does not change.

**No new dependency.** The motion layer is still native CSS.

**No dark-first product.** Dark-first is the 2026 default for
power-user software, but this product is used on phones in daylight in
Kenya. Cream-first with a real, reachable dark theme is the right call
for this audience, and the research's own warning applies — "one mode"
is the failure, not "light first".
