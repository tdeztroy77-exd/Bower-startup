/**
 * Public site content that powers Careers, Changelog, Status and Integrations.
 *
 * Rule for this file: every claim must be true today. If something is not
 * shipped, it does not appear as "Live" — and if an integration does not
 * exist in the codebase, it is not listed at all. It is better for the site
 * to be short than to describe a product we have not built.
 */

export type OpenRole = {
  id: string
  title: string
  team: "Engineering" | "Product" | "Design" | "Operations" | "Sales"
  location: "Remote · Africa" | "Nairobi, Kenya" | "Lagos, Nigeria" | "Hybrid"
  type: "Full-time" | "Contract" | "Internship"
  excerpt: string
}

export const openRoles: OpenRole[] = []

export type ChangelogEntry = {
  version: string
  date: string
  title: string
  type: "feature" | "improvement" | "fix" | "security"
  body: string
}

export const changelog: ChangelogEntry[] = [
  {
    version: "v3.0.0",
    date: "2026-11-10",
    title: "A new workspace, rebuilt around the portfolio",
    type: "improvement",
    body:
      "The dashboard and every workspace page share one design system: white surfaces, an emerald signal colour, and a readable KPI row on every screen. The public site was rebuilt image-free, with product panels instead of stock photography.",
  },
  {
    version: "v2.7.0",
    date: "2026-11-03",
    title: "Portfolio insights in one request",
    type: "feature",
    body:
      "A single dashboard read model now returns cashflow, a six-month revenue trend, expense mix, occupancy and the open maintenance queue — so the home screen loads as one consistent picture.",
  },
  {
    version: "v2.6.2",
    date: "2026-10-28",
    title: "Billing you can read",
    type: "improvement",
    body:
      "Billing now shows the plan, renewal date, payment history and receipts on one page, with M-Pesa prompt and card payment on the same checkout. Trial state and paused state are stated plainly instead of hidden in an alert.",
  },
  {
    version: "v2.6.0",
    date: "2026-10-14",
    title: "Documents stay private",
    type: "security",
    body:
      "Tenant documents are served from a private store through short-lived signed links. A document URL can no longer be opened by anyone who happens to have it.",
  },
]

export type Integration = {
  name: string
  category: "Payments" | "Accounting" | "Communication" | "Storage" | "Productivity"
  description: string
  status: "Live" | "Beta" | "Coming soon"
  href: string
}

/**
 * Only integrations that exist in the product. M-Pesa (Daraja) drives paybill
 * collection, STK prompts and reconciliation. Stripe handles subscription card
 * payments. Nothing else is wired in yet, so nothing else is listed.
 */
export const integrations: Integration[] = [
  {
    name: "M-Pesa — Safaricom Daraja",
    category: "Payments",
    description: "Paybill collection, STK Push prompts, C2B callbacks and payment reconciliation.",
    status: "Live",
    href: "https://developer.safaricom.co.ke",
  },
  {
    name: "Stripe",
    category: "Payments",
    description: "Card payments for your Bower subscription, with receipts in billing history.",
    status: "Live",
    href: "https://stripe.com",
  },
]

export type SystemComponent = {
  key: string
  name: string
  description: string
}

export const systemComponents: SystemComponent[] = [
  { key: "marketing", name: "Marketing site", description: "Public pages and documentation." },
  { key: "auth", name: "Authentication", description: "Sign in, sign up, password reset, email verification." },
  { key: "dashboard", name: "Landlord workspace", description: "Properties, tenants, payments, expenses and reports." },
  { key: "mpesa", name: "M-Pesa collection", description: "STK Push, paybill callbacks and reconciliation." },
]

export type StatusIncident = {
  id: string
  date: string
  title: string
  status: "Resolved" | "Monitoring" | "Investigating"
  severity: "minor" | "major" | "critical"
  body: string
}

/**
 * Real incidents only. Empty until there is something that actually happened —
 * a status page with invented history is worse than no history.
 */
export const statusIncidents: StatusIncident[] = []
