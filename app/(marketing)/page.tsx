import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  CircleDollarSign,
  FileText,
  GitMerge,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react"
import { PLANS, TRIAL_DAYS, formatPrice } from "@/lib/pricing"
import { CheckList, CtaBand, FaqList, FeatureCard, MetricStrip, Pill, Section, SectionHeader } from "@/components/marketing/blocks"
import {
  DashboardPreview,
  MaintenancePreview,
  MpesaPromptPreview,
  ReconciliationPreview,
} from "@/components/marketing/product-preview"

const workflowHighlights = [
  {
    icon: Wallet,
    title: "Rent in, automatically",
    body: "Tenants pay your paybill or receive an STK prompt. Every payment lands against the right tenancy — no spreadsheet, no reconciliation evening.",
    href: "/features/rent-collection",
  },
  {
    icon: GitMerge,
    title: "Reconciled, not guessed",
    body: "Unmatched payments sit in one review queue with the receipt, amount and payer. Match once and the ledger, tenant record and report agree.",
    href: "/features/paybill-integration",
  },
  {
    icon: Wrench,
    title: "Work orders that close",
    body: "Requests, priorities, contractors and completion dates on the same record — so the next owner of the problem knows exactly where it stands.",
    href: "/features/maintenance",
  },
]

const catalogue = [
  { icon: Building2, name: "Properties & units", body: "Every building, unit and status in one register.", href: "/features/multi-property" },
  { icon: Users, name: "Tenants & leases", body: "Contact, lease dates and history per tenancy.", href: "/features/tenant-records" },
  { icon: CircleDollarSign, name: "Payments & expenses", body: "Rent, costs and net position by month.", href: "/features/expenses" },
  { icon: Wrench, name: "Maintenance", body: "Requests, priorities and completion tracking.", href: "/features/maintenance" },
  { icon: FileText, name: "Documents", body: "Leases, IDs and certificates with expiry alerts.", href: "/features/documents" },
  { icon: BarChart3, name: "Reports", body: "Owner-ready performance and arrears views.", href: "/features/reports" },
  { icon: ShieldCheck, name: "Reconciliation", body: "Every movement matched to a tenant.", href: "/features/paybill-integration" },
  { icon: Wallet, name: "Billing", body: "One plan, one invoice, no per-unit maths.", href: "/pricing" },
]

