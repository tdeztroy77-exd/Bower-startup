import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit"
import { errorResponse } from "@/lib/api"
import { hashToken, normalizeEmail } from "@/lib/company/invitations"

export const runtime = "nodejs"

/**
 * POST /api/invitations/accept
 *
 * Public endpoint — the invitee does not have a Bower account yet, so
 * there is no session to check. The invitation token IS the credential:
 * a 32-byte random value, stored only as a SHA-256 hash, single-use and
 * expiring after seven days.
 *
 * Body: { token, name?, password?, department?, job_title? }
 *
 * What it does, in order:
 *   1. rate-limits the caller,
 *   2. resolves the token to a pending, unexpired invitation,
 *   3. establishes WHO is accepting — the signed-in account when it
 *      matches the invitation email, otherwise the password proves it,
 *      creating the account when it does not exist yet,
 *   4. calls `accept_company_invitation`, which creates the membership,
 *      marks the token used and notifies the inviter in ONE transaction.
 *
 * The raw token is never written to a log and never returned.
 */

const AcceptSchema = z.object({
  token: z.string().trim().min(32).max(256),
  name: z.string().trim().min(1).max(120).optional(),
  password: z.string().min(8).max(200).optional(),
  department: z.string().trim().max(80).optional(),
  job_title: z.string().trim().max(120).optional(),
})

/** Map a database error from the accept RPC to a client-facing status. */
function rpcErrorStatus(message: string): number {
  const m = message.toLowerCase()
  if (m.includes("invitation_not_found")) return 404
  if (m.includes("invitation_expired")) return 410
  if (m.includes("invitation_not_pending")) return 409
  if (m.includes("invitation_user_required")) return 400
  return 400
}

export async function POST(request: NextRequest) {
  // The token is the only credential, so this endpoint is a brute-force
  // target. 10 attempts per IP per 10 minutes.
  const limit = checkRateLimit(`invite-accept:${clientIdentifier(request)}`, 10, 10 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.resetInSeconds) } },
    )
  }

  const parsed = AcceptSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    )
  }

  const service = createServiceClient()
  if (!service) {
    return errorResponse("Invitation acceptance is not configured on this server", 503)
  }

  const tokenHash = hashToken(parsed.data.token)

  // 1. Resolve the invitation. The service client is required because
  //    pending invitations are invisible to anonymous sessions by design.
  const { data: invitation, error: lookupError } = await service
    .from("company_invitations")
    .select("id, company_id, email, name, role, department, status, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (lookupError) {
    console.error("[api/invitations/accept] lookup failed", lookupError)
    return errorResponse("Could not validate this invitation", 500)
  }

  if (!invitation) {
    return errorResponse("This invitation link is not valid", 404)
  }
  if (invitation.status === "accepted") {
    return errorResponse("This invitation has already been used", 409)
  }
  if (invitation.status === "revoked") {
    return errorResponse("This invitation was revoked", 410)
  }
  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    await service
      .from("company_invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id)
      .eq("status", "pending")
    return errorResponse("This invitation has expired", 410)
  }

  const email = normalizeEmail(invitation.email)

  // 2. Work out who is accepting.
  const userClient = await createClient()
  const {
    data: { user: sessionUser },
  } = await userClient.auth.getUser()

  let userId: string | null = null
  let createdAccount = false

  if (sessionUser && normalizeEmail(sessionUser.email ?? "") === email) {
    // Already signed in with the invited address — nothing else to prove.
    userId = sessionUser.id
  } else if (sessionUser) {
    return errorResponse(
      "You are signed in with a different account. Sign out and open this invite link again.",
      409,
    )
  } else {
    const password = parsed.data.password
    if (!password) {
      return errorResponse(
        "Enter a password to create your account, or sign in with your existing one.",
        400,
      )
    }

    // Try to sign in first: a correct password proves ownership of the
    // address AND establishes the session, with no email round trip.
    const { data: signIn, error: signInError } = await userClient.auth.signInWithPassword({
      email,
      password,
    })

    if (!signInError && signIn.user) {
      userId = signIn.user.id
    } else {
      // No such account (or the wrong password). Create one.
      const { data: created, error: createError } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: parsed.data.name || invitation.name || email.split("@")[0],
        },
      })

      if (createError) {
        const message = (createError.message || "").toLowerCase()
        if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
          return errorResponse(
            "That email already has a Bower account. Sign in with your existing password and open this invite link again.",
            409,
          )
        }
        console.error("[api/invitations/accept] could not create the account", createError)
        return errorResponse("Could not create your account", 500)
      }

      if (!created?.user) {
        return errorResponse("Could not create your account", 500)
      }

      userId = created.user.id
      createdAccount = true

      // Sign the new account in so the invitee lands in the workspace.
      const { error: newSignInError } = await userClient.auth.signInWithPassword({
        email,
        password,
      })
      if (newSignInError) {
        console.warn("[api/invitations/accept] new account needs a manual sign-in", newSignInError)
      }
    }
  }

  if (!userId) {
    return errorResponse("Could not verify your account", 400)
  }

  // 3. One transaction: membership + invitation + notification.
  const { data: accepted, error: acceptError } = await service.rpc(
    "accept_company_invitation" as any,
    {
      p_token_hash: tokenHash,
      p_user_id: userId,
      p_name: parsed.data.name ?? null,
      p_department: parsed.data.department ?? null,
      p_job_title: parsed.data.job_title ?? null,
    } as any,
  )

  if (acceptError) {
    const status = rpcErrorStatus(acceptError.message || "")
    console.error("[api/invitations/accept] accept failed", acceptError.message)
    return errorResponse(
      status === 404
        ? "This invitation link is not valid"
        : status === 410
          ? "This invitation has expired"
          : status === 409
            ? "This invitation has already been used"
            : "Could not accept this invitation",
      status,
    )
  }

  const result = (accepted as any) ?? {}

  return NextResponse.json({
    ok: true,
    company_slug: result.company_slug ?? null,
    company_name: result.company_name ?? null,
    member_name: result.member_name ?? null,
    role: result.role ?? null,
    created_account: createdAccount,
  })
}
