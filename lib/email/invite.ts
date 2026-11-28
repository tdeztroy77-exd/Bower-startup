import { inviteUrl } from "@/lib/company/invitations"
import { sendEmail, isEmailConfigured } from "./send"
import { invitationEmailHtml, invitationEmailText } from "./templates"

/**
 * The company invitation email.
 *
 * The template is in `templates.ts`; the transport is in `send.ts`.
 *
 * When no mail transport is configured (RESEND_API_KEY missing), the
 * message is not sent and the reason is returned to the caller, which
 * logs it. The raw token appears ONLY in that server log — never in an
 * API response, and never in an email that was actually delivered.
 */
export interface SendInviteEmailInput {
  to: string
  companyName: string
  inviterName: string
  /** Raw invitation token. Only ever used to build the link. */
  token: string
  role?: string
  expiresAt: string | Date
  /** Absolute origin the link should point at. */
  origin?: string
}

export interface SendInviteEmailResult {
  ok: boolean
  /** True only when the provider confirmed delivery. */
  delivered: boolean
  reason?: string
}

/**
 * Send (or, with no transport, record) a company invitation.
 *
 * Never throws: a failed invitation email must not roll back the
 * invitation row that was just created — the admin can always re-send.
 */
export async function sendInviteEmail(
  input: SendInviteEmailInput,
): Promise<SendInviteEmailResult> {
  const origin = input.origin ?? "https://bower-startup.vercel.app"
  const link = inviteUrl(origin, input.token)
  const expiresAt = new Date(input.expiresAt)
  const role = input.role ?? "agent"

  if (!isEmailConfigured()) {
    // No transport. The link goes to the server log so a developer can
    // complete the flow during testing.
    console.log(
      `[email/invite] to=${input.to} company=${input.companyName} inviter=${input.inviterName} role=${role}` +
        `\n[email/invite] invite link: ${link}`,
    )

    return {
      ok: true,
      delivered: false,
      reason:
        "No mail transport is configured — set RESEND_API_KEY to send invitations for real. The invite link is on the server log.",
    }
  }

  const result = await sendEmail({
    to: input.to,
    subject: `${input.inviterName} invited you to ${input.companyName}`,
    html: invitationEmailHtml({
      inviterName: input.inviterName,
      companyName: input.companyName,
      role,
      acceptUrl: link,
      expiresAt,
    }),
    text: invitationEmailText({
      inviterName: input.inviterName,
      companyName: input.companyName,
      role,
      acceptUrl: link,
      expiresAt,
    }),
  })

  if (!result.delivered) {
    // The transport was configured but the message did not go out — an
    // unverified sender domain, a quota wall, a provider outage. The
    // invitation still exists and can still be redeemed, so the link goes
    // to the log rather than being lost. An admin can send it by hand.
    console.error("[email/invite] could not send the invitation", result.reason)
    console.log(
      `[email/invite] to=${input.to} company=${input.companyName} inviter=${input.inviterName} role=${role}` +
        `\n[email/invite] invite link: ${link}`,
    )
  }

  return { ok: result.ok, delivered: result.delivered, reason: result.reason }
}
