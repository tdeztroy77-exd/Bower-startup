# The design system — "Nocturne"

Every colour, surface, easing and rule the product and the public site
are built from. This is the reference: if a new surface is built, it
comes from here.

---

## The three colours and the canvas

```
PINE INK   #07231C   the structural colour
LIME       #D8F25C   the loud one
MINT       #34E0A1   the live one
CREAM      #F4F3EC   the canvas
```

| Colour | Token | Where it lives |
|---|---|---|
| **Pine ink** | `--brand-ink` | The company band. The marketing footer. The sign-in panel. Any surface that needs an anchor. It is the only place the palette goes dark. |
| **Lime** | `--primary`, `--brand-lime` | The primary action. The active navigation marker. The focus ring. The marker swipe on a headline. One per screen. |
| **Mint** | `--live` | Presence. "Someone is here right now". Healthy states. |
| **Cream** | `--background` | The canvas, everywhere. |
| **Pine** | `--pine` | Brand text, links, icons, outlines, progress fills — everywhere lime would be unreadable. |

### Why two greens

Pine is the brand; mint is the signal. They are 40° apart in hue and
very far apart in lightness, so a mint dot never reads as a pine button
and a pine link never reads as "live". If you need a third green, you
need a third token, and it probably means the state is not a state.

---

## The rule about lime

**Lime is a light colour. It cannot be a fill on a light surface.**

| Lime is | Lime is not |
|---|---|
| A button background, with pine ink on top | A progress bar on a cream card |
| A marker swipe behind dark type | Body text, or a link |
| A small dot or icon on a dark surface | A border on cream |
| A wash (`--brand-lime-soft`) behind a pine icon | A large block of a light page |

Progress bars, chart fills and table rules use **pine**. This is the
single most common mistake when a brand accent is a bright yellow.

---

## Surfaces

| Surface | Class | Use |
|---|---|---|
| Pine anchor | `.brand-sweep` | The company band, the footer, the sign-in panel. Pine ink with a lime sweep and a mint bloom, plus a grain overlay so it does not read as flat vector. |
| Lime band | `.band-lime` | **One per page.** The loudest surface in the system. |
| Mint band | `.band-mint` | The cooler sibling — for a section about something arriving rather than about money. |
| Ambient field | `.field-color` | The drifting colour wash behind the hero. Slow enough to read as atmosphere. |

A page has a rhythm: cream → cream → mint → cream → pine → cream →
lime → pine. Never two bands touching.

---

## Type

- **Display** — Fraunces (`--font-display`). Headlines, the wordmark, the
  product's editorial moments. Lowercase for the wordmark, sentence case
  for headlines.
- **Interface** — the system sans stack. Compact, 12–14px in the product.
- **Utility** — a monospace for receipt numbers, references and amounts
  that have to be compared character by character.

The 2026 signal of a premium SaaS is a serif doing the headings in the
*product*, not only on the marketing site. Bower keeps the display face
for the marketing site and the workspace headline.

---

## Motion

Two easings and six named entrances. Nothing else.

```
ease-expo    cubic-bezier(0.16, 1, 0.3, 1)     things that arrive
ease-spring  cubic-bezier(0.34, 1.4, 0.64, 1)  things that respond
```

| Class | Use |
|---|---|
| `.anim-row-in` | A list row arriving. Staggered by 26ms per row. |
| `.anim-bloom` | A presence dot coming online. Once, then quiet. |
| `.anim-breathe` | A slow pulse on a live element. |
| `.anim-pop` | An unread badge appearing. |
| `.anim-notify-in` | A notification arriving in the sheet. |
| `.anim-shimmer` | A loading skeleton. |

`prefers-reduced-motion: reduce` kills every animation globally. The
hero's colour field is on a 30-second cycle — long enough that the eye
never catches it moving.

---

## Depth

Depth comes from a light source, not from a shadow.

- `.btn-sheen` — the primary action: a highlight at the top left, a
  gradient towards the base. It reads as a physical button.
- `.shadow-glow` / `.shadow-glow-strong` — colour that reads as light
  spilling from the object.
- `.brand-grain` — a 3px dot grid over the pine surfaces, at 5% opacity.
- `--shadow-card` / `--shadow-lift` — the two elevations, both with a
  pine cast.

---

## Components

### The primary action

`bg-primary` (lime) with `text-primary-foreground` (pine ink). Never
`text-pine-foreground` on lime — that is a near-white and it is
unreadable. The `Button` component's default variant already carries the
sheen and the glow.

### Icon tiles

`bg-brand-lime-soft` with a pine icon. One accent on every tile, not a
different colour per stat card — a row of five differently coloured
tiles is the dated pattern.

### The active navigation item

A lime wash background, a pine icon, and a 3px lime rail on the leading
edge.

### Avatar tints

Twelve solid, saturated hues in the light theme and the same hues as
glows in the dark theme. Seeded from the member's **user id**, so a
person's colour never changes — not when they are renamed, not between
sessions. The palette is ordered so neighbouring slots contrast: two
people who land on adjacent slots get opposite colours, not two shades
of the same one.

### Signal colours

Departments, event types and notification types each take one hue, and
each notification type has its own icon as well. Colour means something
or it is not there.

---

## Dark mode

The dark theme is not the light theme inverted. It is re-tuned:

- The canvas is a true near-black with a pine cast (`#0C1310`), not
  `#000000`. Pure black is uncomfortable after twenty minutes.
- Lime gets louder, not dimmer — it is the accent, and accents carry
  further on a dark surface.
- Pine becomes a **light** pine (`#7FD3AC`) so brand text stays legible.
- Elevation is layered by background lightness, not by border weight.
- Avatar tints become glows instead of solid fills; a solid fill would
  shout.

The product ships a **theme switch** in the top bar (Light / Dark /
System). `next-themes` drives it with `attribute="class"`, so there is
no flash of the wrong theme on load.

**No accent picker.** A product that lets you recolour itself looks like
a template. The palette is the brand; the theme changes the canvas,
never the brand.

---

## Writing

- Say what happens: "Save changes", "Invite a teammate", not "Submit".
- An action keeps its name through the whole flow — a button that says
  "Publish" produces a toast that says "Published".
- Name things the way the person using them knows them. A person manages
  notifications, not webhook configuration.
- Errors explain what to do next. They do not apologise and they are
  never vague.
- Copy on the marketing site is a promise about the product. If the
  product changes, the copy changes in the same build.
