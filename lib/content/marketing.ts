/**
 * Bower marketing content: features, solutions, docs, templates,
 * roadmap, customers detail, etc. Static until we wire up a CMS.
 */

export type Feature = {
  slug: string
  name: string
  tagline: string
  summary: string
  bullets: string[]
  icon: string // lucide icon name
  image?: string
}

export const features: Feature[] = [
  {
    slug: "paybill-integration",
    name: "Paybill integration",
    tagline: "Tenants pay your paybill. You see it instantly.",
    summary:
      "Assign a dedicated Safaricom paybill or till number per property. Tenants pay with M-Pesa the way they already do — the system detects, matches and reconciles automatically.",
    bullets: [
      "Per-property paybill or till numbers",
      "Tenant matching via account reference",
      "Daraja C2B validation and confirmation callbacks",
      "Unmatched payments held for review",
      "Manual payment recording for other channels"
    ],
    icon: "Wallet",
  },
  {
    slug: "property-map-analytics",
    name: "Property map & analytics",
    tagline: "See where your portfolio is, at a glance.",
    summary:
      "Plot every property on a live map, understand which locations carry your portfolio, and move from a pin to the people, occupancy and rent behind it.",
    bullets: [
      "Live property pins by location",
      "Portfolio concentration by town and county",
      "Occupancy and rent context by area",
      "Select a property to open its location details",
      "Built for real portfolio data, not map mockups",
    ],
    icon: "MapPinned",
  },
  {
    slug: "tenant-records",
    name: "Tenant records",
    tagline: "Every tenant. Every contact. Every lease.",
    summary:
      "One searchable record per tenant — contact details, lease history, ID, deposit, payment history, maintenance tickets, photos of damage, and every document attached. No tenant login needed.",
    bullets: [
      "Unlimited tenant records per landlord",
      "Contact, ID and KYC document storage",
      "Lease history and renewal tracking",
      "Payment + maintenance timeline per tenant",
      "Bulk import from CSV",
    ],
    icon: "Users",
  },
  {
    slug: "quotations",
    name: "Quotations & approvals",
    tagline: "Record quotes and approvals on the work order.",
    summary:
      "When a maintenance issue comes up, log the quote, the contractor and the decision against the work order so the cost and approval history stay with the property.",
    bullets: [
      "Log a quote request against a work order",
      "Record the amount, contractor and date",
      "Approve or reject the quote on the record",
      "Keep the decision attached to the property"
    ],
    icon: "FileText",
  },
  {
    slug: "damages-tracking",
    name: "Damages & inspections",
    tagline: "Document condition and track repairs.",
    summary:
      "Photo-document move-in condition, log damages as they happen with date and severity, attach repair costs and resolution. Use at exit to settle deposits fairly.",
    bullets: [
      "Log damage with date, severity and status",
      "Attach photos to the record",
      "Link the damage to a property and tenant",
      "Track repair cost against the record"
    ],
    icon: "ShieldAlert",
  },
  {
    slug: "rent-collection",
    name: "Rent collection",
    tagline: "Request rent by M-Pesa and reconcile it.",
    summary:
      "M-Pesa STK Push from the tenant record, paybill collection, and a reconciliation queue for payments that cannot be matched automatically.",
    bullets: [
      "M-Pesa STK Push from the tenant record",
      "Paybill collection with automatic matching",
      "Cancelled and timed-out prompts are recorded",
      "Reconciled against the tenant ledger",
      "Receipts visible in the tenant timeline"
    ],
    icon: "Banknote",
  },
  {
    slug: "maintenance",
    name: "Maintenance workflows",
    tagline: "From issue to receipt, in one place.",
    summary:
      "Log a maintenance issue, get estimates from contractors, approve the work, attach receipts. Every step tracked and costed against the property.",
    bullets: [
      "Log requests with priority and status",
      "Record contractor name and phone",
      "Scheduled and completion dates",
      "Link work to the property and tenant",
      "Costs recorded against the property"
    ],
    icon: "Wrench",
  },
  {
    slug: "documents",
    name: "Document vault",
    tagline: "Every lease, every receipt, findable.",
    summary:
      "Encrypted document storage with OCR, expiry tracking and role-based access. Stop emailing PDFs back and forth.",
    bullets: [
      "Upload leases, IDs and certificates",
      "Private storage with short-lived signed links",
      "Expiry date and reminder window",
      "Attach to a property or tenant",
      "Searchable document list"
    ],
    icon: "FolderLock",
  },
  {
    slug: "reports",
    name: "Reports & exports",
    tagline: "Numbers your accountant will actually like.",
    summary:
      "Real-time cashflow, occupancy, arrears and yield reports. Export to PDF or CSV. Share with your accountant on a read-only link.",
    bullets: [
      "Rent collected against rent due",
      "Expenses by category and month",
      "Occupancy by property status",
      "Arrears visible per tenant",
      "JSON and CSV export of your data"
    ],
    icon: "BarChart3",
  },
  {
    slug: "expenses",
    name: "Expenses & receipts",
    tagline: "Log it once, forget about it.",
    summary:
      "Snap a photo of the receipt, set it to recur monthly, and we'll log it automatically. Recurring expenses covered: insurance, security, service charges, utilities.",
    bullets: [
      "Record one-off expenses",
      "Recurring expense templates",
      "Category and vendor per expense",
      "Attach expenses to a property",
      "Monthly rollups in finances"
    ],
    icon: "Receipt",
  },
  {
    slug: "multi-property",
    name: "Multi-property",
    tagline: "One portfolio. One view.",
    summary:
      "Manage residential, commercial, mixed and short-stay properties in the same workspace. Tag, filter and report across your entire portfolio.",
    bullets: [
      "Residential and commercial in one workspace",
      "Filter by status, type and location",
      "Portfolio-level dashboard",
      "Property-level records",
      "Import from CSV"
    ],
    icon: "Building2",
  },
  {
    slug: "contacts",
    name: "Contacts & contractors",
    tagline: "Tenants, contractors, agents, owners — all in one rolodex.",
    summary:
      "A single address book for everyone in your property world. Call, email and message from the record. Every interaction logged against the right property.",
    bullets: [
      "Tenants, contractors and vendors in one list",
      "Phone and email on the record",
      "Search across contacts",
      "Linked to properties through records"
    ],
    icon: "Contact",
  },
  {
    slug: "company-view",
    name: "Company profile",
    tagline: "Your workspace, named and configured.",
    summary:
      "A company profile and workspace settings for the account. Multi-landlord books and role-based team access are in development, not available today.",
    bullets: [
      "Company profile for the workspace",
      "Account-level settings",
      "One login per workspace"
    ],
    icon: "Briefcase",
  },
  {
    slug: "developer-api",
    name: "Public API (in development)",
    tagline: "Keys, endpoints and webhooks are being built.",
    summary:
      "The product API is private to the app today. A documented API with scoped keys and signed webhooks is in development - request early access and tell us what you need to build.",
    bullets: [
      "Scoped API keys planned",
      "Versioned REST resources planned",
      "Signed webhook delivery planned",
      "Delivery log planned",
      "OpenAPI spec planned"
    ],
    icon: "Code2",
  },
]

