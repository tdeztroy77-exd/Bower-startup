import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, TriangleAlert } from "lucide-react"
import { statusIncidents } from "@/lib/content/site"
import { checkSystemHealth } from "@/lib/system-health"
import { BRAND } from "@/lib/brand"
import { Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Status — Bower",
  description: "Current availability of the Bower workspace.",
}

export const dynamic = "force-dynamic"

export default async function StatusPage() {
  const health = await checkSystemHealth()
  const operational = health.ok
  const checkedAt = new Date(health.timestamp).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  })

  const services = [
    { name: "Workspace & application API", ok: operational, note: "Sign in, records, dashboard and reports." },
    { name: "Public website", ok: true, note: "This site, documentation and marketing pages." },
    { name: "M-Pesa collection", ok: operational, note: "Reflects overall service health, not Safaricom’s own status." },
  ]

  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>System status</Pill>
          <h1 className="mt-6 max-w-[20ch] text-[38px] font-semibold leading-[1.03] tracking-[-0.04em] sm:text-[48px]">
            {operational ? "Everything is responding." : "Something is not responding."}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11.5px] font-semibold ring-1 ring-inset ${
                operational
                  ? "bg-success/10 text-success ring-success/15"
                  : "bg-warning/10 text-warning ring-warning/20"
              }`}
            >
              <span className={`size-1.5 rounded-full ${operational ? "bg-success" : "bg-warning"}`} />
              {operational ? "Operational" : "Degraded"}
            </span>
            <span className="text-[12px] text-muted-foreground">Last checked {checkedAt} EAT</span>
          </div>
          <p className="mt-4 max-w-xl text-[13.5px] leading-6 text-muted-foreground">
            This page reflects a live check against the application. It is not a contractual SLA, and we
            do not publish uptime percentages we cannot measure.
          </p>
        </div>
      </section>

      <Section>
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
          {services.map((service, index) => (
            <div
              key={service.name}
              className={`flex items-start justify-between gap-5 p-5 ${index > 0 ? "border-t border-border/70" : ""}`}
            >
              <div>
                <p className="text-[13.5px] font-semibold text-foreground">{service.name}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{service.note}</p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset ${
                  service.ok
                    ? "bg-success/10 text-success ring-success/15"
                    : "bg-warning/10 text-warning ring-warning/20"
                }`}
              >
                {service.ok ? <CheckCircle2 className="size-3" /> : <TriangleAlert className="size-3" />}
                {service.ok ? "Operational" : "Degraded"}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section muted bordered>
        <div className="max-w-3xl">
          <p className="eyebrow">Incident history</p>
          <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
            Recent incidents
          </h2>
          {statusIncidents.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-border/80 bg-card p-6 text-center shadow-card">
              <p className="text-[13px] font-medium text-foreground">No incidents recorded</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                We publish an entry here when a disruption actually happens — not a generated history.
              </p>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {statusIncidents.map((incident) => (
                <li key={incident.id} className="rounded-2xl border border-border/80 bg-card p-5 shadow-card">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                    {new Date(incident.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}
                    {incident.status}
                  </p>
                  <h3 className="mt-2 text-[14px] font-semibold text-foreground">{incident.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-muted-foreground">{incident.body}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 text-[12px] text-muted-foreground">
            Something looks wrong on your side? Email{" "}
            <a href={`mailto:${BRAND.supportEmail}`} className="font-medium text-foreground underline decoration-border underline-offset-4">
              {BRAND.supportEmail}
            </a>{" "}
            or read the{" "}
            <Link href="/help" className="font-medium text-foreground underline decoration-border underline-offset-4">
              help centre
            </Link>
            .
          </p>
        </div>
      </Section>
    </>
  )
}
