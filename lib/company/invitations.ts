/**
 * Company invitation tokens.
 *
 * The previous invite flow inserted a `team_members` row the moment the
 * owner typed an email — no token, no expiry, no acceptance, no revoke.
 * A membership row is now created only when an invitee redeems a valid,
 * unexpired, single-use token.
 *
 * Only the SHA-256 hash of the token is stored. A database reader must
 * not be able to reconstruct a working invite link, so the raw token is
 * shown once, in the link, and never logged or returned by an API.
 */
import crypto from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { CompanyInvitation, CompanyRole, InvitationStatus } from "./types"

/** How long an invitation stays redeemable. */
export const INVITATION_TTL_DAYS = 7

export const INVITATION_TTL_MS = INVITATION_TTL_DAYS * 86_400_000

export interface GeneratedToken {
  raw: string
  hash: string
  expiresAt: Date
}

/** 32 random bytes, hex encoded. */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/** SHA-256 hex digest of a raw token. */
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

/** A raw token plus the hash to store and the expiry to write. */
export function createInvitationToken(now = new Date()): GeneratedToken {
  const raw = generateToken()
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
  }
}

/** The public path for a raw token. */
export function invitePath(raw: string): string {
  return `/auth/accept-invite?token=${encodeURIComponent(raw)}`
}

/** The absolute link that goes into the invitation email. */
export function inviteUrl(origin: string, raw: string): string {
  const base = origin.replace(/\/+$/, "")
  return `${base}${invitePath(raw)}`
}

/**
 * Is this invitation still redeemable?
 *
 * An invitation is redeemable when it is `pending` and has not expired.
 * Expiry is evaluated against `expires_at`, so an invitation that was
 * never marked `expired` still stops working the moment it goes stale.
 */
export function isInvitationActive(
  invitation: Pick<CompanyInvitation, "status" | "expires_at"> | null | undefined,
  now = new Date(),
): boolean {
  if (!invitation) return false
  if (invitation.status !== "pending") return false
  const expiry = new Date(invitation.expires_at).getTime()
  if (!Number.isFinite(expiry)) return false
  return expiry > now.getTime()
}

/**
 * Normalise an email for storage and comparison.
 *
 * Invitations are matched on the normalised form so `Ada@Example.com`
 * and `ada@example.com` cannot both hold a pending invitation for the
 * same company.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export class InvitationError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "InvitationError"
    this.status = status
  }
}

/**
 * Resolve a raw token to a redeemable invitation.
 *
 * Throws `InvitationError` for every failure mode — unknown token,
 * already accepted, revoked, expired — and never reveals which of those
 * it was, so the endpoint cannot be used to probe for valid tokens.
 *
 * The caller passes a service-role client: RLS intentionally hides
 * pending invitations from anonymous and non-admin sessions.
 */
export async function validateInvitation(
  supabase: SupabaseClient,
  raw: string,
  now = new Date(),
): Promise<CompanyInvitation> {
  if (!raw || raw.length < 32) {
    throw new InvitationError("This invitation link is not valid", 404)
  }

  const { data, error } = await supabase
    .from("company_invitations")
    .select(
      "id, company_id, email, name, role, department, job_title, invited_by, invited_by_name, expires_at, accepted_at, revoked_at, status, created_at",
    )
    .eq("token_hash", hashToken(raw))
    .maybeSingle()

  if (error) {
    console.error("[company/invitations] lookup failed", error)
    throw new InvitationError("This invitation link is not valid", 404)
  }

  if (!data) {
    throw new InvitationError("This invitation link is not valid", 404)
  }

  const invitation = data as CompanyInvitation

  if (invitation.status === "accepted") {
    throw new InvitationError("This invitation has already been used", 409)
  }
  if (invitation.status === "revoked") {
    throw new InvitationError("This invitation was revoked", 410)
  }
  if (!isInvitationActive(invitation, now)) {
    throw new InvitationError("This invitation has expired", 410)
  }

  return invitation
}

/**
 * Mark invitations whose expiry has passed as `expired`.
 *
 * The partial unique index on (company_id, lower(email)) WHERE status =
 * 'pending' would otherwise block a fresh invitation for the same
 * address, because the stale row would still be `pending`.
 */
export async function expireStaleInvitations(
  supabase: SupabaseClient,
  companyId: string,
  now = new Date(),
): Promise<number> {
  const { data, error } = await supabase
    .from("company_invitations")
    .update({ status: "expired" })
    .eq("company_id", companyId)
    .eq("status", "pending")
    .lt("expires_at", now.toISOString())
    .select("id")

  if (error) {
    console.error("[company/invitations] could not expire stale invitations", error)
    return 0
  }
  return (data as unknown as unknown[] | null)?.length ?? 0
}

/** The status a pending invitation should move to when it is redeemed. */
export function nextInvitationStatus(
  invitation: Pick<CompanyInvitation, "status" | "expires_at">,
  now = new Date(),
): InvitationStatus {
  if (invitation.status === "accepted") return "accepted"
  if (invitation.status === "revoked") return "revoked"
  if (!isInvitationActive(invitation, now)) return "expired"
  return "accepted"
}

export const DEFAULT_INVITE_ROLE: CompanyRole = "agent"
