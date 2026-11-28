import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { createFakeState, type FakeState } from "./_fake-supabase"

const { stateRef } = vi.hoisted(() => ({ stateRef: { current: null as any } }))

vi.mock("@/lib/supabase/server", async () => {
  const { createFakeSupabase } = await import("./_fake-supabase")
  return { createClient: async () => createFakeSupabase(stateRef.current) }
})

vi.mock("@/lib/supabase/service", async () => {
  const { createFakeSupabase } = await import("./_fake-supabase")
  return {
    createServiceClient: () => createFakeSupabase(stateRef.current),
    isServiceRoleConfigured: () => true,
  }
})

import { GET as listMembers } from "@/app/api/company/members/route"
import {
  GET as getMember,
  PATCH as patchMember,
  DELETE as deleteMember,
} from "@/app/api/company/members/[memberId]/route"
import { GET as listEvents } from "@/app/api/company/events/route"
import { GET as getCompany } from "@/app/api/company/route"

/**
 * Cross-tenant isolation.
 *
 * Company A's member must never see, change or delete anything that
 * belongs to Company B — not the directory, not a member, not an event.
 *
 * The route code is responsible for two things here: resolving the
 * caller's OWN company before acting, and filtering every query by that
 * company id. Row Level Security in 26-company-directory.sql is the
 * second, independent lock on the same door.
 */

const COMPANY_A = "company-a"
const COMPANY_B = "company-b"
const A_MEMBER = "user-a-agent"
const B_OWNER = "user-b-owner"
const B_MEMBER = "user-b-agent"
const STRANGER = "user-stranger"

function seed(): FakeState {
  const now = new Date().toISOString()

  const state = createFakeState(
    {
      companies: [
        {
          id: COMPANY_A,
          owner_id: "user-a-owner",
          name: "Acme Property Co",
          slug: "acme",
          type: "agency",
          address: null,
          phone: null,
          website: null,
          logo_url: null,
          created_at: now,
        },
        {
          id: COMPANY_B,
          owner_id: B_OWNER,
          name: "Globex Ltd",
          slug: "globex",
          type: "agency",
          address: null,
          phone: null,
          website: null,
          logo_url: null,
          created_at: now,
        },
      ],
      team_members: [
        {
          id: "a-owner",
          company_id: COMPANY_A,
          user_id: "user-a-owner",
          name: "Owner A",
          email: "owner@acme.com",
          role: "admin",
          status: "active",
          invited_at: now,
          accepted_at: now,
        },
        {
          id: "a-agent",
          company_id: COMPANY_A,
          user_id: A_MEMBER,
          name: "Agent A",
          email: "agent@acme.com",
          role: "agent",
          status: "active",
          invited_at: now,
          accepted_at: now,
        },
        {
          id: "b-owner",
          company_id: COMPANY_B,
          user_id: B_OWNER,
          name: "Owner B",
          email: "owner@globex.com",
          role: "admin",
          status: "active",
          invited_at: now,
          accepted_at: now,
        },
        {
          id: "b-agent",
          company_id: COMPANY_B,
          user_id: B_MEMBER,
          name: "Agent B",
          email: "agent@globex.com",
          role: "agent",
          status: "active",
          invited_at: now,
          accepted_at: now,
        },
      ],
      company_events: [
        {
          id: "event-a",
          company_id: COMPANY_A,
          title: "Acme viewing",
          description: null,
          starts_at: now,
          ends_at: now,
          type: "viewing",
          property_id: null,
          location: null,
          created_by: A_MEMBER,
          created_by_name: "Agent A",
          visibility: "company",
          created_at: now,
          updated_at: now,
        },
        {
          id: "event-b",
          company_id: COMPANY_B,
          title: "Globex inspection",
          description: null,
          starts_at: now,
          ends_at: now,
          type: "inspection",
          property_id: null,
          location: null,
          created_by: B_OWNER,
          created_by_name: "Owner B",
          visibility: "company",
          created_at: now,
          updated_at: now,
        },
      ],
      company_invitations: [],
      notifications: [],
      user_profiles: [],
    },
    { id: A_MEMBER, email: "agent@acme.com" },
    [
      { id: A_MEMBER, email: "agent@acme.com" },
      { id: "user-a-owner", email: "owner@acme.com" },
      { id: B_OWNER, email: "owner@globex.com" },
      { id: B_MEMBER, email: "agent@globex.com" },
    ],
  )

  stateRef.current = state
  return state
}

