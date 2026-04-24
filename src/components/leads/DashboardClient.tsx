'use client'

import Link from 'next/link'
import { AlertCircle, CheckCircle2, Plus, TrendingUp, Users } from 'lucide-react'
import { useLeads } from '@/hooks/useLead'
import Badge from '@/components/common/Badge'
import { StatCard } from '@/components/leads/lead-shared'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/common/EmptyState'
import { getAuthUser } from '@/store/auth.store'
import { dedupChecklist } from '@/lib/lead-detail'

export default function DashboardClient() {
  const { data: leads = [], isLoading, error } = useLeads()
  const user = getAuthUser()

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    )
  }

  if (error) {
    return <EmptyState icon="⚠️" title="Unable to load leads" description="Please try refreshing the page." />
  }

  const activeLeads = leads.filter((l) =>
    ['New', 'In Progress', 'Under Review', 'Submitted'].includes(l.status)
  ).length

  const docsPending = leads.reduce(
    (sum, l) => sum + dedupChecklist(l.checklist).filter((c) => c.status === 'pending' || c.status === 'rejected').length,
    0
  )

  // Priority: has open issues OR pending/rejected docs
  const priorityLeads = [...leads]
    .filter((l) =>
      l.issues.some((i) => i.status !== 'resolved') ||
      dedupChecklist(l.checklist).some((c) => c.status === 'pending' || c.status === 'rejected')
    )
    .sort((a, b) => {
      const aI = a.issues.filter((i) => i.status !== 'resolved').length
      const bI = b.issues.filter((i) => i.status !== 'resolved').length
      return bI - aI
    })
    .slice(0, 6)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="space-y-5 pb-24 md:pb-6">

      {/* ── Welcome ── */}
      <div className="rounded-lg border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-600">FinServe OS</p>
            <h1 className="mt-0.5 text-lg font-extrabold text-ink">
              {greeting}, {user?.name?.split(' ')[0] ?? 'Agent'} 👋
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {priorityLeads.length > 0
                ? `${priorityLeads.length} lead${priorityLeads.length > 1 ? 's' : ''} need attention.`
                : 'All leads are up to date.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/leads/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add Lead
            </Link>
            <Link
              href="/leads"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2 text-xs font-bold text-ink transition hover:bg-surface"
            >
              All Leads →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Users}       label="Total Leads"  value={leads.length}  color="bg-brand-500"  href="/leads" />
        <StatCard icon={TrendingUp}  label="Active"       value={activeLeads}   color="bg-amber-500"  href="/leads?filter=active" />
        <StatCard icon={AlertCircle} label="Docs Pending" value={docsPending}   color="bg-orange-500" href="/leads?filter=docs_pending" />
      </div>

      {/* ── Priority Leads ── */}
      <div className="rounded-lg border border-black/5 bg-white shadow-sm shadow-black/5">
        <div className="flex items-center justify-between border-b border-outline px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-subtle">Needs Attention</p>
            <p className="mt-0.5 text-sm font-bold text-ink">Priority Leads</p>
          </div>
          <Link href="/leads" className="text-xs font-semibold text-brand-600 hover:underline">
            View all →
          </Link>
        </div>

        {priorityLeads.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-green-400" />
            <p className="text-sm font-semibold text-ink">All clear</p>
            <p className="mt-0.5 text-xs text-muted">No leads need immediate attention.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {priorityLeads.map((lead) => {
              const issueCount  = lead.issues.filter((i) => i.status !== 'resolved').length
              const deduped     = dedupChecklist(lead.checklist)
              const pendingDocs = deduped.filter((c) => c.status === 'pending' || c.status === 'rejected').length
              const verifiedDocs = deduped.filter((c) => c.status === 'verified').length
              const totalDocs   = deduped.length

              return (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-surface"
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-black text-white">
                    {lead.initials}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold text-ink">{lead.name}</p>
                      <Badge value={lead.status} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">{lead.loanType} · {lead.id}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                      {issueCount > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-brand-600">
                          <AlertCircle className="h-3 w-3" />
                          {issueCount} issue{issueCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {pendingDocs > 0 && (
                        <span className="font-semibold text-amber-600">
                          {pendingDocs} doc{pendingDocs > 1 ? 's' : ''} pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Doc progress */}
                  <div className="hidden w-20 flex-shrink-0 sm:block">
                    <div className="mb-1 flex justify-between text-[10px] text-subtle">
                      <span>Docs</span>
                      <span>{verifiedDocs}/{totalDocs}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-brand-500"
                        style={{ width: `${totalDocs ? (verifiedDocs / totalDocs) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <Link
        href="/leads/new"
        className="fixed bottom-20 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-black/20 transition hover:bg-brand-700 md:hidden"
      >
        <Plus className="h-5 w-5" />
      </Link>

    </div>
  )
}
