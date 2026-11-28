import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Download, FileText, Table2 } from "lucide-react"
import { listTemplates } from "@/lib/templates/templates"
import { Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Document templates — Bower",
  description:
    "Kenyan lease, receipt, inspection, notice and statement templates. Every file listed here is a real generated Word document.",
}

const csvTemplates = [
  {
    name: "Property import",
    description: "Columns for bulk property import: name, address, rent, type and status.",
    href: "/templates/property-import.csv",
  },
  {
    name: "Tenant import",
    description: "Columns for tenant import: name, phone, property, lease dates and rent.",
    href: "/templates/tenant-import.csv",
  },
]

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const all = listTemplates()
  const categories = Array.from(new Set(all.map((template) => template.category))).sort()
  const requested = ((await searchParams).category || "").trim()
  const active = categories.find((category) => category.toLowerCase() === requested.toLowerCase())
  const visible = active ? all.filter((template) => template.category === active) : all

  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Templates</Pill>
          <h1 className="mt-6 max-w-[20ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            Real paperwork, not placeholders.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            Every document below is generated from a real template — {all.length} of them, covering leases,
            receipts, inspections, notices and statements. Download a blank form, or fill it from a tenant
            record inside the workspace.
          </p>
        </div>
      </section>

      <Section>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/templates"
            className={
              "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors " +
              (!active
                ? "border-pine bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-pine/40 hover:text-pine")
            }
          >
            All ({all.length})
          </Link>
          {categories.map((category) => {
            const count = all.filter((template) => template.category === category).length
            return (
              <Link
                key={category}
                href={`/templates?category=${encodeURIComponent(category)}`}
                className={
                  "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors " +
                  (active === category
                    ? "border-pine bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-pine/40 hover:text-pine")
                }
              >
                {category} ({count})
              </Link>
            )
          })}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((template) => (
            <article
              key={template.id}
              className="flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-secondary text-pine">
                  <FileText className="size-4" strokeWidth={1.9} />
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {template.category}
                </span>
              </div>
              <h2 className="mt-4 text-[14px] font-semibold leading-snug text-foreground">{template.title}</h2>
              <p className="mt-1.5 flex-1 text-[12px] leading-5 text-muted-foreground">{template.description}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
                <span className="text-[11px] text-muted-foreground">
                  Word · {template.pages} page{template.pages === 1 ? "" : "s"}
                </span>
                <a
                  href={`/templates/preview/${template.id}.docx`}
                  download
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-pine hover:underline"
                >
                  <Download className="size-3.5" /> Blank form
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border/80 bg-muted/40 p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <Table2 className="size-4 text-muted-foreground" /> CSV import templates
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {csvTemplates.map((csv) => (
              <a
                key={csv.href}
                href={csv.href}
                download
                className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-3 transition-colors hover:border-pine/30"
              >
                <span>
                  <span className="block text-[12.5px] font-semibold text-foreground">{csv.name}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-5 text-muted-foreground">{csv.description}</span>
                </span>
                <Download className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>

        <p className="mt-4 text-[11.5px] leading-5 text-muted-foreground">
          Blank forms contain blank fields by design. To generate a populated document, open a tenant or
          payment in the workspace and use the document actions there. These templates are drafting aids,
          not legal advice.
        </p>
      </Section>

      <Section muted bordered>
        <div className="flex flex-col gap-4 rounded-3xl border border-pine/15 bg-secondary p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-secondary-foreground">
              Generate from the record instead
            </h2>
            <p className="mt-1.5 max-w-lg text-[13px] leading-6 text-secondary-foreground/70">
              A lease, receipt or statement filled from a tenant record takes one click and cannot drift
              from the data it is based on.
            </p>
          </div>
          <Link
            href="/auth/sign-up"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Start free <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </Section>
    </>
  )
}
