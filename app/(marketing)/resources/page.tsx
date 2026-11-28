import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { blogPosts } from "@/lib/content/blog"
import { NewsletterForm } from "@/components/newsletter-form"
import { ResourceSearch } from "@/components/resource-search"
import { Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Resources — Bower",
  description:
    "Field notes and practical guides on rent collection, reconciliation and running a property portfolio.",
}

const categories = ["All", "Product", "Operations", "Finance", "Field notes", "Compliance"] as const

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const requested = ((await searchParams).category || "").trim()
  const activeCategory = categories.find((c) => c !== "All" && c.toLowerCase() === requested.toLowerCase())
  const posts = activeCategory ? blogPosts.filter((post) => post.category === activeCategory) : blogPosts
  const [hero, ...rest] = posts
  const featured = rest.slice(0, 2)

  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Resources</Pill>
          <h1 className="mt-6 max-w-[20ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            Field notes for people running property.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            Practical writing on rent collection, reconciliation and portfolio discipline — from the team
            and the landlords we work with.
          </p>
          <div className="mt-6 max-w-md">
            <ResourceSearch mode="post" />
          </div>
        </div>
      </section>

      <Section>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((category, index) => (
            <Link
              key={category}
              href={index === 0 ? "/resources" : `/resources?category=${encodeURIComponent(category)}`}
              className={
                "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors " +
                (index === 0
                  ? "border-pine bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-pine/40 hover:text-pine")
              }
            >
              {category}
            </Link>
          ))}
        </div>

        {posts.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-[13px] text-muted-foreground">
            No articles in this category yet.
          </p>
        ) : hero ? (
          <Link
            href={`/resources/${hero.slug}`}
            className="group mt-8 block rounded-3xl border border-border/80 bg-card p-6 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-pine/30 sm:p-8"
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-pine">
              {hero.category} · {new Date(hero.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {hero.readingMinutes} min read
            </p>
            <h2 className="mt-3 max-w-3xl text-[26px] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[34px]">
              {hero.title}
            </h2>
            <p className="mt-3 max-w-2xl text-[13.5px] leading-7 text-muted-foreground">{hero.excerpt}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-pine">
              Read the article <ArrowRight className="size-3.5" />
            </span>
          </Link>
        ) : null}

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {featured.map((post) => (
            <Link
              key={post.slug}
              href={`/resources/${post.slug}`}
              className="group flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-pine/30"
            >
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {post.category} · {post.readingMinutes} min read
              </p>
              <h3 className="mt-2.5 text-[16px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
                {post.title}
              </h3>
              <p className="mt-2 flex-1 text-[12.5px] leading-6 text-muted-foreground">{post.excerpt}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-pine">
                Read more <ArrowRight className="size-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section muted bordered>
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">All posts</p>
            <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.025em] sm:text-[28px]">
              Every article we have published.
            </h2>
          </div>
          <Link href="/rss.xml" className="hidden text-[12px] font-medium text-muted-foreground hover:text-foreground sm:inline">
            RSS feed
          </Link>
        </div>
        <ul className="mt-6 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/resources/${post.slug}`}
                className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {post.category} · {new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <p className="mt-1.5 truncate text-[13.5px] font-semibold text-foreground">{post.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">{post.excerpt}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
                  {post.readingMinutes} min <ArrowUpRight className="size-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <div className="grid gap-8 rounded-3xl border border-pine/15 bg-secondary p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="eyebrow text-secondary-foreground/60">Newsletter</p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.025em] text-secondary-foreground sm:text-[30px]">
              One email a month. No fluff.
            </h2>
            <p className="mt-2 max-w-md text-[13px] leading-6 text-secondary-foreground/70">
              New posts and occasional product notes. We store your address for that purpose only.
            </p>
          </div>
          <NewsletterForm source="resources" />
        </div>
      </Section>
    </>
  )
}
