import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { PropertyForm } from "@/components/property-form"

export default function NewPropertyPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Portfolio"
        title="Add property"
        description="Record a property so its tenants, rent and maintenance live in one place."
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
            <Link href="/dashboard/properties">
              <ArrowLeft /> Back to properties
            </Link>
          </Button>
        }
      />

      <PropertyForm />
    </div>
  )
}
