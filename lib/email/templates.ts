/**
 * Transactional email templates.
 *
 * Written for the email clients people actually use: Gmail, Outlook,
 * Apple Mail, Superhuman. That means tables rather than flexbox, inline
 * styles rather than a stylesheet, a webfont-free stack, and a plain
 * text alternative for every message.
 *
 * The look follows the product: Bower's cream canvas, the forest green
 * action colour, and the ink surface used in the app for the header.
 */

const BRAND = {
  ink: "#0c2b21",
  inkSoft: "#123b2d",
  cream: "#f7f4ec",
  card: "#ffffff",
  green: "#17624a",
  greenDark: "#0f4a37",
  text: "#151b17",
  muted: "#69736c",
  border: "#e2dccf",
  live: "#22a06b",
}

const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
const FONT_SERIF = "Georgia, 'Times New Roman', Times, serif"

/** The wordmark, drawn with text so it never depends on a blocked image. */
function wordmark(inverted = false) {
  return `<div style="font-family:${FONT_SANS};font-size:19px;font-weight:700;letter-spacing:-0.02em;color:${
    inverted ? BRAND.cream : BRAND.ink
  };line-height:1;">bower<span style="color:${BRAND.live};">.</span></div>`
}

/**
 * The invitation email.
 *
 * One column, one action, one link. The link is repeated as plain text
 * at the bottom, because some clients and some corporate mail servers
 * mangle buttons.
 */
export function invitationEmailHtml(input: {
  inviterName: string
  companyName: string
  role: string
  acceptUrl: string
  expiresAt: Date
}): string {
  const { inviterName, companyName, role, acceptUrl, expiresAt } = input
  const expiry = expiresAt.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>You have been invited to ${escapeHtml(companyName)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:${FONT_SANS};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
    `${inviterName} invited you to join ${companyName} on Bower.`,
  )}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">

          <!-- Header: the ink surface from the app -->
          <tr>
            <td style="background:linear-gradient(135deg, ${BRAND.ink} 0%, ${BRAND.inkSoft} 100%);padding:28px 32px;">
              ${wordmark(true)}
              <p style="margin:18px 0 0;font-family:${FONT_SERIF};font-size:26px;line-height:1.2;color:${BRAND.cream};letter-spacing:-0.02em;">
                ${escapeHtml(inviterName)} invited you to join ${escapeHtml(companyName)}.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.text};">
                You are joining as <strong style="font-weight:600;">${escapeHtml(role)}</strong>. You will be able to see the
                team directory, the shared calendar and everything the company looks after — all in one workspace.
              </p>

              <!-- The action -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td align="center" style="background:${BRAND.green};border-radius:10px;">
                    <a href="${escapeHtml(acceptUrl)}" style="display:inline-block;padding:13px 28px;font-size:14.5px;font-weight:600;color:#fdfbf5;text-decoration:none;border-radius:10px;">
                      Accept the invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12.5px;line-height:1.6;color:${BRAND.muted};">
                This link works once and expires on <strong style="font-weight:600;color:${BRAND.text};">${escapeHtml(expiry)}</strong>.
              </p>

              <!-- The fallback link: some clients strip buttons -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;border-top:1px solid ${BRAND.border};">
                <tr>
                  <td style="padding-top:20px;font-size:12.5px;line-height:1.7;color:${BRAND.muted};">
                    If the button does not work, paste this into your browser:<br>
                    <a href="${escapeHtml(acceptUrl)}" style="color:${BRAND.green};word-break:break-all;text-decoration:underline;">${escapeHtml(
                      acceptUrl,
                    )}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#fbf9f4;border-top:1px solid ${BRAND.border};">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.muted};">
                You are receiving this because ${escapeHtml(inviterName)} invited this address to the
                ${escapeHtml(companyName)} workspace on Bower. If you were not expecting it, you can ignore this email — nothing happens.
              </p>
              <p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:${BRAND.muted};">
                Bower — property operations for teams and agents.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** The plain-text alternative. Every email needs one. */
export function invitationEmailText(input: {
  inviterName: string
  companyName: string
  role: string
  acceptUrl: string
  expiresAt: Date
}): string {
  const { inviterName, companyName, role, acceptUrl, expiresAt } = input
  const expiry = expiresAt.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return `${inviterName} invited you to join ${companyName} on Bower.

You are joining as ${role}. You will be able to see the team directory, the shared calendar and everything the company looks after — all in one workspace.

Accept the invitation:
${acceptUrl}

This link works once and expires on ${expiry}.

You are receiving this because ${inviterName} invited this address to the ${companyName} workspace on Bower. If you were not expecting it, you can ignore this email — nothing happens.

Bower — property operations for teams and agents.`
}

/** Escape a value for an HTML attribute or text node. */
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export { BRAND }
