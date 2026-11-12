import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { PaymentForm } from "@/components/payment-form"

export default function NewPaymentPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Finances"
        title="Record rent payment"
        description="Log a rent payment against a tenant and property. It appears in this month's ledger straight away."
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
            <Link href="/dashboard/finances">
              <ArrowLeft /> Back to finances
            </Link>
          </Button>
        }
      />

      <PaymentForm />
    </div>
  )
}
