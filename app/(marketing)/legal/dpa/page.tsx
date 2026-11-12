import type { Metadata } from "next"
import Link from "next/link"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: "Data Processing Agreement — Bower",
  description:
    "Bower's Data Processing Agreement for Agency and enterprise customers.",
}

export default function DPAPage() {
  return (
    <div>
      <section className="border-b border-border/70">
        <div className="container-x pb-10 pt-14 sm:pt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Legal</p>
          <h1 className="mt-5 text-[36px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[46px]">
            Data Processing Agreement
          </h1>
          <p className="mt-3 text-[12.5px] text-muted-foreground">Last updated 10 November 2026</p>
        </div>
      </section>

      <article className="container-x max-w-3xl py-12">
        <div className="space-y-9 text-[13.5px] leading-7 text-muted-foreground">
          <p>
            This Data Processing Agreement ("DPA") forms part of the Bower Terms of Service and
            applies wherever Bower processes personal data on behalf of a customer. It is designed
            to meet the requirements of Article 28 of the EU GDPR and equivalent provisions in other
            jurisdictions.
          </p>

          <Section title="1. Roles">
            <p>
              The customer is the <strong>Data Controller</strong>. Bower Ltd, operating Bower,
              is the <strong>Data Processor</strong>. Where Bower engages a sub-processor (e.g.
              Supabase, Neon, Vercel), Bower acts as Data Processor and the sub-processor acts on
              Bower's documented instructions.
            </p>
          </Section>

          <Section title="2. Subject matter & duration">
            <p>
              Bower processes the personal data described in our <Link href="/legal/privacy" className="font-medium text-foreground underline decoration-border underline-offset-4">privacy policy</Link>{" "}
              solely for the purpose of providing the Bower service, for the duration of the
              customer's subscription and any post-termination wind-down period not exceeding 90 days.
            </p>
          </Section>

          <Section title="3. Nature & purpose of processing">
            <p>
              Processing includes collection, storage, organisation, retrieval, consultation, use,
              disclosure, alignment, restriction and deletion of personal data — exclusively to operate
              the dashboard, tenant records, payment processing and related notifications.
            </p>
          </Section>

          <Section title="4. Categories of data">
            <p>Personal data of:</p>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>Landlords — name, email, phone, billing details.</li>
              <li>Tenants — name, email, phone, lease & payment history.</li>
              <li>End-customers of tenants — only where the landlord chooses to record them.</li>
            </ul>
            <p className="mt-4">Special categories of data: none processed by default.</p>
          </Section>

          <Section title="5. Sub-processors">
            <p>
              Current sub-processors and the data they handle are listed below. We notify customers
              at least 30 days before adding or replacing a sub-processor, and customers may object
              on reasonable grounds.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>Supabase — authentication and private file storage.</li>
              <li>Neon — application database.</li>
              <li>Vercel — application hosting and delivery.</li>
              <li>Stripe — card payments for subscriptions.</li>
              <li>Safaricom Daraja — M-Pesa payment processing (data subject to Daraja's own policies).</li>
              
            </ul>
          </Section>

          <Section title="6. Security measures">
            <p>
              Bower maintains the technical and organisational measures described on our{" "}
              <Link href="/security" className="font-medium text-foreground underline decoration-border underline-offset-4">security page</Link>,
              including encrypted storage of sensitive fields, access scoping per account, private document storage and least-privilege administrative access.
            </p>
          </Section>

          <Section title="7. Data subject rights">
            <p>
              Bower will assist the customer in responding to data subject requests (access, correction,
              deletion, portability, objection) within statutory timeframes. The customer may submit
              such requests directly through their Bower dashboard.
            </p>
          </Section>

          <Section title="8. International transfers">
            <p>
              Personal data is stored with the providers listed in section 5. Those providers select the physical
              region of storage and may change it. Where a transfer outside your jurisdiction is involved, ask us
              in writing before signing up so we can confirm the current position for your account.
            </p>
          </Section>

          <Section title="9. Breach notification">
            <p>
              Bower will notify the customer without undue delay, and in any case within 48 hours,
              after becoming aware of a personal data breach affecting the customer's data.
            </p>
          </Section>

          <Section title="10. Deletion on termination">
            <p>
              Within 90 days of subscription termination, Bower will delete all personal data
              associated with the customer account, except where retention is mandated by law (e.g.
              financial records for 7 years).
            </p>
          </Section>

          <Section title="11. Liability & order of precedence">
            <p>
              In the event of a conflict between this DPA and the Terms of Service, this DPA
              prevails with respect to the processing of personal data.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              Questions about this DPA? Email{" "}
              <a href={`mailto:${BRAND.supportEmail}`} className="font-medium text-foreground underline decoration-border underline-offset-4">{BRAND.supportEmail}</a>.
            </p>
          </Section>
        </div>
      </article>

    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
      {children}
    </section>
  )
}
