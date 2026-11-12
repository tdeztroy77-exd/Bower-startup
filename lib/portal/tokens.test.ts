import { describe, expect, it } from "vitest"
import { createPortalToken, hashPortalToken, isPortalTokenActive, portalPath } from "./tokens"
import { normaliseKenyanPhone } from "./resolve"

describe("portal tokens", () => {
  it("stores only a hash, never the raw token", () => {
    const token = createPortalToken()
    expect(token.raw).not.toBe(token.hash)
    expect(token.hash).toBe(hashPortalToken(token.raw))
    expect(token.hash).toHaveLength(64)
    expect(portalPath(token.raw)).toBe(`/portal/${token.raw}`)
  })

  it("issues a different token each time", () => {
    const first = createPortalToken()
    const second = createPortalToken()
    expect(first.raw).not.toBe(second.raw)
    expect(first.hash).not.toBe(second.hash)
  })

  it("rejects expired and revoked links", () => {
    const now = new Date("2026-11-10T12:00:00Z")
    expect(isPortalTokenActive({ expires_at: "2026-11-11T12:00:00Z" }, now)).toBe(true)
    expect(isPortalTokenActive({ expires_at: "2026-11-01T12:00:00Z" }, now)).toBe(false)
    expect(
      isPortalTokenActive({ expires_at: "2026-11-11T12:00:00Z", revoked_at: "2026-11-09T12:00:00Z" }, now),
    ).toBe(false)
    expect(isPortalTokenActive(null, now)).toBe(false)
  })
})

describe("portal phone normalisation", () => {
  it("accepts Kenyan formats and returns MSISDN form", () => {
    expect(normaliseKenyanPhone("0712 345 678")).toBe("254712345678")
    expect(normaliseKenyanPhone("+254712345678")).toBe("254712345678")
    expect(normaliseKenyanPhone("254712345678")).toBe("254712345678")
  })

  it("rejects numbers that cannot receive a prompt", () => {
    expect(normaliseKenyanPhone("")).toBeNull()
    expect(normaliseKenyanPhone("12345")).toBeNull()
    expect(normaliseKenyanPhone("0812345678")).toBeNull()
  })
})
