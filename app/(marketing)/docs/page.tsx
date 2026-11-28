import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, BookOpen, Code2, LifeBuoy, ShieldCheck, Wallet } from "lucide-react"
import { docArticles, docCategories } from "@/lib/content/marketing"
import { CtaBand, Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Docs — Bower",
  description: "Guides for setting up a portfolio, collecting rent and running the workspace.",
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  "getting-started": BookOpen,
  guides: Code2,
  security: ShieldCheck,
  billing: Wallet,
}

export default async function DocsHub({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q || "").trim().toLowerCase()
  const visibleCategories = docCategories.filter((category) =>
    docArticles.some((article) => article.category === category.slug),
  )
  const results = query
    ? docArticles.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.excerpt.toLowerCase().includes(query) ||
          article.body.toLowerCase().includes(query),
      )
    : []

  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Documentation</Pill>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-[18ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
                How the workspace actually works.
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
                Setup guides, the M-Pesa flow, imports and account questions — written to match what
                the product does today.
              </p>
            </div>
            <form action="/docs" className="w-full">
              <label htmlFor="q" className="sr-only">Search documentation</label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-1.5 shadow-card">
                <input
                  id="q"
                  type="search"
                  name="q"
                  defaultValue={q || ""}
                  placeholder="Search guides…"
                  className="h-9 w-full border-0 bg-transparent px-2 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:ring-0"
                />
                <button
                  type="submit"
                  className="h-9 shrink-0 rounded-lg bg-primary px-3.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {query ? (
        <Section>
          <p className="eyebrow">Results for “{q}”</p>
          {results.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-border/80 bg-card px-5 py-10 text-center text-sm text-muted-foreground">
              No guide matches that search. Try a broader term, or{" "}
              <Link href="/contact" className="font-medium text-foreground underline decoration-border underline-offset-4">
                ask us directly
              </Link>
              .
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border/70 border-y border-border/70">
              {results.map((article) => (
                <li key={article.slug}>
                  <Link href={`/docs/${article.slug}`} className="flex items-start gap-3 py-4 transition-colors hover:text-pine">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-foreground">{article.title}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-5 text-muted-foreground">{article.excerpt}</span>
                    </span>
                    <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : (
        <Section>
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleCategories.map((category) => {
              const Icon = categoryIcons[category.slug] ?? BookOpen
              const articles = docArticles.filter((article) => article.category === category.slug)
              return (
                <div key={category.slug} className="rounded-2xl border border-border/80 bg-card p-5 shadow-card">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-secondary text-pine">
                      <Icon className="size-4" strokeWidth={1.9} />
                    </span>
                    <div>
                      <h2 className="text-[14px] font-semibold text-foreground">{category.name}</h2>
                      <p className="text-[11.5px] text-muted-foreground">{articles.length} guide{articles.length === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                  <ul className="mt-4 divide-y divide-border/60">
                    {articles.map((article) => (
                      <li key={article.slug}>
                        <Link
                          href={`/docs/${article.slug}`}
                          className="flex items-center justify-between gap-3 py-2.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <span className="truncate">{article.title}</span>
                          <ArrowUpRight className="size-3.5 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-pine/15 bg-secondary p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-secondary-foreground">Looking for an API?</p>
              <p className="mt-1 max-w-lg text-[12.5px] leading-6 text-secondary-foreground/70">
                A public API and webhooks are in development. They are not available for general use yet,
                and we do not publish endpoint documentation before it ships.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <LifeBuoy className="size-3.5" /> Request early access
            </Link>
          </div>
        </Section>
      )}

      <CtaBand
        title="The best documentation is the product."
        body="Start a trial and follow the quickstart on your own portfolio."
        primary={{ label: "Start free", href: "/auth/sign-up" }}
        secondary={{ label: "Talk to the team", href: "/contact" }}
      />
    </>
  )
}
