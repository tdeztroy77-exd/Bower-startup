import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, Download, FileText, ShieldCheck } from "lucide-react"
import { BrandWordmark } from "@/components/brand-mark"
import { SignForm } from "@/components/esign/sign-form"
import { loadSignRequest } from "@/lib/esign/request"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Sign document — Bower",
  robots: { index: false, follow: false },
}

const label = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (character) => character.toUpperCase())
    .trim()

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const loaded = await loadSignRequest(token, { recordView: true })

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 text-center shadow-card">
          <BrandWordmark href="/" size="md" />
          <div className="mx-auto mt-6 grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">This link is not active</h1>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            It may have expired, been withdrawn, or already been completed. Ask your landlord for a fresh
            link.
          </p>
        </div>
      </div>
    )
  }

  const signed = loaded.request.status === "signed"
  const fields = (loaded.request.fields || {}) as Record<string, string>
  const highlights = ["rentAmount", "leaseStart", "leaseEnd", "deposit", "amountDue", "periodCovered"]
    .filter((key) => fields[key])
    .map((key) => [label(key), fields[key]] as const)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
          <BrandWordmark href="/" size="sm" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Sign document
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-4 py-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            {loaded.propertyName || "Tenancy document"}
          </p>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.03em]">
            {loaded.meta?.title || "Document"}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            For {loaded.tenantName}
            {loaded.request.expires_at
              ? ` · link expires ${new Date(loaded.request.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
              : ""}
          </p>
        </div>

        <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-card">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <FileText className="size-3.5" /> What you are signing
          </p>
          {highlights.length > 0 ? (
            <dl className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
              {highlights.map(([key, value]) => (
                <div key={key}>
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="mt-0.5 font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">
              Your landlord has prepared this document from your tenancy record. Read it before signing.
            </p>
          )}
        </section>

        {signed ? (
          <div className="rounded-2xl border border-success/20 bg-success/[0.06] p-5">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="size-5" />
              <p className="text-[14px] font-semibold">Already signed</p>
            </div>
            <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">
              Signed by {loaded.request.signer_name} on{" "}
              {loaded.request.signed_at
                ? new Date(loaded.request.signed_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
                : "record"}
              .
            </p>
            <a
              href={`/api/sign/${token}/document`}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Download className="size-4" /> Download signed copy
            </a>
          </div>
        ) : (
          <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-card">
            <SignForm token={token} />
          </section>
        )}

        <p className="pb-6 text-center text-[10.5px] leading-4 text-muted-foreground">
          This is a simple electronic signature with an audit trail (time, IP, device, document hash). It is
          not a certificate-authority signature. Powered by{" "}
          <Link href="/" className="font-medium text-foreground underline decoration-border underline-offset-2">
            Bower
          </Link>
          .
        </p>
      </main>
    </div>
  )
}
