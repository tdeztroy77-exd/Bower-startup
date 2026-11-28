import { cn } from "@/lib/utils"
import type { CompanyEventType, CompanyRole, PresenceStatus } from "@/lib/company/types"

/**
 * The company directory's visual vocabulary.
 *
 * One map, used by the member row, the member sheet, the calendar and
 * the presence dot — so a department always looks the same wherever it
 * appears.
 *
 * The colours are the app's semantic tokens (success / info / warning /
 * violet / muted), which means they are correct in both the light and
 * the dark theme. Hard-coded Tailwind palette shades would have looked
 * right on the light canvas and disappeared on the dark one.
 */

/** Department chip. */
export const DEPARTMENT_TONE: Record<string, string> = {
  lettings: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
  finance: "bg-sky-500/12 text-sky-800 dark:text-sky-300",
  maintenance: "bg-amber-500/14 text-amber-800 dark:text-amber-300",
  admin: "bg-violet-500/12 text-violet-800 dark:text-violet-300",
}

/** The dot that sits inside a department chip. */
export const DEPARTMENT_DOT: Record<string, string> = {
  lettings: "bg-emerald-500",
  finance: "bg-sky-500",
  maintenance: "bg-amber-500",
  admin: "bg-violet-500",
}

/** Calendar event chip. */
export const EVENT_TYPE_TONE: Record<CompanyEventType, string> = {
  meeting: "bg-sky-500/12 text-sky-800 dark:text-sky-300",
  viewing: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
  inspection: "bg-amber-500/14 text-amber-800 dark:text-amber-300",
  holiday: "bg-violet-500/12 text-violet-800 dark:text-violet-300",
  focus: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
}

/** The coloured rail down the side of a calendar row. */
export const EVENT_TYPE_RAIL: Record<CompanyEventType, string> = {
  meeting: "bg-sky-500",
  viewing: "bg-emerald-500",
  inspection: "bg-amber-500",
  holiday: "bg-violet-500",
  focus: "bg-slate-400",
}

/** Presence dot. */
export const PRESENCE_TONE: Record<PresenceStatus, string> = {
  online: "bg-live",
  away: "bg-warning",
  offline: "bg-muted-foreground/40",
}

/** The coloured rail down the side of a directory row. */
export const PRESENCE_RAIL: Record<PresenceStatus, string> = {
  online: "rail-live",
  away: "bg-warning/70",
  offline: "bg-transparent",
}

export const ROLE_LABEL: Record<CompanyRole, string> = {
  admin: "Admin",
  manager: "Manager",
  agent: "Agent",
  accountant: "Accountant",
  viewer: "Viewer",
}

export const EVENT_TYPE_LABEL: Record<CompanyEventType, string> = {
  meeting: "Meeting",
  viewing: "Viewing",
  inspection: "Inspection",
  holiday: "Holiday",
  focus: "Focus",
}

/** Chip class for a department, with a neutral fallback. */
export function departmentTone(department?: string | null): string {
  if (!department) return "bg-muted text-muted-foreground"
  return DEPARTMENT_TONE[department.toLowerCase()] ?? "bg-muted text-muted-foreground"
}

/** The dot colour that goes with a department chip. */
export function departmentDot(department?: string | null): string {
  if (!department) return "bg-muted-foreground/50"
  return DEPARTMENT_DOT[department.toLowerCase()] ?? "bg-muted-foreground/50"
}

/** Chip class for a calendar event type. */
export function eventTypeTone(type: string): string {
  return EVENT_TYPE_TONE[type as CompanyEventType] ?? EVENT_TYPE_TONE.meeting
}

/** Human label for a role. */
export function roleLabel(role: string): string {
  return ROLE_LABEL[role as CompanyRole] ?? role
}

/** Human label for an event type. */
export function eventTypeLabel(type: string): string {
  return EVENT_TYPE_LABEL[type as CompanyEventType] ?? type
}

/**
 * Two-letter initials for an avatar fallback.
 *
 * "Ada Wanjiku Kamau" → "AK", "Bower" → "BO", "" → "?" — the first and
 * last word, which reads better than the first two words.
 */
export function initials(name?: string | null): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * A deterministic tint for a member without a photo.
 *
 * The same person always gets the same colour, so the directory stays
 * recognisable between sessions — which is the whole point of a
 * Slack-style avatar. The seed is the member's user id, so a rename
 * does not change their colour.
 *
 * In the light theme the fill is solid and the text is the near-black
 * end of the same hue: a tinted wash over cream reads as pastel, and a
 * directory of pastel circles reads as a list of placeholders. In the
 * dark theme a solid fill would shout, so the fill becomes a glow of
 * the same hue with light text on it.
 *
 * The hues are ordered so that neighbours contrast — two people who
 * happen to land on neighbouring slots get opposite colours rather than
 * two shades of the same one, which is what a random palette does.
 */
const AVATAR_TINTS = [
  "bg-emerald-500 text-emerald-950 dark:bg-emerald-500/30 dark:text-emerald-200",
  "bg-rose-500 text-rose-950 dark:bg-rose-500/30 dark:text-rose-200",
  "bg-sky-500 text-sky-950 dark:bg-sky-500/30 dark:text-sky-200",
  "bg-amber-500 text-amber-950 dark:bg-amber-500/30 dark:text-amber-200",
  "bg-violet-500 text-violet-950 dark:bg-violet-500/30 dark:text-violet-200",
  "bg-teal-500 text-teal-950 dark:bg-teal-500/30 dark:text-teal-200",
  "bg-orange-500 text-orange-950 dark:bg-orange-500/30 dark:text-orange-200",
  "bg-slate-600 text-slate-950 dark:bg-slate-500/30 dark:text-slate-200",
  "bg-lime-500 text-lime-950 dark:bg-lime-500/30 dark:text-lime-200",
  "bg-cyan-500 text-cyan-950 dark:bg-cyan-500/30 dark:text-cyan-200",
  "bg-fuchsia-500 text-fuchsia-950 dark:bg-fuchsia-500/30 dark:text-fuchsia-200",
  "bg-indigo-500 text-indigo-950 dark:bg-indigo-500/30 dark:text-indigo-200",
]

export function avatarTint(seed?: string | null): string {
  const key = seed ?? ""
  if (!key) return AVATAR_TINTS[AVATAR_TINTS.length - 1]

  // FNV-1a, then one avalanche step. A plain `hash * 31` accumulator only
  // spreads the name across the low bits of the hash, which meant the last
  // character decided the colour — two people whose names ended in the same
  // letter ended up with the same avatar, and a directory of five people
  // came out as two blues and two pinks.
  let hash = 2166136261
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  hash = (hash ^ (hash >>> 15)) >>> 0

  return AVATAR_TINTS[hash % AVATAR_TINTS.length]
}

/** Compact relative time — "now", "4m", "2h", "3d", then a date. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never"
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return "never"

  const diff = Date.now() - then
  if (diff < 0) return "just now"
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

/** A short, human calendar label: "10:00", "1h 30m". */
export function durationLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return ""
  const minutes = Math.round((end - start) / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

/** Merge class names, exported so components can compose a chip cleanly. */
export { cn }
