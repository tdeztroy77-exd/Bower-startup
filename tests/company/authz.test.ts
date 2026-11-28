import { describe, expect, it } from "vitest"
import {
  allowedActions,
  can,
  canEditEvent,
  canManageMember,
  canRemoveMember,
  isCompanyAdmin,
  PERMISSION_MATRIX,
} from "@/lib/company/permissions"
import type { CompanyMember } from "@/lib/company/types"

/**
 * The permission matrix (section 7 of the build brief).
 *
 * These rules are the difference between a team workspace and a
 * security incident, so they are asserted directly rather than being
 * implied by a route test.
 */

function member(overrides: Partial<CompanyMember> = {}): CompanyMember {
  return {
    id: "member-1",
    company_id: "company-1",
    user_id: "user-1",
    name: "Ada Kamau",
    email: "ada@example.com",
    role: "agent",
    avatar_url: null,
    department: null,
    job_title: null,
    phone: null,
    status: "active",
    last_seen_at: null,
    invited_at: null,
    accepted_at: null,
    is_owner: false,
    ...overrides,
  }
}

describe("permission matrix", () => {
  it("lets every role read the directory, the calendar and its own notifications", () => {
    for (const role of ["admin", "manager", "agent", "accountant", "viewer"] as const) {
      expect(can(role, "read_directory")).toBe(true)
      expect(can(role, "read_events")).toBe(true)
      expect(can(role, "read_presence")).toBe(true)
      expect(can(role, "read_notifications")).toBe(true)
    }
  })

  it("lets admins and managers run the team, and nobody else", () => {
    for (const action of [
      "invite_members",
      "revoke_invitation",
      "change_member",
      "remove_member",
    ] as const) {
      expect(can("admin", action)).toBe(true)
      expect(can("manager", action)).toBe(true)
      expect(can("agent", action)).toBe(false)
      expect(can("accountant", action)).toBe(false)
      expect(can("viewer", action)).toBe(false)
    }
  })

  it("lets agents add to the calendar but not accountants or viewers", () => {
    expect(can("agent", "create_event")).toBe(true)
    expect(can("agent", "edit_own_event")).toBe(true)
    expect(can("accountant", "create_event")).toBe(false)
    expect(can("viewer", "create_event")).toBe(false)
    expect(can("viewer", "edit_own_event")).toBe(false)
  })

  it("lets only admins and managers edit somebody else's event", () => {
    expect(can("admin", "edit_any_event")).toBe(true)
    expect(can("manager", "edit_any_event")).toBe(true)
    expect(can("agent", "edit_any_event")).toBe(false)
    expect(can("accountant", "edit_any_event")).toBe(false)
    expect(can("viewer", "edit_any_event")).toBe(false)
  })

  it("has no action outside the declared set", () => {
    const declared = new Set(Object.keys(PERMISSION_MATRIX))
    for (const role of ["admin", "manager", "agent", "accountant", "viewer"] as const) {
      for (const action of allowedActions(role)) {
        expect(declared.has(action)).toBe(true)
      }
    }
  })
})

describe("isCompanyAdmin", () => {
  it("counts admins and managers as administrators", () => {
    expect(isCompanyAdmin({ role: "admin" })).toBe(true)
    expect(isCompanyAdmin({ role: "manager" })).toBe(true)
    expect(isCompanyAdmin({ role: "agent" })).toBe(false)
    expect(isCompanyAdmin({ role: "accountant" })).toBe(false)
    expect(isCompanyAdmin({ role: "viewer" })).toBe(false)
    expect(isCompanyAdmin(null)).toBe(false)
  })
})

describe("canManageMember", () => {
  const admin = { user_id: "admin-user", role: "admin" as const }

  it("lets an admin change somebody else's role", () => {
    expect(canManageMember(admin, member({ user_id: "other", role: "agent" }))).toBe(true)
  })

  it("never touches the company owner", () => {
    expect(
      canManageMember(admin, member({ is_owner: true, user_id: "owner-user", role: "admin" })),
    ).toBe(false)
  })

  it("never lets an admin demote themselves", () => {
    expect(canManageMember(admin, member({ user_id: "admin-user", role: "admin" }))).toBe(false)
  })

  it("refuses a plain member", () => {
    expect(
      canManageMember({ user_id: "agent-user", role: "agent" }, member({ user_id: "other" })),
    ).toBe(false)
  })
})

describe("canRemoveMember", () => {
  const admin = { user_id: "admin-user", role: "admin" as const }

  it("lets an admin remove somebody else", () => {
    expect(canRemoveMember(admin, member({ user_id: "other" }))).toBe(true)
  })

  it("never removes the owner", () => {
    expect(canRemoveMember(admin, member({ is_owner: true, user_id: "owner-user" }))).toBe(false)
  })

  it("never lets an admin remove themselves", () => {
    expect(canRemoveMember(admin, member({ user_id: "admin-user" }))).toBe(false)
  })
})

describe("canEditEvent", () => {
  const ownEvent = { created_by: "user-1", company_id: "company-1" }
  const otherEvent = { created_by: "user-2", company_id: "company-1" }

  it("lets a member edit their own event", () => {
    expect(
      canEditEvent({ user_id: "user-1", role: "agent" }, ownEvent),
    ).toBe(true)
  })

  it("does not let a member edit somebody else's event", () => {
    expect(
      canEditEvent({ user_id: "user-1", role: "agent" }, otherEvent),
    ).toBe(false)
  })

  it("lets an admin edit anybody's event", () => {
    expect(canEditEvent({ user_id: "admin", role: "admin" }, otherEvent)).toBe(true)
  })

  it("lets the company owner edit anybody's event", () => {
    expect(
      canEditEvent(
        { user_id: "owner", role: "admin", is_owner: true },
        otherEvent,
        { isOwnerOfCompany: true },
      ),
    ).toBe(true)
  })

  it("does not let a viewer edit anything", () => {
    expect(canEditEvent({ user_id: "user-1", role: "viewer" }, ownEvent)).toBe(false)
  })
})
