/**
 * Company authorisation.
 *
 * Every company route resolves the caller's access through one of the
 * two functions below, before it touches any data:
 *
 *   requireCompanyOwner  — the caller owns the company (owner_id).
 *   requireCompanyMember — the caller owns the company OR is an active
 *                          team member of it.
 *
 * Both throw `CompanyAuthError`, which carries an HTTP status. Routes
 * translate that into a response; they never leak a raw database error
 * to the client.
 *
 * The company owner is a member of their own company but normally has
 * no `team_members` row, so the owner is synthesised into the member
 * shape here. That keeps "who is in this company" a single concept for
 * the directory, the calendar and the permission checks.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Company, CompanyMember, CompanyRole } from "./types"
import { isCompanyAdmin } from "./permissions"

export { isCompanyAdmin }

export class CompanyAuthError extends Error {
  status: number

  constructor(message: string, status = 403) {
    super(message)
    this.name = "CompanyAuthError"
    this.status = status
  }
}

export interface CompanyContext {
  company: Company
  member: CompanyMember
}

const COMPANY_COLUMNS =
  "id, owner_id, name, slug, type, address, phone, website, logo_url, created_at"

const MEMBER_COLUMNS =
  "id, company_id, user_id, name, email, role, avatar_url, department, job_title, phone, status, last_seen_at, invited_at, accepted_at"

/* ---------------------------------------------------------------------------
 * Row → shape
 * ------------------------------------------------------------------------- */

/**
 * Normalise a `team_members` row into a `CompanyMember`.
 *
 * The cast is deliberate: the repository has no generated Supabase types,
 * and the migration that adds the profile columns may not have been
 * applied yet on a partially-installed database. Unknown columns come
 * back as undefined and are normalised to null.
 */
export function toCompanyMember(row: any, company: Company): CompanyMember {
  return {
    id: String(row.id),
    company_id: String(row.company_id ?? company.id),
    user_id: row.user_id ?? null,
    name: String(row.name ?? "Unnamed"),
    email: row.email ?? null,
    role: (row.role ?? "viewer") as CompanyRole,
    avatar_url: row.avatar_url ?? null,
    department: row.department ?? null,
    job_title: row.job_title ?? null,
    phone: row.phone ?? null,
    status: (row.status ?? "active") as CompanyMember["status"],
    last_seen_at: row.last_seen_at ?? null,
    invited_at: row.invited_at ?? null,
    accepted_at: row.accepted_at ?? null,
    is_owner: false,
  }
}

/**
 * Build the synthetic member row for the company owner.
 *
 * `displayName` and `email` are best-effort: the owner's own auth record
 * is not readable through PostgREST, so the caller passes what it knows.
 */
export function toOwnerMember(
  company: Company,
  owner: { user_id: string; name?: string | null; email?: string | null },
): CompanyMember {
  return {
    id: `owner:${company.id}`,
    company_id: company.id,
    user_id: owner.user_id,
    name: owner.name?.trim() || company.name || "Owner",
    email: owner.email ?? null,
    role: "admin",
    avatar_url: null,
    department: null,
    job_title: "Owner",
    phone: null,
    status: "active",
    last_seen_at: null,
    invited_at: company.created_at,
    accepted_at: company.created_at,
    is_owner: true,
  }
}

/* ---------------------------------------------------------------------------
 * Loaders
 * ------------------------------------------------------------------------- */

export async function loadCompanyById(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("id", companyId)
    .maybeSingle()

  if (error) throw new CompanyAuthError("Could not load the company workspace", 500)
  return (data as Company) ?? null
}

export async function loadCompanyByOwner(
  supabase: SupabaseClient,
  userId: string,
): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("owner_id", userId)
    .maybeSingle()

  if (error) throw new CompanyAuthError("Could not load the company workspace", 500)
  return (data as Company) ?? null
}

export async function loadMembership(
  supabase: SupabaseClient,
  userId: string,
  companyId: string,
): Promise<CompanyMember | null> {
  const { data, error } = await supabase
    .from("team_members")
    .select(MEMBER_COLUMNS)
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle()

  if (error) throw new CompanyAuthError("Could not load your membership", 500)
  return data ? toCompanyMember(data, { id: companyId } as Company) : null
}

