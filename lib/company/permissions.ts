/**
 * The company permission matrix.
 *
 * Pure functions, no I/O — the API routes, the UI and the test suite all
 * read from this one table so a rule can never drift between the server
 * and the screen.
 *
 * Roles map onto the brief's matrix as:
 *
 *   owner        → owner_id on `companies`, effective role 'admin'
 *   admin/manager→ team_members.role in ('admin', 'manager')
 *   member       → team_members.role in ('agent', 'accountant')
 *   viewer       → team_members.role = 'viewer'
 *
 * Note that `accountant` is a read-only member: it can read the
 * directory, the calendar and its own notifications, but it cannot add
 * to the team calendar and cannot manage anyone.
 */
import type { CompanyMember, CompanyRole } from "./types"

export type CompanyAction =
  | "read_directory"
  | "read_events"
  | "read_presence"
  | "read_notifications"
  | "invite_members"
  | "revoke_invitation"
  | "change_member"
  | "remove_member"
  | "create_event"
  | "edit_own_event"
  | "edit_any_event"

const ALL: Record<CompanyRole, boolean> = {
  admin: true,
  manager: true,
  agent: true,
  accountant: true,
  viewer: true,
}

const NONE: Record<CompanyRole, boolean> = {
  admin: false,
  manager: false,
  agent: false,
  accountant: false,
  viewer: false,
}

/**
 * The matrix. `admin` and `manager` are deliberately identical — a
 * manager is an admin without the ability to write the company record
 * itself, which is enforced separately by RLS.
 */
export const PERMISSION_MATRIX: Record<CompanyAction, Record<CompanyRole, boolean>> = {
  read_directory: { ...ALL },
  read_events: { ...ALL },
  read_presence: { ...ALL },
  read_notifications: { ...ALL },

  invite_members: { admin: true, manager: true, agent: false, accountant: false, viewer: false },
  revoke_invitation: { admin: true, manager: true, agent: false, accountant: false, viewer: false },
  change_member: { admin: true, manager: true, agent: false, accountant: false, viewer: false },
  remove_member: { admin: true, manager: true, agent: false, accountant: false, viewer: false },

  create_event: { admin: true, manager: true, agent: true, accountant: false, viewer: false },
  edit_own_event: { admin: true, manager: true, agent: true, accountant: false, viewer: false },
  edit_any_event: { admin: true, manager: true, agent: false, accountant: false, viewer: false },
}

/** May a member with this role perform this action? */
export function can(role: CompanyRole, action: CompanyAction): boolean {
  return PERMISSION_MATRIX[action]?.[role] ?? false
}

/** Admins and managers may administer the team. */
export function isCompanyAdmin(member: { role: CompanyRole } | null | undefined): boolean {
  if (!member) return false
  return member.role === "admin" || member.role === "manager"
}

/** The identity of whoever is making the request. */
export interface CompanyActor {
  user_id: string | null
  role: CompanyRole
  is_owner?: boolean
}

/**
 * May the actor change this member's role or department?
 *
 * No for the owner (ownership is singular and not transferable through
 * a role edit) and no for yourself — an admin cannot quietly demote
 * themselves and lock the company out of its own admin screen.
 */
export function canManageMember(actor: CompanyActor, target: CompanyMember): boolean {
  if (!can(actor.role, "change_member")) return false
  if (target.is_owner) return false
  if (target.user_id && actor.user_id && target.user_id === actor.user_id) return false
  return true
}

/**
 * May the actor remove this member?
 *
 * Same two guards as `canManageMember`: never the owner, never
 * yourself. Removal is a soft one — the row is kept with
 * status = 'removed' so the history stays intact.
 */
export function canRemoveMember(actor: CompanyActor, target: CompanyMember): boolean {
  if (!can(actor.role, "remove_member")) return false
  if (target.is_owner) return false
  if (target.user_id && actor.user_id && target.user_id === actor.user_id) return false
  return true
}

/** May the actor edit or delete this event? */
export function canEditEvent(
  actor: CompanyActor,
  event: { created_by: string | null; company_id: string },
  options: { isOwnerOfCompany?: boolean } = {},
): boolean {
  if (options.isOwnerOfCompany) return true
  if (can(actor.role, "edit_any_event")) return true
  if (!can(actor.role, "edit_own_event")) return false
  return Boolean(event.created_by) && event.created_by === actor.user_id
}

/** May the actor see this event? Private events are creator-or-admin only. */
export function canViewEvent(
  actor: CompanyActor,
  event: { created_by: string | null; visibility: string },
): boolean {
  if (event.visibility === "company") return true
  if (event.created_by && actor.user_id && event.created_by === actor.user_id) return true
  return can(actor.role, "edit_any_event")
}

/** Every action a role is allowed to take — used by the UI to hide controls. */
export function allowedActions(role: CompanyRole): CompanyAction[] {
  return (Object.keys(PERMISSION_MATRIX) as CompanyAction[]).filter((a) => can(role, a))
}

export { NONE }