export type Solution = {
  slug: string
  name: string
  tagline: string
  audience: string
  summary: string
  outcomes: { label: string; value: string }[]
  image?: string
}

export const solutions: Solution[] = [
  {
    slug: "solo-landlord",
    name: "For solo landlords",
    tagline: "From one unit to ten.",
    audience: "Individual landlords managing their own properties.",
    summary:
      "You are running your properties on weekends and WhatsApp. Bower replaces the spreadsheet with one calm workspace - properties, tenants, rent and repairs in the same place.",
    outcomes: [],
  },
  {
    slug: "property-agencies",
    name: "For property agencies",
    tagline: "More than one landlord, one workspace.",
    audience: "Property managers handling a book of landlords.",
    summary:
      "Keep every landlord's portfolio separated while your team works from one login. Rent, arrears and maintenance stay attributable to the right owner and the right property.",
    outcomes: [],
  },
  {
    slug: "commercial",
    name: "For commercial landlords",
    tagline: "Offices, retail and mixed-use.",
    audience: "Owners and operators of commercial property.",
    summary:
      "Track commercial units, tenants, leases, rent and operating costs alongside residential stock. CAM apportionment and escalations are recorded as line items rather than calculated for you.",
    outcomes: [],
  },
]

export type DocCategory = {
  slug: string
  name: string
  description: string
}

