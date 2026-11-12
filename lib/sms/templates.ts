/**
 * SMS copy. Short, specific and free of links: a rent reminder that does not
 * fit one text and does not name the amount is not useful.
 */

export function buildReminderMessage(input: {
  tenantName: string
  company: string
  amount: number
  dueDate?: string | null
  currency?: string
}): string {
  const firstName = input.tenantName.split(" ")[0] || "there"
  const currency = input.currency || "KES"
  const amount = Math.round(input.amount).toLocaleString("en-KE")
  const due = input.dueDate
    ? new Date(`${input.dueDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : null

  return due
    ? `Hi ${firstName}, your rent of ${currency} ${amount} is due ${due}. Please pay by M-Pesa to ${input.company}. - Bower`
    : `Hi ${firstName}, your rent balance is ${currency} ${amount}. Please pay by M-Pesa to ${input.company}. - Bower`
}

export function buildReceiptMessage(input: {
  tenantName: string
  amount: number
  reference?: string | null
  currency?: string
}): string {
  const firstName = input.tenantName.split(" ")[0] || "there"
  const currency = input.currency || "KES"
  const amount = Math.round(input.amount).toLocaleString("en-KE")
  return `Hi ${firstName}, payment of ${currency} ${amount} received${input.reference ? ` (${input.reference})` : ""}. Thank you. - Bower`
}
