/**
 * Send one real invitation email, using the real template and the real
 * transport, to an address you choose.
 *
 *   npx tsx scripts/email-test.ts you@yourdomain.com
 *
 * It loads `.env.local` automatically (see the npm script `email:test`),
 * so it uses exactly the configuration the app uses — if the test sends,
 * the app sends.
 *
 * The invitation it sends carries a random, unused token. It is not tied to
 * a real invitation row, so the link in the test message will not redeem.
 * The point is to prove the template renders and the provider accepts it.
 */
import { randomBytes } from "node:crypto"
import { sendEmail } from "@/lib/email/send"
import { invitationEmailHtml, invitationEmailText } from "@/lib/email/templates"

async function main() {
  const to = process.argv[2]?.trim()

  if (!to) {
    console.error("Usage: npx tsx scripts/email-test.ts <recipient@example.com>")
    process.exit(1)
  }

  const token = randomBytes(24).toString("base64url")
  const link = `https://bower.africa/auth/accept-invite?token=${token}`
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const result = await sendEmail({
    to,
    subject: "Brian Kiarie invited you to Acme Property Co",
    html: invitationEmailHtml({
      inviterName: "Brian Kiarie",
      companyName: "Acme Property Co",
      role: "manager",
      acceptUrl: link,
      expiresAt,
    }),
    text: invitationEmailText({
      inviterName: "Brian Kiarie",
      companyName: "Acme Property Co",
      role: "manager",
      acceptUrl: link,
      expiresAt,
    }),
  })

  console.log(JSON.stringify({ to, ...result }, null, 2))

  if (!result.delivered) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error("[email-test] failed", error)
  process.exitCode = 1
})
