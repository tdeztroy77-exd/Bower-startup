import crypto from "node:crypto"

/**
 * Tenant portal access tokens.
 *
 * The raw token is shown to the landlord once and put in the link. Only a
 * SHA-256 hash is stored, so a database reader cannot reconstruct a working
 * link. Tokens are scoped to a single tenant and expire.
 */

export const PORTAL_TOKEN_DAYS = 30

export function createPortalToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = crypto.randomBytes(32).toString("base64url")
  return {
    raw,
    hash: hashPortalToken(raw),
    expiresAt: new Date(Date.now() + PORTAL_TOKEN_DAYS * 86_400_000),
  }
}

export function hashPortalToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export function isPortalTokenActive(
  row: { expires_at: string | Date; revoked_at?: string | Date | null } | null | undefined,
  now = new Date(),
): boolean {
  if (!row) return false
  if (row.revoked_at) return false
  return new Date(row.expires_at).getTime() > now.getTime()
}

/** The public path for a raw token. */
export function portalPath(raw: string): string {
  return `/portal/${raw}`
}