/* ---------------------------------------------------------------------------
 * Guards
 * ------------------------------------------------------------------------- */

/**
 * The caller must own the company.
 *
 * Throws 404 when the caller simply has no company, and 403 when the
 * company exists but is owned by somebody else.
 */
export async function requireCompanyOwner(
  supabase: SupabaseClient,
  userId: string,
): Promise<CompanyContext> {
  const company = await loadCompanyByOwner(supabase, userId)
  if (!company) {
    throw new CompanyAuthError("You do not have a company workspace yet", 404)
  }

  // The owner may also have a team_members row (they can be a member of
  // another company, or have been invited to their own). Prefer it so
  // profile fields like department are preserved.
  const membership = await loadMembership(supabase, userId, company.id)
  const member = membership
    ? { ...membership, role: "admin" as CompanyRole, is_owner: true }
    : toOwnerMember(company, { user_id: userId })

  return { company, member }
}

/**
 * The caller must belong to the company, as owner or as an active member.
 *
 * With no `companyId`, the company is resolved as: the caller's own
 * company first, then their earliest active membership. A user may
 * belong to several companies — one row per company — so the company
 * selector is passed explicitly when the caller wants a specific one.
 */
export async function requireCompanyMember(
  supabase: SupabaseClient,
  userId: string,
  companyId?: string | null,
): Promise<CompanyContext> {
  if (companyId) {
    const company = await loadCompanyById(supabase, companyId)
    if (!company) throw new CompanyAuthError("Company not found", 404)

    if (company.owner_id === userId) {
      const membership = await loadMembership(supabase, userId, company.id)
      const member = membership
        ? { ...membership, role: "admin" as CompanyRole, is_owner: true }
        : toOwnerMember(company, { user_id: userId })
      return { company, member }
    }

    const membership = await loadMembership(supabase, userId, company.id)
    if (!membership) {
      throw new CompanyAuthError("You are not a member of this company", 403)
    }
    return { company, member: membership }
  }

  // Owner first.
  const owned = await loadCompanyByOwner(supabase, userId)
  if (owned) {
    const membership = await loadMembership(supabase, userId, owned.id)
    const member = membership
      ? { ...membership, role: "admin" as CompanyRole, is_owner: true }
      : toOwnerMember(owned, { user_id: userId })
    return { company: owned, member }
  }

  // Then the caller's earliest active membership.
  const { data: rows, error } = await supabase
    .from("team_members")
    .select(MEMBER_COLUMNS)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("invited_at", { ascending: true })
    .limit(1)

  if (error) throw new CompanyAuthError("Could not load your membership", 500)
  const row = (rows as any[])?.[0]
  if (!row) {
    throw new CompanyAuthError("You are not a member of any company", 403)
  }

  const company = await loadCompanyById(supabase, row.company_id)
  if (!company) throw new CompanyAuthError("Company not found", 404)

  return { company, member: toCompanyMember(row, company) }
}

/**
 * Every company the caller can open, owner first.
 *
 * Used by the company switcher so a person who works with two agencies
 * can move between them without signing out.
 */
export async function listCompanyContexts(
  supabase: SupabaseClient,
  userId: string,
): Promise<CompanyContext[]> {
  const { data: owned, error: ownedError } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("owner_id", userId)

  if (ownedError) throw new CompanyAuthError("Could not load your companies", 500)

  const { data: memberships, error: memberError } = await supabase
    .from("team_members")
    .select(MEMBER_COLUMNS)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("invited_at", { ascending: true })

  if (memberError) throw new CompanyAuthError("Could not load your memberships", 500)

  const contexts: CompanyContext[] = []

  for (const company of (owned as Company[]) ?? []) {
    const membership = (memberships as any[] ?? []).find(
      (m) => m.company_id === company.id,
    )
    contexts.push({
      company,
      member: membership
        ? { ...toCompanyMember(membership, company), role: "admin", is_owner: true }
        : toOwnerMember(company, { user_id: userId }),
    })
  }

  for (const row of (memberships as any[]) ?? []) {
    if (contexts.some((c) => c.company.id === row.company_id)) continue
    const company = await loadCompanyById(supabase, row.company_id)
    if (!company) continue
    contexts.push({ company, member: toCompanyMember(row, company) })
  }

  return contexts
}
