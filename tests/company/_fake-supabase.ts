/**
 * A small in-memory stand-in for the Supabase client.
 *
 * The company routes are thin: they resolve the caller's company, filter
 * every query by `company_id`, and check a permission before they act.
 * Those two rules are exactly what the isolation tests need to prove,
 * and they live in the route code — so the tests drive the ROUTES, not a
 * re-implementation of them.
 *
 * The double implements the slice of the query builder the company
 * routes use: select / insert / update / upsert / delete, the filters,
 * ordering, ranges and the terminal single() / maybeSingle().
 *
 * It does NOT model Row Level Security — RLS is the database's job and
 * is enforced by the policies in 26-company-directory.sql. What these
 * tests prove is that the route code never asks for another company's
 * rows.
 */

export interface FakeUser {
  id: string
  email: string
}

export interface FakeState {
  tables: Record<string, any[]>
  /** Auth accounts that exist, for sign-in lookups. */
  users: FakeUser[]
  user: FakeUser | null
  /** Every query the code under test made, for assertions. */
  queries: Array<{ table: string; op: string; filters: Array<{ col: string; op: string; value: any }> }>
}

export function createFakeState(
  tables: Record<string, any[]>,
  user: FakeUser | null = null,
  users: FakeUser[] = [],
): FakeState {
  return { tables, user, users, queries: [] }
}

type Filter = { col: string; op: string; value: any }

function compare(a: any, b: any): number {
  if (a === b) return 0
  if (a === null || a === undefined) return -1
  if (b === null || b === undefined) return 1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a) < String(b) ? -1 : 1
}

function likeMatch(value: any, pattern: any): boolean {
  if (typeof value !== "string" || typeof pattern !== "string") return false
  return value.toLowerCase().includes(pattern.replace(/%/g, "").toLowerCase())
}

/** Parse a PostgREST `or=(a.op.b,c.op.d)` style filter. */
function parseOr(filter: string): Filter[] {
  return filter
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [left, right] = part.split(".")
      const col = left.replace(/^\(/, "").replace(/\)$/, "")
      const op = right?.replace(/\)$/, "")
      const value = right?.includes(".") ? right.split(".").slice(2).join(".") : undefined
      return { col, op, value } as Filter
    })
}

class FakeBuilder {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select"
  private payload: any = null
  private onConflict: string | null = null
  private filters: Filter[] = []
  private orFilter: string | null = null
  private orderCol: string | null = null
  private orderAsc = true
  private rangeFrom: number | null = null
  private rangeTo: number | null = null
  private limitN: number | null = null
  private mode: "many" | "single" | "maybeSingle" = "many"
  private head = false
  private selectedColumns: string | null = null

  constructor(
    private state: FakeState,
    private table: string,
  ) {}

  select(cols?: string, options?: { count?: string; head?: boolean }) {
    this.head = Boolean(options?.head)
    this.selectedColumns = cols ?? null
    return this
  }

  insert(payload: any) {
    this.op = "insert"
    this.payload = payload
    return this
  }

  upsert(payload: any, options?: { onConflict?: string }) {
    this.op = "upsert"
    this.payload = payload
    this.onConflict = options?.onConflict ?? null
    return this
  }

  update(payload: any) {
    this.op = "update"
    this.payload = payload
    return this
  }

  delete() {
    this.op = "delete"
    return this
  }

  eq(col: string, value: any) {
    this.filters.push({ col, op: "eq", value })
    return this
  }

  neq(col: string, value: any) {
    this.filters.push({ col, op: "neq", value })
    return this
  }

  /** PostgREST `col=in.(a,b,c)` — the value must be one of the list. */
  in(col: string, values: any[]) {
    this.filters.push({ col, op: "in", value: values })
    return this
  }

  not(col: string, operator: string, value: any) {
    this.filters.push({ col, op: `not.${operator}`, value })
    return this
  }

  ilike(col: string, value: any) {
    this.filters.push({ col, op: "ilike", value })
    return this
  }

  lt(col: string, value: any) {
    this.filters.push({ col, op: "lt", value })
    return this
  }

  lte(col: string, value: any) {
    this.filters.push({ col, op: "lte", value })
    return this
  }

