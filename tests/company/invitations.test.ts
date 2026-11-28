import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import {
  createInvitationToken,
  hashToken,
  INVITATION_TTL_DAYS,
  invitePath,
  isInvitationActive,
  normalizeEmail,
} from "@/lib/company/invitations"
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

import { GET as listInvitations, POST as createInvitation } from "@/app/api/company/invitations/route"
import { DELETE as revokeInvitation } from "@/app/api/company/invitations/[id]/route"
import { POST as acceptInvitation } from "@/app/api/invitations/accept/route"

/* -------------------------------------------------------------------------- */

const COMPANY_ID = "company-a"
const OWNER_ID = "owner-a"
const ADMIN_ID = "admin-a"
const AGENT_ID = "agent-a"

function seed(overrides: Record<string, any> = {}) {
  const state = createFakeState(
    {
      companies: [
        {
          id: COMPANY_ID,
          owner_id: OWNER_ID,
          name: "Acme Property Co",
          slug: "acme",
          type: "agency",
          address: null,
          phone: null,
          website: null,
          logo_url: null,
          created_at: new Date().toISOString(),
        },
      ],
      team_members: [
        {
          id: "member-owner",
          company_id: COMPANY_ID,
          user_id: OWNER_ID,
          name: "Owner A",
          email: "owner@acme.com",
          role: "admin",
          status: "active",
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        },
        {
          id: "member-admin",
          company_id: COMPANY_ID,
          user_id: ADMIN_ID,
          name: "Admin A",
          email: "admin@acme.com",
          role: "admin",
          status: "active",
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        },
        {
          id: "member-agent",
          company_id: COMPANY_ID,
          user_id: AGENT_ID,
          name: "Agent A",
          email: "agent@acme.com",
          role: "agent",
          status: "active",
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        },
      ],
      company_invitations: [],
      notifications: [],
    },
    { id: ADMIN_ID, email: "admin@acme.com" },
    [{ id: ADMIN_ID, email: "admin@acme.com" }],
  )

  stateRef.current = state
  return state
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

/* -------------------------------------------------------------------------- */

describe("invitation tokens", () => {
  it("produces a 32-byte hex token and stores only its hash", () => {
    const token = createInvitationToken()
    expect(token.raw).toMatch(/^[0-9a-f]{64}$/)
    expect(token.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(token.hash).toBe(hashToken(token.raw))
    expect(token.raw).not.toBe(token.hash)
  })

  it("expires after seven days", () => {
    const now = new Date("2026-01-01T00:00:00.000Z")
    const token = createInvitationToken(now)
    const days = (token.expiresAt.getTime() - now.getTime()) / 86_400_000
    expect(days).toBe(INVITATION_TTL_DAYS)
  })

  it("is only active while pending and unexpired", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    const past = new Date(Date.now() - 86_400_000).toISOString()

    expect(isInvitationActive({ status: "pending", expires_at: future })).toBe(true)
    expect(isInvitationActive({ status: "pending", expires_at: past })).toBe(false)
    expect(isInvitationActive({ status: "accepted", expires_at: future })).toBe(false)
    expect(isInvitationActive({ status: "revoked", expires_at: future })).toBe(false)
    expect(isInvitationActive(null)).toBe(false)
  })

  it("normalises the email so the same person cannot be invited twice", () => {
    expect(normalizeEmail("  Ada@Example.COM ")).toBe("ada@example.com")
  })

  it("puts the token in the path, not the query of some other route", () => {
    expect(invitePath("abc123")).toContain("/auth/accept-invite?token=")
  })
})

describe("POST /api/company/invitations", () => {
  beforeEach(() => seed())

  it("creates a pending invitation and never returns the raw token", async () => {
    const response = await call(
      createInvitation as any,
      request("/api/company/invitations", "POST", {
        email: "New@Person.com",
        name: "New Person",
        role: "agent",
      }),
    )

    expect(response.status).toBe(201)
    const body = await response.json()

    expect(body.ok).toBe(true)
    expect(body.invitation.status).toBe("pending")
    expect(body.invitation.email).toBe("new@person.com")
    expect(body.invitation.token_hash).toBeUndefined()

    // No 64-character hex blob anywhere in the response.
    expect(JSON.stringify(body)).not.toMatch(/[0-9a-f]{64}/i)
  })

  it("does not create a team_members row for a pending invitation", async () => {
    await call(
      createInvitation as any,
      request("/api/company/invitations", "POST", { email: "new@person.com" }),
    )

    const state = stateRef.current
    expect(state.tables.team_members).toHaveLength(3)
    expect(state.tables.team_members.some((m: any) => m.email === "new@person.com")).toBe(false)
  })

  it("refuses to invite somebody who is already on the team", async () => {
    const response = await call(
      createInvitation as any,
      request("/api/company/invitations", "POST", { email: "agent@acme.com" }),
    )

    expect(response.status).toBe(409)
  })

  it("refuses a second pending invitation for the same email", async () => {
    await call(
      createInvitation as any,
      request("/api/company/invitations", "POST", { email: "new@person.com" }),
    )

    const response = await call(
      createInvitation as any,
      request("/api/company/invitations", "POST", { email: "NEW@person.com" }),
    )

    expect(response.status).toBe(409)
  })

  it("refuses a plain member", async () => {
    stateRef.current.user = { id: AGENT_ID, email: "agent@acme.com" }

    const response = await call(
      createInvitation as any,
      request("/api/company/invitations", "POST", { email: "new@person.com" }),
    )

    expect(response.status).toBe(403)
  })

  it("rejects a malformed email", async () => {
    const response = await call(
      createInvitation as any,
      request("/api/company/invitations", "POST", { email: "not-an-email" }),
    )

    expect(response.status).toBe(400)
  })
})

describe("GET /api/company/invitations", () => {
  beforeEach(() => seed())

  it("lists the pending invitations for an admin", async () => {
    await call(
      createInvitation as any,
      request("/api/company/invitations", "POST", { email: "new@person.com" }),
    )

    const response = await call(listInvitations as any, request("/api/company/invitations"))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.invitations).toHaveLength(1)
    expect(body.invitations[0].email).toBe("new@person.com")
  })

  it("refuses a plain member", async () => {
    stateRef.current.user = { id: AGENT_ID, email: "agent@acme.com" }

    const response = await call(listInvitations as any, request("/api/company/invitations"))
    expect(response.status).toBe(403)
  })
})

