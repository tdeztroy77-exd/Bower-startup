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

import { GET as listEvents, POST as createEvent } from "@/app/api/company/events/route"
import {
  PATCH as patchEvent,
  DELETE as deleteEvent,
} from "@/app/api/company/events/[eventId]/route"

/**
 * The team calendar rules: who may add an entry, who may change one,
 * and what makes an entry invalid.
 */

const COMPANY_ID = "company-a"
const ADMIN_ID = "admin-a"
const AGENT_ID = "agent-a"
const OTHER_AGENT_ID = "agent-b"
const VIEWER_ID = "viewer-a"

function seed(): FakeState {
  const now = new Date().toISOString()
  const soon = new Date(Date.now() + 3_600_000).toISOString()
  const later = new Date(Date.now() + 7_200_000).toISOString()

  const state = createFakeState(
    {
      companies: [
        {
          id: COMPANY_ID,
          owner_id: "owner-a",
          name: "Acme Property Co",
          slug: "acme",
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
          id: "member-owner",
          company_id: COMPANY_ID,
          user_id: "owner-a",
          name: "Owner A",
          email: "owner@acme.com",
          role: "admin",
          status: "active",
          invited_at: now,
          accepted_at: now,
        },
        {
          id: "member-admin",
          company_id: COMPANY_ID,
          user_id: ADMIN_ID,
          name: "Admin A",
          email: "admin@acme.com",
          role: "admin",
          status: "active",
          invited_at: now,
          accepted_at: now,
        },
        {
          id: "member-agent",
          company_id: COMPANY_ID,
          user_id: AGENT_ID,
          name: "Agent A",
          email: "agent@acme.com",
          role: "agent",
          status: "active",
          invited_at: now,
          accepted_at: now,
        },
        {
          id: "member-other-agent",
          company_id: COMPANY_ID,
          user_id: OTHER_AGENT_ID,
          name: "Agent B",
          email: "agent-b@acme.com",
          role: "agent",
          status: "active",
          invited_at: now,
          accepted_at: now,
        },
        {
          id: "member-viewer",
          company_id: COMPANY_ID,
          user_id: VIEWER_ID,
          name: "Viewer A",
          email: "viewer@acme.com",
          role: "viewer",
          status: "active",
          invited_at: now,
          accepted_at: now,
        },
      ],
      company_events: [
        {
          id: "event-agent",
          company_id: COMPANY_ID,
          title: "Viewing at Kileleshi",
          description: null,
          starts_at: soon,
          ends_at: later,
          type: "viewing",
          property_id: null,
          location: "Kileleshi",
          created_by: AGENT_ID,
          created_by_name: "Agent A",
          visibility: "company",
          created_at: now,
          updated_at: now,
        },
        {
          id: "event-other",
          company_id: COMPANY_ID,
          title: "Inspection",
          description: null,
          starts_at: soon,
          ends_at: later,
          type: "inspection",
          property_id: null,
          location: null,
          created_by: OTHER_AGENT_ID,
          created_by_name: "Agent B",
          visibility: "company",
          created_at: now,
          updated_at: now,
        },
      ],
      company_invitations: [],
      notifications: [],
      user_profiles: [],
    },
    { id: AGENT_ID, email: "agent@acme.com" },
    [{ id: AGENT_ID, email: "agent@acme.com" }],
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

function signInAs(id: string, email: string) {
  stateRef.current.user = { id, email }
}

describe("company events", () => {
  beforeEach(() => seed())

  it("lets an agent add an event", async () => {
    const starts = new Date(Date.now() + 3_600_000).toISOString()
    const ends = new Date(Date.now() + 7_200_000).toISOString()

    const response = await call(
      createEvent as any,
      request("/api/company/events", "POST", {
        title: "Landlord meeting",
        starts_at: starts,
        ends_at: ends,
        type: "meeting",
      }),
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.event.title).toBe("Landlord meeting")
    expect(body.event.created_by).toBe(AGENT_ID)
  })

  it("refuses a viewer", async () => {
    signInAs(VIEWER_ID, "viewer@acme.com")

    const starts = new Date(Date.now() + 3_600_000).toISOString()
    const ends = new Date(Date.now() + 7_200_000).toISOString()

    const response = await call(
      createEvent as any,
      request("/api/company/events", "POST", {
        title: "Sneaky",
        starts_at: starts,
        ends_at: ends,
        type: "meeting",
      }),
    )

    expect(response.status).toBe(403)
  })

  it("refuses an event that ends before it starts", async () => {
    const starts = new Date(Date.now() + 7_200_000).toISOString()
    const ends = new Date(Date.now() + 3_600_000).toISOString()

    const response = await call(
      createEvent as any,
      request("/api/company/events", "POST", {
        title: "Backwards",
        starts_at: starts,
        ends_at: ends,
        type: "meeting",
      }),
    )

    expect(response.status).toBe(400)
  })

  it("refuses an event with no title", async () => {
    const starts = new Date(Date.now() + 3_600_000).toISOString()
    const ends = new Date(Date.now() + 7_200_000).toISOString()

    const response = await call(
      createEvent as any,
      request("/api/company/events", "POST", {
        title: "   ",
        starts_at: starts,
        ends_at: ends,
        type: "meeting",
      }),
    )

    expect(response.status).toBe(400)
  })

  it("lets an agent edit their own event", async () => {
    const response = await call(
      patchEvent as any,
      request("/api/company/events/event-agent", "PATCH", { title: "Viewing at Kileleshi 2" }),
      { eventId: "event-agent" },
    )

    expect(response.status).toBe(200)
    expect(stateRef.current.tables.company_events.find((e: any) => e.id === "event-agent").title).toBe(
      "Viewing at Kileleshi 2",
    )
  })

  it("does not let an agent edit somebody else's event", async () => {
    const response = await call(
      patchEvent as any,
      request("/api/company/events/event-other", "PATCH", { title: "Hijacked" }),
      { eventId: "event-other" },
    )

    expect(response.status).toBe(403)
    expect(
      stateRef.current.tables.company_events.find((e: any) => e.id === "event-other").title,
    ).toBe("Inspection")
  })

  it("lets an admin edit anybody's event", async () => {
    signInAs(ADMIN_ID, "admin@acme.com")

    const response = await call(
      patchEvent as any,
      request("/api/company/events/event-other", "PATCH", { title: "Rescheduled inspection" }),
      { eventId: "event-other" },
    )

    expect(response.status).toBe(200)
    expect(
      stateRef.current.tables.company_events.find((e: any) => e.id === "event-other").title,
    ).toBe("Rescheduled inspection")
  })

  it("does not let an agent delete somebody else's event", async () => {
    const response = await call(
      deleteEvent as any,
      request("/api/company/events/event-other", "DELETE"),
      { eventId: "event-other" },
    )

    expect(response.status).toBe(403)
    expect(stateRef.current.tables.company_events).toHaveLength(2)
  })

  it("lets an agent delete their own event", async () => {
    const response = await call(
      deleteEvent as any,
      request("/api/company/events/event-agent", "DELETE"),
      { eventId: "event-agent" },
    )

    expect(response.status).toBe(200)
    expect(stateRef.current.tables.company_events).toHaveLength(1)
  })

  it("lists events in time order", async () => {
    const response = await call(listEvents as any, request("/api/company/events"))
    expect(response.status).toBe(200)

    const body = await response.json()
    const starts = body.events.map((e: any) => new Date(e.starts_at).getTime())
    expect([...starts].sort((a: number, b: number) => a - b)).toEqual(starts)
  })
})