  gt(col: string, value: any) {
    this.filters.push({ col, op: "gt", value })
    return this
  }

  gte(col: string, value: any) {
    this.filters.push({ col, op: "gte", value })
    return this
  }

  or(filter: string) {
    this.orFilter = filter
    return this
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.orderCol = col
    this.orderAsc = options?.ascending ?? true
    return this
  }

  range(from: number, to: number) {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  limit(count: number) {
    this.limitN = count
    return this
  }

  single() {
    this.mode = "single"
    return this.execute()
  }

  maybeSingle() {
    this.mode = "maybeSingle"
    return this.execute()
  }

  private rows(): any[] {
    return this.state.tables[this.table] ?? []
  }

  private matches(row: any): boolean {
    for (const filter of this.filters) {
      const value = row[filter.col]
      switch (filter.op) {
        case "eq":
          if (value !== filter.value) return false
          break
        case "neq":
          if (value === filter.value) return false
          break
        case "in":
          if (!Array.isArray(filter.value) || !filter.value.includes(value)) return false
          break
        case "not.is":
          // PostgREST: `not(col, "is", null)` means `col IS NOT NULL`.
          if (value === null || value === undefined) return false
          break
        case "not.is.null":
          if (value !== null && value !== undefined) return false
          break
        case "ilike":
          if (!likeMatch(value, filter.value)) return false
          break
        case "lt":
          if (!(compare(value, filter.value) < 0)) return false
          break
        case "lte":
          if (!(compare(value, filter.value) <= 0)) return false
          break
        case "gt":
          if (!(compare(value, filter.value) > 0)) return false
          break
        case "gte":
          if (!(compare(value, filter.value) >= 0)) return false
          break
      }
    }

    if (this.orFilter) {
      const clauses = parseOr(this.orFilter)
      const anyMatch = clauses.some((clause) => {
        const value = row[clause.col]
        switch (clause.op) {
          case "eq":
            return value === clause.value
          case "ilike":
            return likeMatch(value, clause.value)
          default:
            return false
        }
      })
      if (!anyMatch) return false
    }

    return true
  }

  /** PostgREST only ever returns the columns that were asked for. */
  private project(row: any): any {
    if (!this.selectedColumns) return { ...row }
    const out: any = {}
    for (const column of this.selectedColumns.split(",").map((c) => c.trim())) {
      if (column in row) out[column] = row[column]
    }
    return out
  }

  private async execute(): Promise<{ data: any; error: any }> {
    this.state.queries.push({
      table: this.table,
      op: this.op,
      filters: [...this.filters],
    })

    if (this.op === "insert" || this.op === "upsert") {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload]
      const inserted: any[] = []

      for (const row of rows) {
        if (this.op === "upsert" && this.onConflict) {
          const cols = this.onConflict.split(",").map((c) => c.trim())
          const existing = this.rows().find((candidate) =>
            cols.every((col) => candidate[col] === row[col]),
          )
          if (existing) {
            Object.assign(existing, row)
            inserted.push(existing)
            continue
          }
        }
        const created = { ...row }
        this.rows().push(created)
        inserted.push(created)
      }

      if (this.mode === "single") {
        return { data: inserted[0] ? this.project(inserted[0]) : null, error: null }
      }
      return { data: inserted.map((row) => this.project(row)), error: null }
    }

    const matched = this.rows().filter((row) => this.matches(row))

    if (this.op === "update") {
      const updated = matched.map((row) => ({ ...row, ...this.payload }))
      for (let i = 0; i < updated.length; i++) {
        const index = this.rows().indexOf(matched[i])
        this.state.tables[this.table][index] = updated[i]
      }
      if (this.mode === "single") {
        return { data: updated[0] ?? null, error: null }
      }
      return { data: updated, error: null }
    }

    if (this.op === "delete") {
      for (const row of matched) {
        const index = this.rows().indexOf(row)
        if (index >= 0) this.state.tables[this.table].splice(index, 1)
      }
      return { data: matched, error: null }
    }

    // select
    let result = matched.map((row) => this.project(row))

    if (this.orderCol) {
      const col = this.orderCol
      const asc = this.orderAsc
      result.sort((a, b) => {
        const cmp = compare(a[col], b[col])
        return asc ? cmp : -cmp
      })
    }

    if (this.rangeFrom !== null && this.rangeTo !== null) {
      result = result.slice(this.rangeFrom, this.rangeTo + 1)
    }

    if (this.limitN !== null) {
      result = result.slice(0, this.limitN)
    }

    if (this.head) {
      return { data: null, error: null, count: result.length } as any
    }

    if (this.mode === "single") {
      return { data: result[0] ?? null, error: result[0] ? null : { message: "No rows" } }
    }
    if (this.mode === "maybeSingle") {
      return { data: result[0] ?? null, error: null }
    }

    return { data: result, error: null }
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }
}

