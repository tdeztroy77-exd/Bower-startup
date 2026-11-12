import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { DocumentUploadForm } from "@/components/document-upload-form"

export default function UploadDocumentPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Vault"
        title="Upload document"
        description="Attach a lease, policy or inspection to a property or tenant, and set an expiry date to be reminded before it lapses."
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
            <Link href="/dashboard/documents">
              <ArrowLeft /> Back to documents
            </Link>
          </Button>
        }
      />

      <DocumentUploadForm />
    </div>
  )
}
