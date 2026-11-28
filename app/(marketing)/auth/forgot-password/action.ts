"use server"

import { createClient } from "@/lib/supabase/server"
import { getPasswordRecoveryRedirectTo } from "@/lib/supabase/redirects"

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim()
  if (!email) return

  const supabase = await createClient()
  // Always send an email — never leak whether the address exists.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordRecoveryRedirectTo(),
  })
}
