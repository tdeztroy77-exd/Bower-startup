import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { ExpenseForm } from "@/components/expense-form"

export default function NewExpensePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Finances"
        title="Add expense"
        description="Record a cost against a property or the whole portfolio."
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-lg bg-card">
            <Link href="/dashboard/finances">
              <ArrowLeft /> Back to finances
            </Link>
          </Button>
        }
      />

      <ExpenseForm />
    </div>
  )
}
