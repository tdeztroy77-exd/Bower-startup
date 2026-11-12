import type { SupabaseClient } from "@supabase/supabase-js"
import { computeLateFee, DEFAULT_POLICY, type LateFeePolicy } from "./compute"

/**
 * Apply late fees for one workspace.
 *
 * Idempotent per invoice: `late_fee_charges.payment_id` is unique, so running
 * this twice in a day cannot charge twice. The fee is also written onto the
 * invoice so statements and the tenant portal show it.
 */
export async function applyLateFeesForUser(
  db: SupabaseClient,
  userId: string,
  options: { policy?: LateFeePolicy; now?: Date } = {},
): Promise<{ applied: number; total: number; skipped: number }> {
  const now = options.now ?? new Date()

  let policy = options.policy
  if (!policy) {
    const { data } = await db.from("late_fee_policies").select("*").eq("user_id", userId).maybeSingle()
    policy = data ? (data as LateFeePolicy) : DEFAULT_POLICY
  }
  if (!policy.enabled) return { applied: 0, total: 0, skipped: 0 }

  const { data: invoices } = await db
    .from("rent_payments")
    .select("id, amount, due_date, tenant_id, status, late_fee")
    .eq("user_id", userId)
    .in("status", ["pending", "late", "partial"])
    .not("due_date", "is", null)
    .lt("due_date", now.toISOString().slice(0, 10))

  if (!invoices?.length) return { applied: 0, total: 0, skipped: 0 }

  const { data: existing } = await db
    .from("late_fee_charges")
    .select("payment_id")
    .eq("user_id", userId)
    .in("payment_id", invoices.map((invoice: any) => invoice.id))
  const charged = new Set((existing || []).map((row: any) => row.payment_id))

  let applied = 0
  let total = 0
  let skipped = 0

  for (const invoice of invoices as any[]) {
    if (charged.has(invoice.id)) {
      skipped += 1
      continue
    }
    const result = computeLateFee({
      invoiceAmount: Number(invoice.amount || 0),
      dueDate: invoice.due_date,
      policy,
      now,
    })
    if (!result.applicable) {
      skipped += 1
      continue
    }

    const { error: chargeError } = await db.from("late_fee_charges").insert({
      user_id: userId,
      tenant_id: invoice.tenant_id,
      payment_id: invoice.id,
      amount: result.fee,
    })
    if (chargeError) {
      // Unique violation means another run beat us to it — not an error.
      if (chargeError.code !== "23505") {
        console.error("[late-fees] could not insert charge", chargeError.message)
      }
      continue
    }

    await db
      .from("rent_payments")
      .update({ late_fee: Number(invoice.late_fee || 0) + result.fee })
      .eq("id", invoice.id)
      .eq("user_id", userId)

    applied += 1
    total += result.fee
  }

  if (applied > 0) {
    await db.from("notifications").insert({
      user_id: userId,
      type: "late_fees_applied",
      title: "Late fees applied",
      message: `${applied} invoice${applied === 1 ? "" : "s"} passed the grace period. KES ${Math.round(total).toLocaleString("en-KE")} added.`,
      severity: "warning",
      link: "/dashboard/finances",
      metadata: { applied, total },
    })
  }

  return { applied, total: Math.round(total), skipped }
}
