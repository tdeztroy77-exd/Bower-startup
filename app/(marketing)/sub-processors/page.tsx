import type { Metadata } from "next"
import Link from "next/link"
import { subProcessors } from "@/lib/content/marketing"
import { Pill, Section } from "@/components/marketing/blocks"

export const metadata: Metadata = {
  title: "Sub-processors — Bower",
  description: "The third parties that process Bower customer data, and what they handle.",
}

export default function SubProcessorsPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <Pill>Trust</Pill>
          <h1 className="mt-6 max-w-[18ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            Sub-processors
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            The providers that handle data on our behalf, and what each one actually touches. We will
            update this list before adding a new provider that processes personal data.
          </p>
        </div>
      </section>

      <Section>
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Purpose</th>
                  <th>Data</th>
                  <th>Region</th>
                  <th>Privacy</th>
                </tr>
              </thead>
              <tbody>
                {subProcessors.map((processor) => (
                  <tr key={processor.name}>
                    <td className="whitespace-nowrap text-[13px] font-semibold text-foreground">{processor.name}</td>
                    <td className="text-[12.5px] text-muted-foreground">{processor.purpose}</td>
                    <td className="text-[12.5px] text-muted-foreground">{processor.data}</td>
                    <td className="whitespace-nowrap text-[12px] text-muted-foreground">{processor.region}</td>
                    <td>
                      <a
                        href={`https://${processor.policy}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] font-medium text-primary hover:underline"
                      >
                        Policy
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 text-[12px] text-muted-foreground">
          <p>
            Last reviewed November 2026. The data processing agreement is available at{" "}
            <Link href="/legal/dpa" className="font-medium text-foreground underline decoration-border underline-offset-4">
              /legal/dpa
            </Link>
            .
          </p>
          <p>
            Regions marked “provider-managed” mean the provider selects and may change the physical
            location of storage. If a specific region is a procurement requirement, ask before signing
            up.
          </p>
        </div>
      </Section>
    </>
  )
}
