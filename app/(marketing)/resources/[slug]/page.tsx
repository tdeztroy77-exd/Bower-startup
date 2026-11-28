import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowUpRight } from "lucide-react"
import { blogPosts, getBlogPost, getRelatedPosts } from "@/lib/content/blog"
import { NewsletterForm } from "@/components/newsletter-form"

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return { title: "Article — Bower" }
  return { title: `${post.title} — Bower`, description: post.excerpt }
}

function renderBody(body: string) {
  const blocks = body.split(/\n{2,}/g)
  return blocks.map((block, index) => {
    if (block.startsWith("## ")) {
      return (
        <h2 key={index} className="mt-9 text-[21px] font-semibold tracking-[-0.02em] text-foreground">
          {block.replace(/^## /, "")}
        </h2>
      )
    }
    if (block.startsWith("- ")) {
      const items = block.split(/\n/).map((line) => line.replace(/^- /, ""))
      return (
        <ul key={index} className="mt-4 space-y-2.5">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex gap-2.5 text-[14px] leading-7 text-muted-foreground">
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    }
    return (
      <p key={index} className="mt-4 text-[14.5px] leading-8 text-muted-foreground">
        {block}
      </p>
    )
  })
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const related = getRelatedPosts(slug)

  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x max-w-3xl pb-10 pt-10 sm:pt-14">
          <Link
            href="/resources"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Resources
          </Link>
          <p className="mt-6 flex flex-wrap items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span className="text-pine">{post.category}</span>
            <span aria-hidden>·</span>
            <span>
              {new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span aria-hidden>·</span>
            <span>{post.readingMinutes} min read</span>
          </p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-foreground sm:text-[42px]">
            {post.title}
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-muted-foreground">{post.excerpt}</p>
          <div className="mt-6 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-pine">
              {post.author.initials}
            </span>
            <div>
              <p className="text-[12.5px] font-semibold text-foreground">{post.author.name}</p>
              <p className="text-[11.5px] text-muted-foreground">{post.author.role}</p>
            </div>
          </div>
        </div>
      </section>

      <article className="container-x max-w-3xl py-10 sm:py-14">
        <div>{renderBody(post.body)}</div>

        <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border/70 pt-6">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tagged</span>
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border/80 bg-card p-5 shadow-card">
          <p className="text-[13px] font-semibold text-foreground">Get the next one by email</p>
          <p className="mt-1 mb-3 text-[12px] text-muted-foreground">
            One email a month. Unsubscribe any time.
          </p>
          <NewsletterForm source={`article:${post.slug}`} />
        </div>
      </article>

      {related.length > 0 ? (
        <section className="border-t border-border/70 bg-muted/30 py-12">
          <div className="container-x">
            <p className="eyebrow">Keep reading</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/resources/${item.slug}`}
                  className="group rounded-2xl border border-border/80 bg-card p-5 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-pine/30"
                >
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {item.category} · {item.readingMinutes} min read
                  </p>
                  <h2 className="mt-2 text-[14.5px] font-semibold leading-snug text-foreground">{item.title}</h2>
                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-muted-foreground">{item.excerpt}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-pine">
                    Read <ArrowUpRight className="size-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}
