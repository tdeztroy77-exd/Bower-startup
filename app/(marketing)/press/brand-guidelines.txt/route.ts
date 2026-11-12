/**
 * GET /press/brand-guidelines.txt
 *
 * Plain-text brand guidelines referenced by the press kit. Values mirror
 * app/(marketing)/brand and lib/brand.ts so the document cannot drift.
 */
import { BRAND } from "@/lib/brand"

const COLORS: Array<{ name: string; hex: string; use: string }> = [
  { name: "Forest", hex: "#17624A", use: "primary actions, active states, the mark" },
  { name: "Deep forest", hex: "#0E4030", use: "mark gradient, dark surfaces" },
  { name: "Bone", hex: "#F7F4EC", use: "page canvas" },
  { name: "Clay", hex: "#B5764A", use: "the one warm accent — the full stop" },
  { name: "Ink", hex: "#151B17", use: "headlines and body copy" },
  { name: "Sage", hex: "#E9F0E9", use: "quiet panels and selected rows" },
  { name: "Hairline", hex: "#E2DCCF", use: "borders and dividers" },
]

export const dynamic = "force-static"

function guidelines(): string {
  const colorBlock = COLORS.map((c) => `  ${c.name.padEnd(12)} ${c.hex}   ${c.use}`).join("\n")

  return [
    `${BRAND.product} — Brand guidelines`,
    "",
    "----------------------------------------------------",
    "",
    "1. THE MARK",
    "",
    'The mark is two nested arches with a clay dot: a bower, a sheltered threshold.',
    'The wordmark is lowercase "bower" in a display serif, closed with a clay full stop.',
    "Use the supplied files as-is:",
    "  /brand/bower-logo.svg       Horizontal lockup (vector)",
    "  /brand/bower-mark.svg       Mark only (vector)",
    "  /brand/bower-wordmark.svg   Wordmark (vector)",
    "  /icon.svg                   App icon (vector)",
    "  /bower-logo.png             Raster logo for press",
    "",
    "Do not stretch, re-colour, outline, rotate or re-space the mark. Clear space",
    "on every side is the width of the arch. The clay dot is always last.",
    "",
    "2. COLOUR",
    "",
    colorBlock,
    "",
    "Forest carries action and money-positive states. Bone is the page. Clay is",
    "used once per screen at most — it is a note, not a button.",
    "",
    "3. TYPOGRAPHY",
    "",
    "Display: Fraunces, medium weight, tight tracking. Used for public site",
    "headlines and brand moments only. Interface: the system sans, compact and",
    "familiar, for every table, form and number. The wordmark is not re-typeset.",
    "",
    "4. TONE OF VOICE",
    "",
    "Plain, specific, unhurried. Say the number. Name the action. No exclamation",
    "marks, no superlatives, no invented metrics.",
    "",
    "5. MOTION",
    "",
    "Pages fade over 0.7s. Panels rise 16px over 0.85s with a soft ease-out.",
    "Hover changes are 200ms colour and shadow only. Reduced motion removes all",
    "transforms.",
    "",
    "6. USE",
    "",
    "These guidelines cover editorial and partner use. For co-marketing, reseller",
    "or campaign assets, contact the team first.",
    "",
    "Questions: " + BRAND.supportEmail,
    "",
  ].join("\n")
}

export function GET() {
  return new Response(guidelines(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": 'attachment; filename="bower-brand-guidelines.txt"',
      "cache-control": "public, max-age=3600",
    },
  })
}
