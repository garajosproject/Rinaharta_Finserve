'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ChevronRight } from 'lucide-react'
import Badge from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import { useLeads } from '@/hooks/useLead'
import { Skeleton } from '@/components/ui/skeleton'

const ISSUE_FILTERS = ['open', 'resolved'] as const

export default function IssuesPageClient() {
  const { data: leads = [], isLoading, error } = useLeads()
  const [filter, setFilter] = useState<(typeof ISSUE_FILTERS)[number]>('open')

  const issueLeads = useMemo(() => {
    return leads
      .map((lead) => {
        const matchingIssues = lead.issues.filter((issue) =>
          filter === 'open' ? issue.status !== 'resolved' : issue.status === 'resolved'
        )

        return {
          lead,
          matchingIssues,
          openCount: lead.issues.filter((issue) => issue.status !== 'resolved').length,
          resolvedCount: lead.issues.filter((issue) => issue.status === 'resolved').length,
          urgentCount: lead.issues.filter((issue) => issue.priority === 'high' && issue.status !== 'resolved').length,
        }
      })
      .filter((item) => item.matchingIssues.length > 0)
      .sort((a, b) => b.urgentCount - a.urgentCount || b.openCount - a.openCount)
  }, [filter, leads])

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-[520px] w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return <EmptyState icon="⚠️" title="Unable to load issues" description="Please try refreshing the page." />
  }

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      <section className="rounded-md border border-black/5 bg-white p-4 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Issues</p>
            <h1 className="mt-1 text-lg font-bold text-ink">Lead blockers</h1>
            <p className="mt-1 text-sm text-muted">Review issue-heavy leads first and move urgent files back into the pipeline.</p>
          </div>
          <div className="flex gap-2">
            {ISSUE_FILTERS.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === item ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-line hover:bg-surface'}`}
              >
                {item === 'open' ? 'Open Issues' : 'Resolved'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {issueLeads.length === 0 ? (
        <EmptyState icon="✅" title="No matching issues" description="There are no issue items for the current filter." />
      ) : (
        <section className="space-y-4">
          {issueLeads.map(({ lead, matchingIssues, openCount, resolvedCount, urgentCount }) => (
            <div
              key={lead.id}
              className={`rounded-md border bg-white p-5 shadow-sm shadow-black/5 ${urgentCount > 0 ? 'border-red-200 shadow-red-100/60' : 'border-black/5'}`}
            >
              <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold text-gray-900">{lead.name}</p>
                    <Badge value={lead.status} />
                    {urgentCount > 0 && <Badge value="high" />}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{lead.id} · {lead.loanType} · {lead.bank}</p>
                  <p className="mt-2 text-xs text-muted">{openCount} open · {resolvedCount} resolved</p>
                </div>
                <Link
                  href={`/leads/${lead.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  Open lead <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {matchingIssues.map((issue) => (
                  <div key={issue.id} className={`rounded-md border px-4 py-3 ${issue.priority === 'high' && issue.status !== 'resolved' ? 'border-red-100 bg-red-50' : 'border-black/5 bg-[#faf7f7]'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">{issue.type}</p>
                      <Badge value={issue.priority} />
                      <Badge value={issue.status} />
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{issue.description}</p>
                    <p className="mt-2 text-xs text-gray-400">{issue.raisedAt} · Assigned to {issue.assignedTo}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
