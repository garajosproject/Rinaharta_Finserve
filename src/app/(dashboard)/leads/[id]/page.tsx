'use client'

import { useParams } from 'next/navigation'
import ActivityTimeline from '@/components/activity/ActivityTimeline'
import EmptyState from '@/components/common/EmptyState'
import LeadHeader from '@/components/leads/LeadHeader'
import LeadTabs from '@/components/leads/LeadTabs'
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
      <LeadHeader lead={data} />
      <LeadTabs lead={data} />
    </div>
  )
}
