import { Suspense } from "react"
import { BrandWordmark } from "@/components/brand-mark"
import { ResetPasswordForm } from "./form"

export const dynamic = "force-dynamic"

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="container-x flex h-16 items-center">
        <BrandWordmark href="/" size="md" />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}