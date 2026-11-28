import { describe, expect, it } from "vitest"
import { unavailableChannel, unavailableClient } from "@/lib/supabase/client"

/**
 * Resilience.
 *
 * When the Supabase environment variables are missing, the app falls back
 * to a stand-in client. That stand-in has to cover the WHOLE client
 * surface the product uses — not just the parts that were convenient to
 * stub.
 *
 * It did not. `supabase.channel` was missing, so opening the company
 * notification bell, the presence channel or the calendar threw
 * `supabase.channel is not a function` inside a useEffect, the error
 * boundary caught it, and the whole workspace was replaced with
 * "Something went wrong". A non-essential live-update feature had taken
 * the page down.
 */
describe("the stand-in Supabase client", () => {
  it("opens a channel without throwing", () => {
    const client = unavailableClient() as any
    expect(() => client.channel("company-notifications-user-1")).not.toThrow()
  })

  it("supports the whole Realtime surface the company features use", async () => {
    const channel = unavailableChannel()

    expect(channel.on("postgres_changes", { event: "INSERT" }, () => {})).toBe(channel)
    expect(channel.on("presence", { event: "sync" }, () => {})).toBe(channel)
    expect(channel.subscribe(() => {})).toBe(channel)
    expect(channel.presenceState()).toEqual({})
    await expect(channel.unsubscribe()).resolves.toBeTypeOf("string")
    await expect(channel.track({ user_id: "u1" })).resolves.toBeTypeOf("string")
  })

  it("can remove a channel", async () => {
    const client = unavailableClient() as any
    await expect(client.removeChannel(unavailableChannel())).resolves.toBeTypeOf("string")
  })

  it("reports the failure to subscribers rather than subscribing", () => {
    let status = ""
    unavailableChannel().subscribe((s: string) => {
      status = s
    })
    // The presence provider only tracks on SUBSCRIBED, so anything else
    // correctly means "no live updates".
    expect(status).not.toBe("SUBSCRIBED")
  })

  it("still fails every query loudly", async () => {
    const client = unavailableClient() as any
    const { data, error } = await client.from("team_members").select().eq("id", "x")
    expect(data).toBeNull()
    expect(error).toBeTruthy()
  })
})
