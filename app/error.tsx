"use client"

import { useEffect } from "react"
import Link from "next/link"
import { RefreshCcw, TriangleAlert } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // The message stays in the console. It can contain record identifiers or
    // provider detail, so it is never rendered to the user.
    console.error("[bower] route error", { message: error.message, digest: error.digest })
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-lg">
        <span className="grid size-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-5" />
        </span>
        <h1 className="mt-5 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-foreground">
          Something went wrong on this page.
        </h1>
        <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
          The error has been logged. You can retry the page, or go back to the workspace and continue from
          there.
        </p>
        {error.digest ? (
          <p className="mt-4 rounded-lg border border-border bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCcw className="size-3.5" /> Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-[13px] font-semibold text-foreground hover:border-pine/30 hover:text-pine"
          >
            Back to dashboard
          </Link>
        </div>
        <p className="mt-6 text-[11.5px] text-muted-foreground">
          Still failing? Write to{" "}
          <a href="mailto:bknglabs.dev@gmail.com" className="font-medium text-foreground underline decoration-border underline-offset-4">
            bknglabs.dev@gmail.com
          </a>{" "}
          with the reference above.
        </p>
      </div>
    </div>
  )
}
