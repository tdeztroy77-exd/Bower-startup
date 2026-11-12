/**
 * Late fee maths.
 *
 * Deliberately boring: one fee per invoice, after a grace period, capped. No
 * compounding and no daily escalation. Kenyan tribunals have struck down
 * punitive late-fee terms, so the default is off and the cap is explicit.
 */

export type LateFeePolicy = {
  enabled: boolean
  grace_days: number
  fee_type: "flat" | "percent"
  amount: number
  percent: number
  cap: number
}

export const DEFAULT_POLICY: LateFeePolicy = {
  enabled: false,
  grace_days: 5,
  fee_type: "flat",
  amount: 500,
  percent: 5,
  cap: 5000,
}

export function computeLateFee(input: {
  invoiceAmount: number
  dueDate: string | Date | null | undefined
  policy: LateFeePolicy
  now?: Date
}): { applicable: boolean; daysLate: number; fee: number; reason?: string } {
  const now = input.now ?? new Date()
  const { policy } = input

  if (!policy.enabled) return { applicable: false, daysLate: 0, fee: 0, reason: "policy_disabled" }
  if (!input.dueDate) return { applicable: false, daysLate: 0, fee: 0, reason: "no_due_date" }

  const due = new Date(`${String(input.dueDate).slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(due.getTime())) return { applicable: false, daysLate: 0, fee: 0, reason: "bad_due_date" }

  const daysLate = Math.floor((now.getTime() - due.getTime()) / 86_400_000)
  if (daysLate <= policy.grace_days) {
    return { applicable: false, daysLate: Math.max(0, daysLate), fee: 0, reason: "in_grace" }
  }

  const invoiceAmount = Math.max(0, Number(input.invoiceAmount || 0))
  if (invoiceAmount <= 0) return { applicable: false, daysLate, fee: 0, reason: "no_amount" }

  const raw = policy.fee_type === "percent" ? (invoiceAmount * policy.percent) / 100 : policy.amount
  const capped = Math.min(Math.max(0, raw), Math.max(0, policy.cap))
  const fee = Math.round(capped * 100) / 100

  if (fee <= 0) return { applicable: false, daysLate, fee: 0, reason: "zero_fee" }
  return { applicable: true, daysLate, fee }
}

/** Message the tenant portal and notifications use. */
export function describeLateFee(fee: number, currency = "KES"): string {
  return `${currency} ${Math.round(fee).toLocaleString("en-KE")} late fee`
}