export default function MarketingHome() {
  const plan = PLANS[0]

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/70">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-70" aria-hidden="true" />
        <div className="container-x relative pb-14 pt-12 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
            <div className="bower-rise">
              <Pill>Bower — property operations</Pill>
              <h1 className="mt-6 max-w-[15ch] text-[46px] font-medium leading-[0.98] tracking-[-0.03em] text-foreground sm:text-[60px] lg:text-[68px]">
                A quieter way to run rentals.
              </h1>
              <p className="mt-6 max-w-[520px] text-[15.5px] leading-7 text-muted-foreground sm:text-[16.5px]">
                Rent, tenants, leases and reporting in one calm workspace. Your tenants pay the way
                they already do; you get the whole picture, without the noise.
              </p>
              <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
                <Link
                  href="/auth/sign-up"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Start your {TRIAL_DAYS}-day trial
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-[13.5px] font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  See the price
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted-foreground">
                {["No credit card", "Unlimited units", "Cancel anytime"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="size-3.5 text-primary" strokeWidth={2.6} />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="bower-rise bower-delay-1 relative lg:justify-self-end">
              <div className="pointer-events-none absolute -inset-6 rounded-[32px] bg-secondary/50 blur-2xl" aria-hidden="true" />
              <DashboardPreview className="relative w-full max-lg:[mask-image:linear-gradient(to_right,black_78%,transparent)]" />
            </div>
          </div>
        </div>
      </section>

      {/* Facts */}
      <div className="container-x">
        <MetricStrip
          items={[
            { value: "One plan", label: "No tiers to outgrow, no feature locks" },
            { value: formatPrice(plan.price), label: "Flat per month, any portfolio size" },
            { value: `${TRIAL_DAYS} days`, label: "Full access from the first sign-in" },
            { value: "0%", label: "Of your rent taken as a transaction fee" },
          ]}
        />
      </div>

      {/* Operating picture */}
      <Section>
        <SectionHeader
          eyebrow="One workspace"
          title={
            <>
              Three things decide whether a portfolio runs well.
              <span className="text-muted-foreground"> Money, occupancy, and the queue.</span>
            </>
          }
          intro="Bower is organised around those three, not around a list of disconnected features."
          action={{ label: "Explore every feature", href: "/features" }}
        />
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {workflowHighlights.map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </Section>

      {/* Money in */}
      <Section muted bordered>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow">Money in</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[38px]">
              Rent arrives. The record updates itself.
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground">
              Tenants pay into your paybill, or get a payment prompt on their phone. Bower reads the
              transaction, matches it to the tenancy and posts the receipt — then shows you what is
              still outstanding.
            </p>
            <CheckList
              className="mt-6"
              items={[
                "Paybill and till numbers per property",
                "M-Pesa STK prompt for tenants who prefer it",
                "A single queue for payments that need a human match",
                "Arrears, receipts and net position in the same view",
              ]}
            />
            <Link
              href="/features/rent-collection"
              className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
            >
              How rent collection works <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <ReconciliationPreview />
        </div>
      </Section>

      {/* Operations */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <MaintenancePreview className="order-2 lg:order-1" />
          <div className="order-1 lg:order-2">
            <p className="eyebrow">The queue</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[38px]">
              Operations stop living in WhatsApp.
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground">
              A leaking tap, a disputed deposit, a lease that ends next month — each one becomes a record
              with an owner, a priority and a next action. Nothing depends on someone remembering.
            </p>
            <CheckList
              className="mt-6"
              items={[
                "Maintenance by priority, not by memory",
                "Lease expiry surfaced 60 days ahead",
                "Documents attached to the property and tenant",
                "Activity history you can actually audit",
              ]}
            />
            <Link
              href="/features/maintenance"
              className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
            >
              See the maintenance workflow <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </Section>

      {/* Catalogue */}
      <Section muted bordered>
        <SectionHeader
          eyebrow="The platform"
          title="Everything a landlord does weekly, in one place."
          intro="Eight workflows that share the same tenants, properties and money — so the numbers never disagree with the records."
        />
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/70 sm:grid-cols-2 lg:grid-cols-4">
          {catalogue.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="group flex flex-col bg-card p-5 transition-colors hover:bg-secondary/40"
            >
              <item.icon className="size-[18px] text-primary" strokeWidth={1.9} />
              <p className="mt-4 text-[13.5px] font-semibold text-foreground">{item.name}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{item.body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground transition-colors group-hover:text-primary">
                Details <ArrowUpRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* Tenant payment */}
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="mx-auto w-full max-w-[260px]">
            <MpesaPromptPreview />
          </div>
          <div>
            <p className="eyebrow">For your tenants</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[38px]">
              No app to install. No new habit to learn.
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground">
              Tenants pay with M-Pesa exactly as they do today. The payment prompt, receipt and balance
              update all happen without a phone call to you.
            </p>
            <ol className="mt-7 space-y-4">
              {[
                { step: "01", title: "Pay by paybill or prompt", body: "The tenant chooses what is familiar — your paybill number, or a prompt on their phone." },
                { step: "02", title: "Bower matches it", body: "The transaction is tied to the tenancy and the property it belongs to." },
                { step: "03", title: "Both sides see the same truth", body: "Receipt for the tenant, collected rent and remaining balance for you." },
              ].map((item) => (
                <li key={item.step} className="flex gap-4">
                  <span className="mt-0.5 text-[11px] font-semibold tabular text-primary">{item.step}</span>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      {/* Pricing */}
      <Section muted bordered>
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div>
            <p className="eyebrow">Pricing</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[38px]">
              One price. No percentage of your rent.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-muted-foreground">
              Start with {TRIAL_DAYS} days of full access. After that it is {formatPrice(plan.price)} a
              month — whether you manage three units or three hundred.
            </p>
            <CheckList
              className="mt-6"
              items={[
                "Unlimited units and tenants",
                "No setup fee, no per-feature paywall",
                "Cancel from the workspace at any time",
              ]}
            />
          </div>

          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {plan.name} plan
                </p>
                <p className="mt-3 text-[38px] font-semibold leading-none tracking-[-0.04em] text-foreground tabular">
                  {formatPrice(plan.price)}
                  <span className="ml-1.5 text-[13px] font-medium tracking-normal text-muted-foreground">
                    / month
                  </span>
                </p>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10.5px] font-semibold text-secondary-foreground">
                {TRIAL_DAYS}-day trial
              </span>
            </div>

            <div className="mt-6 grid gap-x-6 gap-y-2.5 border-t border-border/70 pt-6 sm:grid-cols-2">
              {plan.features.slice(0, 8).map((feature) => (
                <p key={feature} className="flex items-start gap-2 text-[12.5px] leading-5 text-muted-foreground">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={2.6} />
                  {feature}
                </p>
              ))}
            </div>

            <Link
              href="/auth/sign-up"
              className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start free <ArrowRight className="size-4" />
            </Link>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              M-Pesa or card · billed monthly · cancel anytime
            </p>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">Questions</p>
            <h2 className="mt-3 text-[28px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[34px]">
              Straight answers before you sign up.
            </h2>
            <p className="mt-4 text-[13.5px] leading-6 text-muted-foreground">
              Still deciding? <Link href="/contact" className="font-semibold text-foreground underline decoration-border underline-offset-4">Talk to a human</Link>.
            </p>
          </div>
          <FaqList
            items={[
              {
                q: "Do you take a percentage of rent?",
                a: "No. Bower is a flat monthly subscription. Standard Safaricom charges for M-Pesa transactions still apply on the paybill side, but we never take a cut of the rent itself.",
              },
              {
                q: "Can tenants pay without an app?",
                a: "Yes. Tenants pay your paybill the way they already do, or receive an M-Pesa prompt on their phone. There is nothing for them to install.",
              },
              {
                q: "What happens after the trial?",
                a: `You get ${TRIAL_DAYS} days of full access. If you choose to continue, the plan is ${formatPrice(plan.price)} per month. If you do not, your workspace simply pauses — nothing is deleted without you asking.`,
              },
              {
                q: "Can I bring my existing portfolio in?",
                a: "Yes. Properties, tenants and payments can be imported from CSV. For larger portfolios we help with the import.",
              },
            ]}
          />
        </div>
      </Section>

      <CtaBand
        title="See the whole portfolio, not just this month's rent."
        body="Start with a live workspace on your real properties. It takes a few minutes, and the first two weeks are on us."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "Book a walkthrough", href: "/contact" }}
        note={`${TRIAL_DAYS}-day trial · no credit card · cancel anytime`}
      />
    </>
  )
}
