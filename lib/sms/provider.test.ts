import { describe, expect, it } from "vitest"
import { buildReceiptMessage, buildReminderMessage } from "./templates"
import { sendSms, smsConfigured } from "./provider"

describe("SMS copy", () => {
  it("names the amount, due date and landlord in one reminder", () => {
    const message = buildReminderMessage({
      tenantName: "Amina Wanjiku",
      company: "Kiarie Holdings",
      amount: 35000,
      dueDate: "2026-11-05",
    })
    expect(message).toContain("Hi Amina")
    expect(message).toContain("KES 35,000")
    expect(message).toContain("5 Nov")
    expect(message).toContain("Kiarie Holdings")
    expect(message.length).toBeLessThanOrEqual(480)
  })

  it("falls back to a balance reminder when there is no due date", () => {
    const message = buildReminderMessage({ tenantName: "Peter Mwangi", company: "Acme", amount: 12000 })
    expect(message).toContain("balance")
    expect(message).toContain("KES 12,000")
  })

  it("includes the reference in a receipt message", () => {
    expect(buildReceiptMessage({ tenantName: "Grace Njeri", amount: 30000, reference: "QJG8K4XMPD" }))
      .toContain("QJG8K4XMPD")
  })
})

describe("SMS provider", () => {
  it("reports not configured when credentials are absent", () => {
    const username = process.env.AFRICASTALKING_USERNAME
    const key = process.env.AFRICASTALKING_API_KEY
    delete process.env.AFRICASTALKING_USERNAME
    delete process.env.AFRICASTALKING_API_KEY
    expect(smsConfigured()).toBe(false)
    if (username) process.env.AFRICASTALKING_USERNAME = username
    if (key) process.env.AFRICASTALKING_API_KEY = key
  })

  it("never pretends to send without a provider", async () => {
    const username = process.env.AFRICASTALKING_USERNAME
    const key = process.env.AFRICASTALKING_API_KEY
    delete process.env.AFRICASTALKING_USERNAME
    delete process.env.AFRICASTALKING_API_KEY
    const result = await sendSms({ to: "254712345678", message: "Test reminder" })
    expect(result).toMatchObject({ ok: false, skipped: true, provider: "none" })
    if (username) process.env.AFRICASTALKING_USERNAME = username
    if (key) process.env.AFRICASTALKING_API_KEY = key
  })
})
