"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertTriangle, Calendar, Loader2, Pencil, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { Panel } from "@/components/dashboard/panel"
import { EmptyBlock } from "@/components/dashboard/empty-block"
import { StatusPill, statusTone } from "@/components/dashboard/status-pill"
import { DeleteButton } from "@/components/delete-button"
import { MpesaPayButton } from "@/components/mpesa-pay-button"
import { TenantDocuments } from "@/components/tenant-documents"
import { TenantPortalCard } from "@/components/tenant-portal-card"
import { TenantSmsCard } from "@/components/tenant-sms-card"
import { TenantSignatures } from "@/components/tenant-signatures"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, tenantName } from "@/lib/utils"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-[13.5px] font-medium text-foreground">{children}</dd>
    </div>
  )
}

export default function TenantPage() {
  const params = useParams<{ id: string }>()
  const [tenant, setTenant] = useState<any>(null)
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!params?.id) return
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const [tenantRes, paymentsRes] = await Promise.all([
          supabase
            .from("tenants")
            .select(`
              *,
              properties (id, name, address, rent_amount, monthly_rent)
            `)
            .eq("id", params.id)
            .maybeSingle(),
          supabase
            .from("rent_payments")
            .select("*")
            .eq("tenant_id", params.id)
            .order("due_date", { ascending: false })
            .limit(5),
        ])
        if (tenantRes.error) throw tenantRes.error
        if (!tenantRes.data) setNotFound(true)
        else setTenant(tenantRes.data)
        setRecentPayments(paymentsRes.data || [])
      } catch (error) {
        console.error("[bower] fetch tenant error", error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [params?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading tenant
      </div>
    )
  }
  if (notFound || !tenant) {
    return (
      <Panel bodyClassName="p-0">
        <EmptyBlock
          icon={Users}
          title="Tenant not found"
          description="It may have been removed, or the link is out of date."
          actionHref="/dashboard/tenants"
          actionLabel="Back to tenants"
        />
      </Panel>
    )
  }

  const isLeaseExpiringSoon = () => {
    if (!tenant.lease_end_date) return false
    const endDate = new Date(tenant.lease_end_date)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  }

  const rent = tenant.monthly_rent

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Tenant"
        title={tenantName(tenant)}
        description={tenant.properties?.name}
        actions={
          <>
            <StatusPill tone={statusTone(tenant.status)} dot>
              {tenant.status || "unknown"}
            </StatusPill>
            {isLeaseExpiringSoon() ? (
              <StatusPill tone="danger">
                <AlertTriangle className="size-3" />
                Lease expiring soon
              </StatusPill>
            ) : null}
            <Button asChild size="sm" variant="outline" className="rounded-lg bg-card">
              <Link href={`/dashboard/tenants/${tenant.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <MpesaPayButton
              tenantId={tenant.id}
              defaultAmount={Number(tenant.monthly_rent || 0)}
              defaultPhone={tenant.phone || undefined}
            />
            <DeleteButton
              endpoint={`/api/tenants/${tenant.id}`}
              resource="tenant"
              redirectTo="/dashboard/tenants"
              className="rounded-lg bg-card text-destructive hover:text-destructive"
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Contact information">
          <dl className="divide-y divide-border/60">
            <Field label="Full name">{tenantName(tenant)}</Field>
            {tenant.email ? (
              <Field label="Email">
                <a href={`mailto:${tenant.email}`} className="text-pine hover:underline break-all">
                  {tenant.email}
                </a>
              </Field>
            ) : null}
            {tenant.phone ? (
              <Field label="Phone">
                <a href={`tel:${tenant.phone}`} className="text-pine hover:underline">
                  {tenant.phone}
                </a>
              </Field>
            ) : null}
            {tenant.national_id ? <Field label="National ID">{tenant.national_id}</Field> : null}
            {tenant.emergency_contact_name ? (
              <Field label="Emergency contact">{tenant.emergency_contact_name}</Field>
            ) : null}
            {tenant.emergency_contact_phone ? (
              <Field label="Emergency phone">
                <a href={`tel:${tenant.emergency_contact_phone}`} className="text-pine hover:underline">
                  {tenant.emergency_contact_phone}
                </a>
              </Field>
            ) : null}
          </dl>
        </Panel>

        <Panel title="Lease information">
          <dl className="divide-y divide-border/60">
            {tenant.properties ? (
              <Field label="Property">
                <span className="block">{tenant.properties.name}</span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{tenant.properties.address}</span>
              </Field>
            ) : null}
            {tenant.lease_start_date ? (
              <Field label="Lease start">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" /> {formatDate(tenant.lease_start_date)}
                </span>
              </Field>
            ) : null}
            {tenant.lease_end_date ? (
              <Field label="Lease end">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" /> {formatDate(tenant.lease_end_date)}
                </span>
              </Field>
            ) : null}
            {rent != null && rent !== "" ? (
              <Field label="Monthly rent">
                <span className="tabular text-pine">{formatCurrency(rent)}</span>
              </Field>
            ) : null}
            {tenant.deposit_amount ? (
              <Field label="Deposit">
                <span className="tabular">{formatCurrency(tenant.deposit_amount)}</span>
              </Field>
            ) : null}
            <Field label="Tenant since">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" /> {formatDate(tenant.created_at)}
              </span>
            </Field>
          </dl>
        </Panel>
      </div>

      <Panel
        title="Recent rent payments"
        description={
          recentPayments.length > 0 ? `Last ${recentPayments.length} payment${recentPayments.length === 1 ? "" : "s"}` : "No payment history"
        }
        bodyClassName="p-0"
      >
        {recentPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th className="text-right">Paid</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="text-[13.5px] font-semibold tabular text-foreground">{formatCurrency(payment.amount)}</td>
                    <td className="text-[13px] tabular text-muted-foreground">{formatDate(payment.due_date)}</td>
                    <td>
                      <StatusPill tone={statusTone(payment.status)} dot>
                        {payment.status || "unknown"}
                      </StatusPill>
                    </td>
                    <td className="text-right text-[13px] tabular text-muted-foreground">
                      {payment.paid_date ? formatDate(payment.paid_date) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyBlock
            icon={Calendar}
            title="No payment history"
            description="Rent payments recorded against this tenant will appear here."
            actionHref="/dashboard/finances"
            actionLabel="Manage payments"
          />
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Tenant portal" description="Private link, no account needed">
          <TenantPortalCard tenantId={tenant.id} />
        </Panel>
        <TenantDocuments tenant={tenant} payments={recentPayments} tenantId={tenant.id} />
      </div>

      <Panel title="SMS reminders" description="For tenants without an email address">
        <TenantSmsCard tenantId={tenant.id} />
      </Panel>

      <Panel title="Signatures" description="Documents sent for electronic signature">
        <TenantSignatures tenantId={tenant.id} />
      </Panel>

      {tenant.notes ? (
        <Panel title="Notes">
          <p className="whitespace-pre-wrap text-[13.5px] leading-6 text-muted-foreground">{tenant.notes}</p>
        </Panel>
      ) : null}
    </div>
  )
}