describe("DELETE /api/company/invitations/[id]", () => {
  beforeEach(() => seed())

  it("revokes a pending invitation", async () => {
    await call(
      createInvitation as any,
      request("/api/company/invitations", "POST", { email: "new@person.com" }),
    )

    const id = stateRef.current.tables.company_invitations[0].id

    const response = await call(
      revokeInvitation as any,
      request(`/api/company/invitations/${id}`, "DELETE"),
      { id },
    )

    expect(response.status).toBe(200)
    expect(stateRef.current.tables.company_invitations[0].status).toBe("revoked")
  })

  it("refuses a plain member", async () => {
    await call(
      createInvitation as any,
      request("/api/company/invitations", "POST", { email: "new@person.com" }),
    )
    const id = stateRef.current.tables.company_invitations[0].id

    stateRef.current.user = { id: AGENT_ID, email: "agent@acme.com" }

    const response = await call(
      revokeInvitation as any,
      request(`/api/company/invitations/${id}`, "DELETE"),
      { id },
    )

    expect(response.status).toBe(403)
  })
})

describe("POST /api/invitations/accept", () => {
  beforeEach(() => seed())

  async function makeInvitation(overrides: Record<string, any> = {}) {
    const raw = "a".repeat(64)
    const invitation = {
      id: "invitation-1",
      company_id: COMPANY_ID,
      email: "new@person.com",
      name: "New Person",
      role: "agent",
      department: null,
      job_title: null,
      invited_by: ADMIN_ID,
      invited_by_name: "Admin A",
      token_hash: hashToken(raw),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      accepted_at: null,
      revoked_at: null,
      status: "pending",
      created_at: new Date().toISOString(),
      ...overrides,
    }
    stateRef.current.tables.company_invitations.push(invitation)
    return raw
  }

  it("rejects a token that does not exist", async () => {
    stateRef.current.user = null

    const response = await call(
      acceptInvitation as any,
      request("/api/invitations/accept", "POST", {
        token: "b".repeat(64),
        name: "New Person",
        password: "supersecret1",
      }),
    )

    expect(response.status).toBe(404)
  })

  it("rejects an expired invitation", async () => {
    stateRef.current.user = null
    const raw = await makeInvitation({
      expires_at: new Date(Date.now() - 1000).toISOString(),
    })

    const response = await call(
      acceptInvitation as any,
      request("/api/invitations/accept", "POST", {
        token: raw,
        name: "New Person",
        password: "supersecret1",
      }),
    )

    expect(response.status).toBe(410)
  })

  it("rejects a revoked invitation", async () => {
    stateRef.current.user = null
    const raw = await makeInvitation({ status: "revoked" })

    const response = await call(
      acceptInvitation as any,
      request("/api/invitations/accept", "POST", {
        token: raw,
        name: "New Person",
        password: "supersecret1",
      }),
    )

    expect(response.status).toBe(410)
  })

  it("creates the membership and marks the invitation used", async () => {
    stateRef.current.user = null
    const raw = await makeInvitation()

    const response = await call(
      acceptInvitation as any,
      request("/api/invitations/accept", "POST", {
        token: raw,
        name: "New Person",
        password: "supersecret1",
      }),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)

    const state = stateRef.current
    const membership = state.tables.team_members.find(
      (m: any) => m.email === "new@person.com",
    )
    expect(membership).toBeTruthy()
    expect(membership.status).toBe("active")
    expect(membership.accepted_at).toBeTruthy()

    expect(state.tables.company_invitations[0].status).toBe("accepted")
  })

  it("cannot be used twice", async () => {
    stateRef.current.user = null
    const raw = await makeInvitation()

    const first = await call(
      acceptInvitation as any,
      request("/api/invitations/accept", "POST", {
        token: raw,
        name: "New Person",
        password: "supersecret1",
      }),
    )
    expect(first.status).toBe(200)

    const second = await call(
      acceptInvitation as any,
      request("/api/invitations/accept", "POST", {
        token: raw,
        name: "New Person",
        password: "supersecret1",
      }),
    )
    expect(second.status).toBe(409)
  })

  it("notifies the inviter that the invitation was accepted", async () => {
    const raw = await makeInvitation()
    stateRef.current.user = null

    await call(
      acceptInvitation as any,
      request("/api/invitations/accept", "POST", {
        token: raw,
        name: "New Person",
        password: "supersecret1",
      }),
    )

    const notifications = stateRef.current.tables.notifications ?? []
    expect(notifications).toHaveLength(1)
    expect(notifications[0].type).toBe("invite_accepted")
    expect(notifications[0].user_id).toBe(ADMIN_ID)
  })
})
