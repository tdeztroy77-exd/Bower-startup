import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { MaintenanceForm } from "@/components/maintenance-form"

export default function NewMaintenancePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Service"
        title="New maintenance request"
        description="Log a fault, set its priority and attach it to a property. It appears in the service queue immediately."
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
            <Link href="/dashboard/maintenance">
              <ArrowLeft /> Back to queue
            </Link>
          </Button>
        }
      />

      <MaintenanceForm />
    </div>
  )
}
