import { BrandWordmark } from "@/components/brand-mark"
import { ForgotPasswordForm } from "./form"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="container-x flex h-16 items-center">
        <BrandWordmark href="/" size="md" />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <Suspense fallback={null}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}