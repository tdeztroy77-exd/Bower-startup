/**
 * SMS provider.
 *
 * Africa's Talking is the standard gateway in Kenya. When credentials are not
 * set, `sendSms` refuses and the caller records the message as skipped — the
 * product must never claim a text was sent when no provider exists.
 */

export type SmsResult = {
  ok: boolean
  provider: string
  ref?: string
  error?: string
  skipped?: boolean
}

export function smsConfigured(): boolean {
  return Boolean(process.env.AFRICASTALKING_USERNAME && process.env.AFRICASTALKING_API_KEY)
}

export function smsProviderName(): string {
  return smsConfigured() ? "africastalking" : "none"
}

export async function sendSms(input: { to: string; message: string }): Promise<SmsResult> {
  const username = process.env.AFRICASTALKING_USERNAME
  const apiKey = process.env.AFRICASTALKING_API_KEY
  const sender = process.env.SMS_SENDER_ID

  if (!username || !apiKey) {
    return { ok: false, provider: "none", skipped: true, error: "SMS provider is not configured" }
  }
  if (!/^\+?\d{10,15}$/.test(input.to)) {
    return { ok: false, provider: "africastalking", error: "Invalid phone number" }
  }

  const body = new URLSearchParams({
    username,
    to: input.to.startsWith("+") ? input.to : `+${input.to}`,
    message: input.message.slice(0, 480),
  })
  if (sender) body.set("from", sender)

  try {
    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey,
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(12_000),
    })
    const payload = (await response.json().catch(() => ({}))) as any
    const recipient = payload?.SMSMessageData?.Recipients?.[0]
    if (!response.ok || recipient?.status !== "Success") {
      return {
        ok: false,
        provider: "africastalking",
        error: recipient?.status || `Gateway returned ${response.status}`,
      }
    }
    return { ok: true, provider: "africastalking", ref: recipient.messageId || recipient.message_id }
  } catch (error) {
    return {
      ok: false,
      provider: "africastalking",
      error: error instanceof Error ? error.message : "SMS gateway failed",
    }
  }
}
