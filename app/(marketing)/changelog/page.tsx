import type { Metadata } from "next"
import { Sparkles, ShieldCheck, Wrench } from "lucide-react"
import { changelog, type ChangelogEntry } from "@/lib/content/site"
import { CtaBand, Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Changelog — Bower",
  description: "Every product update, improvement and security change, written plainly.",
}

const typeMeta: Record<ChangelogEntry["type"], { icon: typeof Sparkles; label: string; tone: string }> = {
  feature: { icon: Sparkles, label: "New", tone: "bg-secondary text-secondary-foreground" },
  improvement: { icon: Wrench, label: "Improved", tone: "bg-muted text-muted-foreground" },
  fix: { icon: Wrench, label: "Fixed", tone: "bg-muted text-muted-foreground" },
  security: { icon: ShieldCheck, label: "Security", tone: "bg-success/10 text-success" },
}

export default function ChangelogPage() {
  const grouped = changelog.reduce<Record<string, ChangelogEntry[]>>((acc, entry) => {
    const year = entry.date.slice(0, 4)
    acc[year] = acc[year] || []
    acc[year].push(entry)
    return acc
  }, {})
  const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Changelog</Pill>
          <h1 className="mt-6 max-w-[20ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            What changed, and why.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            Updates in the order they shipped. No release-note inflation — if a change is small, it says
            so.
          </p>
        </div>
      </section>

      <Section>
        <div className="mx-auto max-w-3xl">
          {years.map((year) => (
            <div key={year} className="mb-12 last:mb-0">
              <div className="mb-5 flex items-center gap-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{year}</h2>
                <span className="h-px flex-1 bg-border" />
              </div>
              <ol className="relative space-y-8 border-l border-border/80 pl-6">
                {grouped[year].map((entry) => {
                  const meta = typeMeta[entry.type]
                  const Icon = meta.icon
                  return (
                    <li key={entry.version} className="relative">
                      <span className="absolute -left-[31px] top-1.5 grid size-2.5 place-items-center rounded-full border border-border bg-background" />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${meta.tone}`}>
                          <Icon className="size-3" /> {meta.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {entry.version} ·{" "}
                          {new Date(entry.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <h3 className="mt-2 text-[15px] font-semibold tracking-[-0.01em] text-foreground">{entry.title}</h3>
                      <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{entry.body}</p>
                    </li>
                  )
                })}
              </ol>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Want to shape the next entry?"
        body="Tell us what is missing from your week. Product decisions get better with a real portfolio attached."
        primary={{ label: "Send an idea", href: "/contact" }}
        secondary={{ label: "Start free", href: "/auth/sign-up" }}
      />
    </>
  )
}