/** The fake client handed to the route handlers. */
export function createFakeSupabase(state: FakeState) {
  return {
    auth: {
      getUser: async () => ({ data: { user: state.user }, error: null }),
      signInWithPassword: async ({ email }: { email: string; password: string }) => {
        const match = state.users.find(
          (candidate) => candidate.email.toLowerCase() === email.toLowerCase(),
        )
        if (!match) {
          return {
            data: { user: null, session: null },
            error: { message: "Invalid login credentials" },
          }
        }
        state.user = match
        return { data: { user: match, session: null }, error: null }
      },
      admin: {
        getUserById: async (id: string) => {
          const known = state.users.find((candidate) => candidate.id === id)
          return {
            data: { user: known ?? { id, email: `${id}@example.com` } },
            error: null,
          }
        },
        listUsers: async () => ({ data: { users: [] }, error: null }),
        createUser: async (attributes: any) => {
          const id = `new-${attributes.email}`
          const created = { id, email: attributes.email }
          state.users.push(created)
          state.user = created
          return { data: { user: created }, error: null }
        },
      },
    },
    from(table: string) {
      return new FakeBuilder(state, table)
    },
    rpc(name: string, args: any) {
      state.queries.push({ table: `rpc:${name}`, op: "rpc", filters: [] })
      if (name === "accept_company_invitation") {
        const invitation = state.tables.company_invitations?.find(
          (row: any) => row.token_hash === args.p_token_hash,
        )
        if (!invitation) {
          return Promise.resolve({ data: null, error: { message: "invitation_not_found" } })
        }
        if (invitation.status !== "pending") {
          return Promise.resolve({ data: null, error: { message: "invitation_not_pending" } })
        }
        const member = {
          id: `member-${args.p_user_id}`,
          company_id: invitation.company_id,
          user_id: args.p_user_id,
          name: args.p_name ?? invitation.name,
          email: invitation.email,
          role: invitation.role,
          department: args.p_department ?? invitation.department,
          job_title: args.p_job_title ?? invitation.job_title,
          status: "active",
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        }
        state.tables.team_members.push(member)
        invitation.status = "accepted"
        invitation.accepted_at = new Date().toISOString()
        if (invitation.invited_by) {
          state.tables.notifications = state.tables.notifications ?? []
          state.tables.notifications.push({
            id: `notification-${invitation.id}`,
            company_id: invitation.company_id,
            user_id: invitation.invited_by,
            type: "invite_accepted",
            title: `${member.name} joined the company`,
            message: `${member.name} accepted your invitation.`,
            severity: "success",
            link: "/dashboard/company",
            is_read: false,
            metadata: {},
            created_at: new Date().toISOString(),
          })
        }
        return Promise.resolve({
          data: {
            company_id: invitation.company_id,
            company_name: "Acme Property Co",
            company_slug: "acme",
            member_id: member.id,
            role: invitation.role,
            member_name: member.name,
          },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    },
    channel() {
      return {
        on: () => channelStub(),
        subscribe: () => Promise.resolve("SUBSCRIBED"),
        track: async () => undefined,
        unsubscribe: async () => undefined,
      }
    },
    removeChannel: async () => undefined,
  }
}

function channelStub() {
  return {
    on: () => channelStub(),
    subscribe: () => Promise.resolve("SUBSCRIBED"),
    track: async () => undefined,
    presenceState: () => ({}),
  }
}
