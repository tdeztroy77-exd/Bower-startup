import type { Metadata } from "next"
import Link from "next/link"
import { createServiceClient } from "@/lib/supabase/service"
import { hashToken } from "@/lib/company/invitations"
import { AcceptInviteForm } from "@/components/company/accept-invite-form"
import { BrandWordmark } from "@/components/brand-mark"

export const metadata: Metadata = {
  title: "Accept your invitation — Bower",
  description: "Join your company workspace on Bower.",
  robots: { index: false, follow: false },
}

/**
 * GET /auth/accept-invite?token=…
 *
 * The token is checked on the server before anything is rendered, so an
 * expired or already-used link never shows a form that cannot work.
 *
 * The lookup uses the service client on purpose: pending invitations are
 * invisible to anonymous sessions by design, and RLS is not bypassed for
 * the browser.
 */
export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const params = await searchParams
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token

  const state = await resolveInvitation(rawToken)

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-7 sm:px-10">
      <div className="flex items-center justify-between">
        <BrandWordmark href="/" size="md" />
      </div>

      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[400px]">
          {state.kind === "valid" ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                You have been invited
              </p>
              <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-foreground">
                Join {state.companyName}
              </h1>
              <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
                {state.inviterName
                  ? `${state.inviterName} invited you to the workspace.`
                  : "You have been invited to the workspace."}{" "}
                Set up your profile to get started.
              </p>

              <AcceptInviteForm
                token={state.token}
                email={state.email}
                defaultName={state.name}
                companyName={state.companyName}
                role={state.role}
              />
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Invitation unavailable
              </p>
              <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-foreground">
                {state.title}
              </h1>
              <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
                {state.body}
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                <Link
                  href="/auth/login"
                  className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:opacity-90"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-muted/50"
                >
                  Create an account
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
        <span>© {new Date().getFullYear()} Bower</span>
        <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
        <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
      </div>
    </div>
  )
}

type InvitationState =
  | {
      kind: "valid"
      token: string
      email: string
      name: string | null
      role: string
      companyName: string
      inviterName: string | null
    }
  | { kind: "invalid"; title: string; body: string }

async function resolveInvitation(rawToken?: string | null): Promise<InvitationState> {
  const invalid = (title: string, body: string): InvitationState => ({
    kind: "invalid",
    title,
    body,
  })

  if (!rawToken || rawToken.length < 32) {
    return invalid(
      "This link is not valid",
      "The invitation link is incomplete. Ask the person who invited you to send it again.",
    )
  }

  const service = createServiceClient()
  if (!service) {
    return invalid(
      "Invitations are unavailable",
      "This server cannot process invitations right now. Please try again shortly.",
    )
  }

  const { data, error } = await service
    .from("company_invitations")
    .select(
      "id, company_id, email, name, role, status, expires_at, invited_by_name, companies(name)",
    )
    .eq("token_hash", hashToken(rawToken))
    .maybeSingle()

  if (error || !data) {
    return invalid(
      "This link is not valid",
      "We could not find that invitation. It may have been revoked, or the link may be incomplete.",
    )
  }

  if (data.status === "accepted") {
    return invalid(
      "This invitation has already been used",
      "Sign in with the account you accepted the invitation with to open the workspace.",
    )
  }

  if (data.status === "revoked") {
    return invalid(
      "This invitation was revoked",
      "Ask the person who invited you to send a new invitation.",
    )
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return invalid(
      "This invitation has expired",
      "Invitations are valid for seven days. Ask the person who invited you to send a new one.",
    )
  }

  const companyName = (data as any)?.companies?.name ?? "the company"

  return {
    kind: "valid",
    token: rawToken,
    email: data.email,
    name: data.name ?? null,
    role: data.role,
    companyName,
    inviterName: data.invited_by_name ?? null,
  }
}
