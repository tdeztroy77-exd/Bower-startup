/**
 * The company directory query.
 *
 * One loader, used by BOTH `GET /api/company/members` and the server
 * page. If the two had their own copy of this query they would drift,
 * and the first visible difference would be a member who appears in the
 * list but 404s when you click them.
 *
 * The company owner is part of the team but normally has no
 * `team_members` row, so they are synthesised into the directory here
 * and always come first.
 */
import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/service"
import { toCompanyMember, toOwnerMember } from "./auth"
import type { Company, CompanyMember } from "./types"

export const MEMBER_COLUMNS =
  "id, company_id, user_id, name, email, role, avatar_url, department, job_title, phone, status, last_seen_at, invited_at, accepted_at"

export const DEFAULT_LIMIT = 100
export const MAX_LIMIT = 200

export interface DirectoryFilters {
  search?: string | null
  department?: string | null
  role?: string | null
  status?: string | null
  cursor?: number
  limit?: number
}

export interface DirectoryResult {
  members: CompanyMember[]
  next_cursor: string | null
}

/**
 * Strip characters that would break a PostgREST `or` filter.
 *
 * The search term is interpolated into `name.ilike.%term%` — a comma
 * would close the filter and inject another one, and the LIKE
 * wildcards would turn a literal search into a wildcard scan.
 */
export function sanitizeSearch(term: string): string {
  return term
    .replace(/[,()*%_'"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
}

export function normalizeFilters(filters: DirectoryFilters): Required<DirectoryFilters> {
  return {
    search: sanitizeSearch(filters.search ?? ""),
    department: (filters.department ?? "").trim().toLowerCase(),
    role: (filters.role ?? "").trim().toLowerCase(),
    status: (filters.status ?? "active").trim().toLowerCase(),
    cursor: Math.max(Number(filters.cursor ?? 0) || 0, 0),
    limit: Math.min(Math.max(Number(filters.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1), MAX_LIMIT),
  }
}

/**
 * Load the directory.
 *
 * `supabase` is the caller's own (RLS-bound) client — the RLS policy on
 * `team_members` is what guarantees a member can only ever see their
 * own company's directory.
 */
export async function loadDirectory(
  supabase: any,
  company: Company,
  filters: DirectoryFilters = {},
): Promise<DirectoryResult> {
  const { search, department, role, status, cursor, limit } = normalizeFilters(filters)

  const members: CompanyMember[] = []

  // The owner belongs to the first page only.
  const owner = await buildOwnerMember(supabase, company, cursor === 0)
  if (owner) members.push(owner)

  let query = supabase.from("team_members").select(MEMBER_COLUMNS).eq("company_id", company.id)

  if (status && status !== "all") {
    query = query.eq("status", status)
  }
  if (department) {
    query = query.eq("department", department)
  }
  if (role) {
    query = query.eq("role", role)
  }
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,job_title.ilike.%${search}%,department.ilike.%${search}%`,
    )
  }

  // Rows without a linked account are pending invitations, not members.
  query = query.not("user_id", "is", null)

  const { data, error } = await query
    .order("name", { ascending: true })
    .range(cursor, cursor + limit)

  if (error) throw error

  const rows = (data as any[]) ?? []
  const ownerUserId = owner?.user_id ?? null

  // A person's photo lives in `user_profiles` (they upload it there),
  // while the directory reads `team_members`. One extra query pulls the
  // photos across for the whole page — never one per row.
  const avatars = await loadAvatars(supabase, rows, ownerUserId)

  for (const row of rows) {
    if (ownerUserId && row.user_id === ownerUserId) continue
    const member = toCompanyMember(row, company)
    if (!member.avatar_url && row.user_id && avatars[row.user_id]) {
      member.avatar_url = avatars[row.user_id]
    }
    members.push(member)
  }

  // One more row than we asked for means there is another page.
  const hasMore = rows.length > limit
  if (hasMore) members.pop()

  return {
    members,
    next_cursor: hasMore ? String(cursor + limit) : null,
  }
}

/**
 * The profile photo for each member on the page, in one query.
 */
async function loadAvatars(
  supabase: any,
  rows: any[],
  ownerUserId: string | null,
): Promise<Record<string, string>> {
  const ids = [
    ...new Set(
      rows
        .map((row) => row.user_id)
        .filter((id: string | null): id is string => Boolean(id) && id !== ownerUserId),
    ),
  ]

  if (ids.length === 0) return {}

  const { data } = await supabase
    .from("user_profiles")
    .select("user_id, avatar_url")
    .in("user_id", ids)

  const avatars: Record<string, string> = {}
  for (const row of (data as any[]) ?? []) {
    if (row?.avatar_url) avatars[row.user_id] = row.avatar_url
  }
  return avatars
}

/**
 * Build the owner's directory row.
 *
 * The owner's email lives in auth.users, which PostgREST cannot read,
 * so it is fetched with the service client as a best effort. When it is
 * not available the row still renders — the profile sheet simply shows
 * no email.
 */
export async function buildOwnerMember(
  supabase: any,
  company: Company,
  include: boolean,
): Promise<CompanyMember | null> {
  if (!include) return null

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("user_id", company.owner_id)
    .maybeSingle()

  let email: string | null = null

  if (isServiceRoleConfigured()) {
    try {
      const service = createServiceClient()
      if (service) {
        const { data } = await service.auth.admin.getUserById(company.owner_id)
        email = (data?.user?.email as string | undefined) ?? null
      }
    } catch {
      // The service role is optional; the row is still useful without it.
    }
  }

  return toOwnerMember(company, {
    user_id: company.owner_id,
    name: (profile as any)?.full_name ?? null,
    email,
  })
}

/**
 * The departments actually in use, for the filter tabs.
 *
 * Derived from the data rather than hard-coded, so a company that never
 * uses "maintenance" is not shown an empty tab.
 */
export function departmentsOf(members: CompanyMember[]): string[] {
  const seen = new Set<string>()
  for (const member of members) {
    const department = member.department?.trim().toLowerCase()
    if (department) seen.add(department)
  }
  return [...seen].sort()
}
