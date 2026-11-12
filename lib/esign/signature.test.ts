import { describe, expect, it } from "vitest"
import JSZip from "jszip"
import { renderTemplate } from "@/lib/templates/templates"
import {
  appendSignatureCertificate,
  createSignToken,
  hashSignToken,
  isSignTokenActive,
  sha256,
} from "./signature"

describe("signature tokens", () => {
  it("stores a hash and expires", () => {
    const token = createSignToken()
    expect(token.hash).toBe(hashSignToken(token.raw))
    expect(token.hash).toHaveLength(64)
    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it("rejects void and expired requests", () => {
    const now = new Date("2026-11-10T00:00:00Z")
    expect(isSignTokenActive({ expires_at: "2026-11-20T00:00:00Z", status: "sent" }, now)).toBe(true)
    expect(isSignTokenActive({ expires_at: "2026-11-20T00:00:00Z", status: "void" }, now)).toBe(false)
    expect(isSignTokenActive({ expires_at: "2026-11-01T00:00:00Z", status: "sent" }, now)).toBe(false)
  })
})

describe("signed document", () => {
  it("appends a signature certificate without breaking the docx", async () => {
    const original = await renderTemplate("receipt", {
      tenantName: "Amina Wanjiku",
      amountPaid: "35000",
      periodCovered: "November 2026",
    })
    const originalHash = sha256(original)

    const signed = await appendSignatureCertificate(original, {
      documentTitle: "Rent Receipt",
      signerName: "Amina Wanjiku",
      signerEmail: "amina@example.com",
      signedAt: "2026-11-20T10:00:00.000Z",
      ip: "203.0.113.10",
      userAgent: "Test device",
      originalHash,
    })

    expect(signed.byteLength).toBeGreaterThan(original.byteLength)

    const zip = await JSZip.loadAsync(signed)
    const documentXml = await zip.file("word/document.xml")!.async("string")
    expect(documentXml).toContain("ELECTRONIC SIGNATURE CERTIFICATE")
    expect(documentXml).toContain("Amina Wanjiku")
    expect(documentXml).toContain(originalHash)
    expect(documentXml).toContain("203.0.113.10")
    expect(documentXml).toContain("</w:body>")
  })
})
