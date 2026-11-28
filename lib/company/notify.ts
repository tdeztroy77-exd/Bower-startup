/**
 * The company notification writer.
 *
 * Bower already has a `notifications` table (03-notifications.sql) with
 * user_id / type / title / message / severity / link / is_read /
 * metadata. This build adds a `company_id` column to that table rather
 * than creating a second store, so every notification a person receives
 * — lease expiry or company event — lands in one feed and one bell.
 *
 * `notify()` is fire-and-forget: a failed notification must never break
 * the action that triggered it.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { CompanyNotificationType } from "./types"

export type NotificationSeverity = "info" | "warning" | "critical" | "success"

export interface NotifyInput {
  companyId: string
  userId: string
  type: CompanyNotificationType | string
  title: string
  message: string
  severity?: NotificationSeverity
  /** In-app deep link, e.g. `/dashboard/company/calendar`. */
  link?: string | null
  /** Free-form payload — stored in `metadata`. */
  payload?: Record<string, unknown>
}

/**
 * Write one notification. Never throws.
 *
 * Returns true when the row was written, false when it was not — the
 * caller can ignore the result, but tests can assert on it.
 */
export async function notify(
  supabase: SupabaseClient,
  input: NotifyInput,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("notifications").insert({
      company_id: input.companyId,
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      severity: input.severity ?? "info",
      link: input.link ?? null,
      is_read: false,
      metadata: input.payload ?? {},
    })

    if (error) {
      console.error("[notify] could not insert notification", error)
      return false
    }
    return true
  } catch (e) {
    console.error("[notify] could not insert notification", e)
    return false
  }
}

/**
 * Write the same notification to several recipients.
 *
 * One insert call for the whole batch — a new calendar event should not
 * mean one round trip per member.
 */
export async function notifyMany(
  supabase: SupabaseClient,
  recipients: Array<{ userId: string }>,
  input: Omit<NotifyInput, "userId">,
): Promise<number> {
  const userIds = [...new Set(recipients.map((r) => r.userId).filter(Boolean))]
  if (userIds.length === 0) return 0

  try {
    const { error } = await supabase.from("notifications").insert(
      userIds.map((userId) => ({
        company_id: input.companyId,
        user_id: userId,
        type: input.type,
        title: input.title,
        message: input.message,
        severity: input.severity ?? "info",
        link: input.link ?? null,
        is_read: false,
        metadata: input.payload ?? {},
      })),
    )

    if (error) {
      console.error("[notify] could not insert notifications", error)
      return 0
    }
    return userIds.length
  } catch (e) {
    console.error("[notify] could not insert notifications", e)
    return 0
  }
}