export const docCategories: DocCategory[] = [
  { slug: "getting-started", name: "Getting started", description: "Set up your first portfolio in under 15 minutes." },
  { slug: "guides", name: "Guides", description: "Step-by-step playbooks for the workflows that exist." },
  { slug: "security", name: "Security", description: "How accounts are separated and data is protected." },
  { slug: "billing", name: "Billing", description: "Trial, plan, receipts and cancellation." },
]

export type DocArticle = {
  slug: string
  category: string
  title: string
  excerpt: string
  readingMinutes: number
  body: string
  updated: string
}

export const docArticles: DocArticle[] = [
  {
    slug: "quickstart",
    category: "getting-started",
    title: "Quickstart: a working workspace in 15 minutes",
    excerpt: "Create a property, add a tenant, and see rent land against the right record.",
    readingMinutes: 4,
    updated: "2026-11-10",
    body: `This walks you from a fresh account to a live property with a tenant and a recorded payment.

## Before you start

You need an account, one property, and a phone that can receive M-Pesa prompts per tenant.

## Step 1 - Create a property

Open Properties, then Add property. Fill in the name, address, rent and status. Photos and amenities are optional.

## Step 2 - Add a tenant

Open Tenants, then Add tenant. Enter their name and phone, attach the property, and set the lease dates. The tenant record is created immediately; there is no separate portal account to set up.

## Step 3 - Record or collect rent

On Finances, record a payment manually, or from the tenant record send an M-Pesa prompt. Collected payments appear on the dashboard cashflow panel and in the tenant timeline.

## Step 4 - Check the operating picture

The dashboard shows rent due against collected, outstanding rent, occupancy and open work orders. If a figure looks wrong, the source record is one click away.`,
  },
  {
    slug: "first-property",
    category: "getting-started",
    title: "Add and structure your properties",
    excerpt: "What each property field is for, and how status drives occupancy.",
    readingMinutes: 3,
    updated: "2026-11-10",
    body: `A property is the container for tenants, payments, expenses, documents and work orders.

## The fields that matter

- Name: how the property appears everywhere else in the workspace.
- Address, city and county: used by the portfolio map and reporting.
- Type: apartment, house, commercial and so on.
- Rent: the default rent used when you record a payment.
- Status: occupied, available, vacant or maintenance.

## Why status matters

Occupancy on the dashboard is calculated from property status. A property left on available while a tenant is living in it will understate occupancy and overstate vacancy, so keep it current when a tenancy starts or ends.

## Photos and documents

Property photos are optional. Documents attached to a property (leases, certificates, inspection reports) can carry an expiry date and surface an alert before they lapse.`,
  },
  {
    slug: "invite-tenant",
    category: "getting-started",
    title: "Create a tenant record and attach a lease",
    excerpt: "One record per tenancy, with the contact, lease and payment history together.",
    readingMinutes: 3,
    updated: "2026-11-10",
    body: `A tenant record holds the person, the tenancy and everything attached to it.

## Create the record

From Tenants, choose Add tenant. The essentials are full name, phone and the property they occupy. Email is optional but needed if you want to send receipts by email.

## Attach the lease

Set the lease start and end dates and the monthly rent. The lease end date drives the expiry alerts on the dashboard so a renewal does not surprise you.

## Keep it clean

- One record per tenancy, not per person. A tenant who moves between your properties gets a new record for the new lease.
- Use the notes field for context that does not belong in a formal document.
- Use the documents section for the signed lease and ID, so the record is self-contained.

## Link payments

Recorded payments and M-Pesa transactions can both be attached to the tenant. The tenant timeline then shows the complete financial history in date order.`,
  },
  {
    slug: "stk-push-flow",
    category: "guides",
    title: "How M-Pesa rent collection works",
    excerpt: "Paybill, STK push, callbacks and what happens when a payment cannot be matched.",
    readingMinutes: 5,
    updated: "2026-11-10",
    body: `Bower supports two ways for rent to arrive: a tenant pays your paybill, or you send an STK push prompt to their phone.

## Paybill collection

Each property can carry its own paybill or till number. When a tenant pays, Safaricom posts a confirmation to the app. The transaction is stored and matched to a tenant using the account reference and the amount.

## STK push

From a tenant record you can request a payment prompt. The tenant receives a prompt on their phone and enters their M-Pesa PIN there. Bower never sees or stores the PIN.

## When a payment cannot be matched

Unmatched payments wait in the reconciliation queue with the receipt, amount and payer details that Safaricom provided. Match it to a tenant and the payment, ledger and report update together.

## What to check when a prompt fails

- The phone number must be the number registered to M-Pesa.
- The tenant must have enough balance and an active SIM.
- A prompt that was cancelled or timed out can be re-sent; both outcomes are recorded on the transaction.`,
  },
  {
    slug: "bulk-import",
    category: "guides",
    title: "Import an existing portfolio from CSV",
    excerpt: "Bring properties, tenants and payments across with row validation before commit.",
    readingMinutes: 4,
    updated: "2026-11-10",
    body: `If your portfolio already lives in a spreadsheet, import it rather than retyping it.

## Prepare the file

Use the downloadable templates on the Templates page. Properties and tenants each have their own column set; keep the header row intact so the mapper can read it.

## Map the columns

The import step asks you to map your columns onto the app fields. Required fields must be mapped before the import can run. Anything unmapped is ignored rather than guessed.

## Validation

Every row is validated before it is written. Rows with a missing required value or an unreadable date are reported with their line numbers, so you can fix the file and re-run.

## After the import

Check the properties list for duplicates, then attach tenants to their properties and confirm rent amounts. Imported records behave exactly like records created by hand.`,
  },
  {
    slug: "security-model",
    category: "security",
    title: "How your data is separated and protected",
    excerpt: "Account scoping, private document storage and field-level encryption.",
    readingMinutes: 4,
    updated: "2026-11-10",
    body: `Access control is the first security control, so it is worth stating plainly how it works.

## Every record belongs to one account

Every table carries a user id, and every query is scoped to the signed-in account at the application layer. A record belonging to another workspace is not returned, even if its identifier is guessed.

## Documents are private

Uploaded documents are stored in a private bucket. The app issues a short-lived signed link when an authorised user opens a document; there is no permanent public URL to share by accident.

## Sensitive fields are encrypted

Identity and contact fields are encrypted at the field level before they are written, with dedicated blind-index columns used for equality lookups. That means a database dump does not hand over readable ID numbers.

## Limits we do not hide

We are a small team and we do not claim certifications we have not completed. If your procurement process needs a specific security questionnaire answered, ask us and we will answer it in writing.`,
  },
  {
    slug: "billing-and-trials",
    category: "billing",
    title: "Trials, plans and receipts",
    excerpt: "The trial, the single plan, and how to cancel without a conversation.",
    readingMinutes: 3,
    updated: "2026-11-10",
    body: `Billing is deliberately simple: one plan, one price, one monthly receipt.

## The trial

A new workspace starts with a 14-day trial of the full product. No card is required to start.

## The plan

After the trial the plan is KES 2,490 per month for the whole workspace. Portfolio size does not change the price, and Bower does not take a percentage of rent.

## Paying

Checkout offers an M-Pesa prompt or a card payment. Every payment appears in Billing with its status and M-Pesa receipt where one exists.

## Cancelling

Cancel at period end from the Billing page. You keep access until the period you have paid for ends, and you can export your data from Settings before it does.`,
  },
]



export type SubProcessor = {
  name: string
  purpose: string
  data: string
  region: string
  policy: string
}

export const subProcessors: SubProcessor[] = [
  { name: "Supabase", purpose: "Authentication and file storage", data: "Account email, session metadata, uploaded files", region: "Provider-managed", policy: "supabase.com/legal/privacy" },
  { name: "Neon", purpose: "Application database", data: "Workspace records", region: "Provider-managed", policy: "neon.com/privacy" },
  { name: "Vercel", purpose: "Application hosting and delivery", data: "Request logs, performance data", region: "Global edge", policy: "vercel.com/legal/privacy" },
  { name: "Safaricom (Daraja)", purpose: "M-Pesa collection and reconciliation", data: "Payer phone number, amount, account reference", region: "Kenya", policy: "safaricom.co.ke/privacy" },
  { name: "Stripe", purpose: "Subscription card payments", data: "Payment metadata handled by Stripe", region: "Provider-managed", policy: "stripe.com/privacy" },
]