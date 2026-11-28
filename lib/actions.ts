"use server"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { getSignupEmailRedirectTo } from "@/lib/supabase/redirects"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard"
  }
  if (/[\u0000-\u001f\u007f]/.test(value) || /^\/[a-z][a-z0-9+.-]*:/i.test(value)) {
    return "/dashboard"
  }
  return value
}

function signInErrorMessage(error: { code?: string; status?: number }) {
  if (error.code === "email_not_confirmed") {
    return "Please verify your email before signing in. Check your inbox for the confirmation link."
  }
  if (error.code === "invalid_credentials" || error.code === "invalid_grant") {
    return "Invalid email or password."
  }
  if (error.code === "over_request_rate_limit" || error.status === 429) {
    return "Too many sign-in attempts. Please wait a moment and try again."
  }
  return "We couldn’t sign you in right now. Please try again."
}

function signUpErrorMessage(error: { code?: string; status?: number }) {
  if (error.code === "weak_password") return "Please choose a stronger password."
  if (error.code === "email_address_invalid") return "Please enter a valid email address."
  if (error.code === "email_address_not_authorized") {
    return "We couldn’t send a confirmation email to that address. Please try another email or contact support."
  }
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "Too many confirmation emails were requested. Please wait a while before trying again."
  }
  if (error.code === "user_already_exists" || error.code === "email_exists") {
    return "If you already have an account, sign in. Otherwise, check your inbox for a confirmation link."
  }
  return "We couldn’t create your account right now. Please try again."
}

/** Sign in and redirect only after Supabase has saved the session cookies. */
export async function signIn(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) return { error: "Email and password are required." }
  if (!isSupabaseConfigured) return { error: "Sign-in is temporarily unavailable. Please try again shortly." }

  const destination = safeNextPath(formData.get("next"))

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) return { error: signInErrorMessage(error) }
    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut()
      return {
        error: "Please verify your email before signing in. Check your inbox for the confirmation link.",
      }
    }
  } catch (error) {
    console.error("[auth] Sign-in failed", error)
    return { error: "We couldn’t sign you in right now. Please try again." }
  }

  revalidatePath("/", "layout")
  redirect(destination)
}

/** Create an account and deliver its confirmation link through Supabase Auth. */
export async function signUp(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) return { error: "Email and password are required." }
  if (password.length < 6) return { error: "Password must be at least 6 characters." }
  if (!isSupabaseConfigured) return { error: "Sign-up is temporarily unavailable. Please try again shortly." }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getSignupEmailRedirectTo() },
    })

    if (error) {
      console.error("[auth] Sign-up rejected", { code: error.code, status: error.status })
      return { error: signUpErrorMessage(error) }
    }

    return {
      success: true,
      message: "Check your inbox for a confirmation link. Confirm your email and we’ll take you straight to your dashboard.",
    }
  } catch (error) {
    console.error("[auth] Sign-up failed", error)
    return { error: "We couldn’t create your account right now. Please try again." }
  }
}

export async function signOut() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (error) {
    console.error("Sign out error:", error)
  }
  redirect("/auth/login")
}
