import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { listBackups } from "@/lib/backup"
import { APP_VERSION } from "@/lib/system"
import { BackupManager } from "@/components/backup-manager"
import { PageHeader } from "@/components/dashboard/page-header"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Backup & restore • Bower",
  description: "Create a private copy of your workspace or restore from a previous backup.",
}

export default async function BackupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const backups = await listBackups(user.id)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Backup & restore"
        eyebrow="Settings"
        description="A plain JSON copy of your workspace that you can keep anywhere, and restore at any time."
      />

      <BackupManager initialBackups={backups} appVersion={APP_VERSION} />
    </div>
  )
}
