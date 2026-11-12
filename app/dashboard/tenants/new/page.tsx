import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { TenantForm } from "@/components/tenant-form"

export default function NewTenantPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Portfolio"
        title="Add tenant"
        description="Record a tenant and link them to a property to start tracking rent."
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
            <Link href="/dashboard/tenants">
              <ArrowLeft /> Back to tenants
            </Link>
          </Button>
        }
      />

      <TenantForm />
    </div>
  )
}