function signInAs(id: string, email: string) {
  stateRef.current.user = { id, email }
}

function request(path: string, method = "GET", body?: unknown) {
  const headers: Record<string, string> = { host: "localhost:3000" }
  if (method !== "GET") headers.origin = "http://localhost:3000"
  if (body !== undefined) headers["content-type"] = "application/json"

  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function call(
  handler: (req: any, ctx: any) => Promise<Response>,
  req: NextRequest,
  params: Record<string, string> = {},
) {
  return handler(req, { params: Promise.resolve(params) })
}

describe("cross-tenant isolation", () => {
  beforeEach(() => seed())

  it("shows Company A's member only Company A's directory", async () => {
    const response = await call(listMembers as any, request("/api/company/members"))
    expect(response.status).toBe(200)

    const body = await response.json()
    const emails = body.members.map((m: any) => m.email)

    expect(emails).toContain("agent@acme.com")
    expect(emails).toContain("owner@acme.com")
    expect(emails).not.toContain("owner@globex.com")
  })

  it("merges profile photos from user_profiles into the directory", async () => {
    stateRef.current.tables.user_profiles.push({
      user_id: A_MEMBER,
      full_name: "Agent A",
      avatar_url: "https://cdn.bower.example/avatars/agent-a.png",
    })

    const response = await call(listMembers as any, request("/api/company/members"))
    expect(response.status).toBe(200)

    const body = await response.json()
    const agent = body.members.find((m: any) => m.user_id === A_MEMBER)

    expect(agent?.avatar_url).toBe("https://cdn.bower.example/avatars/agent-a.png")
  })

  it("hides another company's member as not found", async () => {
    const response = await call(
      getMember as any,
      request("/api/company/members/b-owner"),
      { memberId: "b-owner" },
    )

    // 404, not 403 — the caller should not learn that the id exists.
    expect(response.status).toBe(404)
  })

  it("refuses to change another company's member", async () => {
    // Sign in as Company A's OWNER: an administrator of A passes the
    // permission check, so the 404 below comes from the company filter
    // and not from the role check.
    signInAs("user-a-owner", "owner@acme.com")

    const response = await call(
      patchMember as any,
      request("/api/company/members/b-owner", "PATCH", { role: "viewer" }),
      { memberId: "b-owner" },
    )

    expect(response.status).toBe(404)

    const state = stateRef.current
    expect(state.tables.team_members.find((m: any) => m.id === "b-owner").role).toBe("admin")
  })

  it("refuses to remove another company's member", async () => {
    signInAs("user-a-owner", "owner@acme.com")

    const response = await call(
      deleteMember as any,
      request("/api/company/members/b-owner", "DELETE"),
      { memberId: "b-owner" },
    )

    expect(response.status).toBe(404)
    expect(
      stateRef.current.tables.team_members.find((m: any) => m.id === "b-owner").status,
    ).toBe("active")
  })

  it("shows only Company A's events", async () => {
    const response = await call(listEvents as any, request("/api/company/events"))
    expect(response.status).toBe(200)

    const body = await response.json()
    const titles = body.events.map((e: any) => e.title)

    expect(titles).toContain("Acme viewing")
    expect(titles).not.toContain("Globex inspection")
  })

  it("keeps another company's landlords out of the workspace read", async () => {
    stateRef.current.tables.managed_landlords = [
      {
        id: "landlord-b",
        company_id: COMPANY_B,
        name: "Globex Landlord",
        units: 40,
        manager: "Owner B",
        revenue_share: 10,
        status: "active",
      },
    ]

    const response = await call(getCompany as any, request("/api/company"))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.workspace.landlords).toHaveLength(0)
  })

  it("refuses a stranger who is in no company at all", async () => {
    stateRef.current.user = { id: STRANGER, email: "nobody@example.com" }

    const response = await call(listMembers as any, request("/api/company/members"))
    expect(response.status).toBe(403)
  })

  it("resolves a member of Company B to Company B, never Company A", async () => {
    signInAs(B_MEMBER, "agent@globex.com")

    const response = await call(listMembers as any, request("/api/company/members"))
    expect(response.status).toBe(200)

    const body = await response.json()
    const emails = body.members.map((m: any) => m.email)

    expect(emails).toContain("agent@globex.com")
    expect(emails).not.toContain("agent@acme.com")
    expect(emails).not.toContain("owner@acme.com")
  })
})
