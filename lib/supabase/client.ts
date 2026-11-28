import { createBrowserClient } from "@supabase/ssr"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

// Browser client for client components. Cookies are handled by @supabase/ssr under the hood.
export function createClient() {
  if (!isSupabaseConfigured) {
    console.error("[supabase] Missing browser environment variables")
    return unavailableClient() as any
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Singleton accessor (created fresh each time it's imported) — used in places
// that expect a named export. Prefer `createClient()` for new code.
export const supabase = createClient()

// ---- Dummy client used when env vars are missing during local dev ----
// Exported so a test can exercise the stand-in directly — this is the
// object the app falls back to, and it has to stand in for the WHOLE
// client surface, not just the parts that were convenient to stub.
export function unavailableClient() {
  const unavailable = { message: "Supabase is not configured" }
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: unavailable }),
      getSession: () => Promise.resolve({ data: { session: null }, error: unavailable }),
      signInWithPassword: () =>
        Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
      signUp: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
      signOut: () => Promise.resolve({ error: unavailable }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: null, error: unavailable }) }),
      insert: () => Promise.resolve({ data: null, error: unavailable }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: unavailable }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: unavailable }) }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
        remove: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
    channel: () => unavailableChannel(),
    removeChannel: () => Promise.resolve("ok"),
  }
}

/**
 * A Realtime channel that does nothing.
 *
 * Presence, the notification bell and the company calendar all open a
 * channel on the browser client. Without this stub, a missing environment
 * variable turned a non-essential feature into a page-crashing TypeError:
 * `supabase.channel is not a function` was thrown inside a useEffect, the
 * error boundary caught it, and the whole workspace was replaced with
 * "Something went wrong" because the bell could not subscribe.
 *
 * A channel that never subscribes is the right answer here — the feature
 * degrades to "no live updates", not to "no page".
 */
export function unavailableChannel(): any {
  const channel: any = {
    on: () => channel,
    subscribe: (callback?: (status: string) => void) => {
      callback?.("CHANNEL_ERROR")
      return channel
    },
    unsubscribe: () => Promise.resolve("ok"),
    track: () => Promise.resolve("ok"),
    untrack: () => Promise.resolve("ok"),
    presenceState: () => ({}),
    send: () => Promise.resolve("ok"),
  }
  return channel
}
