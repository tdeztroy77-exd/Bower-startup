/**
 * Shared shapes for the Company workspace.
 *
 * Every route, component and test imports its contracts from here so a
 * change to a response shape is a single-file change. The API envelope
 * shapes are locked: responses are bare keys, never wrapped in `data`.
 */

/** A role a member can hold inside a company. */
export type CompanyRole = "admin" | "manager" | "agent" | "accountant" | "viewer"

/** Lifecycle of a membership. Only `active` members can read the workspace. */
export type MemberStatus = "active" | "suspended" | "removed"

/** Presence of a member, from Realtime with a DB fallback. */
export type PresenceStatus = "online" | "away" | "offline"

/** The kind of entry on the team calendar. */
export type CompanyEventType = "meeting" | "viewing" | "inspection" | "holiday" | "focus"

/** Whether an event is visible to the whole company or only its creator. */
export type CompanyEventVisibility = "company" | "private"

/** Lifecycle of an invitation. Pending invites live in `company_invitations`. */
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked"

export const COMPANY_ROLES: CompanyRole[] = ["admin", "manager", "agent", "accountant", "viewer"]

export const COMPANY_EVENT_TYPES: CompanyEventType[] = [
  "meeting",
  "viewing",
  "inspection",
  "holiday",
  "focus",
]

/**
 * The departments a company can organise staff into. The values are the
 * keys used in the colour map (see components/company/tokens.ts).
 */
export const COMPANY_DEPARTMENTS = [
  "lettings",
  "finance",
  "maintenance",
  "admin",
] as const

export type CompanyDepartment = (typeof COMPANY_DEPARTMENTS)[number]

export interface Company {
  id: string
  owner_id: string
  name: string
  slug: string | null
  type: string | null
  address: string | null
  phone: string | null
  website: string | null
  logo_url: string | null
  created_at: string
}

/**
 * A row in the company directory.
 *
 * The company owner is a member of their own company but usually has no
 * `team_members` row, so the API synthesises one with `id` prefixed
 * `owner:` and `is_owner: true`.
 */
export interface CompanyMember {
  id: string
  company_id: string
  user_id: string | null
  name: string
  email: string | null
  role: CompanyRole
  avatar_url: string | null
  department: string | null
  job_title: string | null
  phone: string | null
  status: MemberStatus
  last_seen_at: string | null
  invited_at: string | null
  accepted_at: string | null
  /** True for the company owner. */
  is_owner: boolean
}

export interface CompanyInvitation {
  id: string
  company_id: string
  email: string
  name: string | null
  role: CompanyRole
  department: string | null
  job_title: string | null
  invited_by: string | null
  invited_by_name: string | null
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
  status: InvitationStatus
  created_at: string
}

export interface CompanyEvent {
  id: string
  company_id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  type: CompanyEventType
  property_id: string | null
  /** Denormalised property name so a row never needs a second query. */
  property_name?: string | null
  location: string | null
  created_by: string | null
  created_by_name: string | null
  visibility: CompanyEventVisibility
  created_at: string
  updated_at: string
}

/**
 * A notification row. It lives in the EXISTING `notifications` table,
 * extended with a `company_id` column — Bower does not run a second
 * notification store.
 */
export interface CompanyNotification {
  id: string
  company_id: string | null
  type: string
  title: string
  message: string
  severity: "info" | "warning" | "critical" | "success"
  link: string | null
  is_read: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

/* ---------------------------------------------------------------------------
 * Response envelopes — locked shapes. Never wrap these in `data`.
 * ------------------------------------------------------------------------- */

export interface MembersListResponse {
  members: CompanyMember[]
}

export interface MemberResponse {
  member: CompanyMember
}

export interface InvitationsListResponse {
  invitations: CompanyInvitation[]
}

export interface InvitationResponse {
  ok: true
  invitation: CompanyInvitation
}

export interface EventsListResponse {
  events: CompanyEvent[]
}

export interface NotificationsListResponse {
  notifications: CompanyNotification[]
  unread: number
}

export interface PresenceResponse {
  presence: Record<string, PresenceStatus>
}

/* ---------------------------------------------------------------------------
 * Notification types emitted by this build.
 * ------------------------------------------------------------------------- */

export type CompanyNotificationType =
  | "invite_accepted"
  | "invite_revoked"
  | "event_created"
  | "event_updated"
  | "event_deleted"
  | "role_changed"
  | "member_removed"
  | "member_added"
