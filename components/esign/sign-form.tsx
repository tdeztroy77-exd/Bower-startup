"use client"

import { useState } from "react"
import { CheckCircle2, Download, Loader2 } from "lucide-react"

/**
 * Simple electronic signature: typed name + explicit consent. The server
 * records the time, IP and user agent and appends a certificate page.
 */
export function SignForm({ token }: { token: string }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ download: string; hash: string } | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, consent }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not sign the document")
      setResult({ download: data.download, hash: data.document_hash })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign the document")
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-success/20 bg-success/[0.06] p-5">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="size-5" />
          <p className="text-[14px] font-semibold">Signed</p>
        </div>
        <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">
          The document now has your signature certificate on the last page. Keep a copy.
        </p>
        <a
          href={result.download}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Download className="size-4" /> Download signed copy
        </a>
        <p className="mt-3 font-mono text-[10px] text-muted-foreground">
          SHA-256 {result.hash.slice(0, 32)}…
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="signer-name" className="text-[12px] font-medium text-foreground">
          Type your full name to sign
        </label>
        <input
          id="signer-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          maxLength={120}
          placeholder="e.g. Amina Wanjiku"
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="signer-email" className="text-[12px] font-medium text-foreground">
          Email <span className="font-normal text-muted-foreground">(optional, for your records)</span>
        </label>
        <input
          id="signer-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/80 bg-card p-3">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 size-4 accent-[var(--primary)]"
        />
        <span className="text-[11.5px] leading-5 text-muted-foreground">
          I agree that typing my name here is my electronic signature for this document, and that I have
          had the chance to read it.
        </span>
      </label>

      {error ? <p className="text-[11.5px] text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={busy || !consent || name.trim().length < 2}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Sign document
      </button>
    </form>
  )
}
