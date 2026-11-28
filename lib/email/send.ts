/**
 * Transactional email delivery.
 *
 * Resend over plain `fetch` — no SDK, no new dependency, one request.
 *
 * WHY THIS IS NOT SUPABASE: Supabase Auth sends AUTH emails (signup
 * confirmations, password resets, magic links, its own invites) through
 * its SMTP. That SMTP refuses to deliver to anyone outside the project
 * team and caps the project at 2 emails per hour until you configure a
 * custom provider; with one configured it starts at 30/hour.
 *
 * A company invitation is not an auth email. The link carries a company
 * token that Supabase's own templates cannot carry, so Bower sends it
 * itself and uses Supabase Auth only for the ACCOUNT (creation, sign
 * in, session). Both halves are needed:
 *
 *   Supabase Auth  →  the account, the session, the password
 *   Resend          →  the invitation email and its branded template
 *
 * Without RESEND_API_KEY the sender is a no-op and the caller decides
 * what to do (the invite link is logged, never returned by an API).
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails"

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text: string
  /** Overrides the default From address. */
  from?: string
  replyTo?: string
}

export interface SendEmailResult {
  ok: boolean
  /** True only when the provider confirmed delivery. */
  delivered: boolean
  reason?: string
  id?: string
}

/**
 * The From address.
 *
 * `EMAIL_FROM` wins. The fallback exists so a fresh clone can send
 * something rather than crash, but a sender domain must be VERIFIED in
 * the mail provider's account — sending from an unverified domain is
 * refused. That is a setup step, not a code step; see BLOCKED.md.
 */
export function fromAddress(): string {
  const explicit = process.env.EMAIL_FROM?.trim()
  if (explicit) return explicit

  return `Bower <no-reply@bower.africa>`
}

/** Is a real transport configured? */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

/**
 * Send one email. Never throws — a failed email must not roll back the
 * action that triggered it.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()

  if (!apiKey) {
    return {
      ok: false,
      delivered: false,
      reason:
        "RESEND_API_KEY is not set — no mail transport is configured on this server.",
    }
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from ?? fromAddress(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      console.error("[email/send] provider refused the message", response.status, body.slice(0, 300))
      return {
        ok: false,
        delivered: false,
        reason: `The mail provider refused the message (${response.status}).`,
      }
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string }
    return { ok: true, delivered: true, id: data.id }
  } catch (e) {
    console.error("[email/send] could not reach the mail provider", e)
    return {
      ok: false,
      delivered: false,
      reason: "Could not reach the mail provider.",
    }
  }
}
