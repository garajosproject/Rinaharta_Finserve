'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import EmptyState from '@/components/common/EmptyState'
import LeadHeader from '@/components/leads/LeadHeader'
import LeadTabs from '@/components/leads/LeadTabs'
import LeadWorkflowTimeline from '@/components/leads/LeadWorkflowTimeline'
import { useLead } from '@/hooks/useLead'
import { Skeleton } from '@/components/ui/skeleton'

export default function LeadPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const { data, isLoading, error } = useLead(id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-md" />
        <Skeleton className="h-96 w-full rounded-md" />
      </div>
    )
  }

  if (error || !data) {
    return <EmptyState icon="🔍" title="Lead not found" description={`No lead exists for ID ${id}.`} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-subtle">
        <Link href="/" className="transition hover:text-ink">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/leads" className="transition hover:text-ink">
          Leads
        </Link>
        <span>/</span>
        <span className="text-muted">{data.name}</span>
      </div>
      <LeadHeader lead={data} />
      <LeadWorkflowTimeline lead={data} />
      <LeadTabs lead={data} />
    </div>
  )
}
