'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle, ChevronRight, Plus, Search, TrendingUp, Users } from 'lucide-react'
import { useLeads } from '@/hooks/useLead'
import Badge from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatAmount } from '@/lib/utils'
import type { Lead } from '@/types/lead'

const STATUS_FILTERS = ['All', 'New', 'In Progress', 'Submitted', 'Approved', 'Rejected'] as const
const PIPELINE_STAGES = ['New', 'In Progress', 'Submitted', 'Approved', 'Rejected'] as const

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="rounded-md border border-black/5 bg-white p-4 shadow-sm shadow-black/5">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md text-white ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-extrabold text-gray-900">{value}</p>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.06em] text-gray-600">{label}</p>
        </div>
      </div>
    </div>
  )
}

function LeadRow({ lead }: { lead: Lead }) {
  const doneCount = lead.checklist.filter((doc) => doc.status === 'verified').length
  const total = lead.checklist.length
  const openIssues = lead.issues.filter((issue) => issue.status !== 'resolved').length

  return (
    <Link
      href={`/leads/${lead.id}`}
      className="group flex items-center gap-4 border-b border-gray-50 px-5 py-4 transition hover:bg-[#faf7f7] last:border-b-0"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
        {lead.initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-800">{lead.name}</p>
          {openIssues > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">
              {openIssues} issue{openIssues > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-gray-400">{lead.loanType} · {lead.bank} · {lead.id}</p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="text-sm font-semibold text-gray-800">{formatAmount(lead.amount)}</p>
        <p className="text-xs text-gray-400">Amount</p>
      </div>
      <div className="hidden w-28 md:block">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-gray-500">Docs</span>
          <span className="text-xs font-medium text-gray-700">{doneCount}/{total}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100">
          <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>
      </div>
      <Badge value={lead.status} />
      <ChevronRight className="h-4 w-4 text-gray-300 transition group-hover:text-gray-500" />
    </Link>
  )
}

export default function DashboardClient() {
  const { data: leads = [], isLoading, error } = useLeads()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All')
  const deferredSearch = useDeferredValue(search)

  const filteredLeads = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()

    return leads.filter((lead) => {
      const matchesSearch =
        query.length === 0 ||
        lead.name.toLowerCase().includes(query) ||
        lead.id.toLowerCase().includes(query) ||
        lead.loanType.toLowerCase().includes(query) ||
        lead.bank.toLowerCase().includes(query)

      const matchesStatus = statusFilter === 'All' || lead.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [deferredSearch, leads, statusFilter])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-md" />
          ))}
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return <EmptyState icon="⚠️" title="Unable to load leads" description="Please try refreshing the page." />
  }

  const approvedLeads = leads.filter((lead) => lead.status === 'Approved')
  const pendingIssues = leads.reduce((sum, lead) => sum + lead.issues.filter((issue) => issue.status !== 'resolved').length, 0)
  const activeLeads = leads.filter((lead) => ['New', 'In Progress', 'Submitted'].includes(lead.status)).length
  const docsPending = leads.reduce((sum, lead) => sum + lead.checklist.filter((item) => item.status === 'pending').length, 0)

  const actionLeads = [...leads]
    .filter(
      (lead) =>
        lead.status !== 'Approved' &&
        (lead.issues.some((issue) => issue.status !== 'resolved') ||
          lead.checklist.some((item) => item.status === 'pending' || item.status === 'rejected'))
    )
    .sort((a, b) => {
      const aIssues = a.issues.filter((issue) => issue.status !== 'resolved').length
      const bIssues = b.issues.filter((issue) => issue.status !== 'resolved').length
      return bIssues - aIssues || a.progress - b.progress
    })

  const topPriorityLeads = actionLeads.slice(0, 4)
  const leadsNeedingAttention = actionLeads.length

  const bankExposure = Object.values(
    leads.reduce<Record<string, { bank: string; count: number; amount: number }>>((acc, lead) => {
      if (!acc[lead.bank]) {
        acc[lead.bank] = { bank: lead.bank, count: 0, amount: 0 }
      }
      acc[lead.bank].count += 1
      acc[lead.bank].amount += lead.amount
      return acc
    }, {})
  ).sort((a, b) => b.amount - a.amount)

  const pipelineCounts = PIPELINE_STAGES.map((stage) => ({
    stage,
    count: leads.filter((lead) => lead.status === stage).length,
  }))

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      <section className="rounded-md border border-black/5 bg-white p-4 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Dashboard</p>
            <h1 className="mt-1 text-lg font-bold text-ink">Good afternoon, Prashant</h1>
            <p className="mt-1 text-sm text-muted">
              {leadsNeedingAttention} lead{leadsNeedingAttention === 1 ? '' : 's'} need immediate attention.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/leads/new"
              className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-600"
            >
              + Add New Lead
            </Link>
            <Link
              href="/leads"
              className="inline-flex items-center justify-center rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-ink transition hover:bg-surface"
            >
              Review Pipeline
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard icon={Users} label="Total Leads" value={leads.length} color="bg-brand-500" />
        <StatCard icon={TrendingUp} label="Active Leads" value={activeLeads} color="bg-amber-500" />
        <StatCard icon={CheckCircle} label="Approved" value={approvedLeads.length} color="bg-green-500" />
        <StatCard icon={AlertCircle} label="Open Issues" value={pendingIssues} color="bg-red-500" />
        <StatCard icon={AlertCircle} label="Docs Pending" value={docsPending} color="bg-orange-500" />
      </section>

      <section className="rounded-md border border-red-200 bg-red-50 p-4 shadow-sm shadow-red-100/70">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">Action Required</p>
            <h2 className="mt-1 text-base font-extrabold text-red-900">Priority files that need movement now</h2>
          </div>
          <Link href="/leads" className="text-xs font-semibold text-red-700 hover:text-red-800">
            View all
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {topPriorityLeads.length === 0 ? (
            <div className="rounded-md border border-red-100 bg-white px-4 py-6 text-sm text-gray-500">
              No urgent leads right now.
            </div>
          ) : (
            topPriorityLeads.map((lead) => {
              const issueCount = lead.issues.filter((issue) => issue.status !== 'resolved').length
              const pendingDocs = lead.checklist.filter((item) => item.status === 'pending' || item.status === 'rejected').length
              return (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="rounded-md border border-red-100 bg-white px-4 py-3 transition hover:border-red-200 hover:bg-red-50/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">{lead.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{lead.loanType} · {lead.id}</p>
                    </div>
                    <Badge value={lead.status} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-red-700">
                    {issueCount} issue{issueCount === 1 ? '' : 's'} · {pendingDocs} pending doc{pendingDocs === 1 ? '' : 's'}
                  </p>
                </Link>
              )
            })
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-md border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">Priority Leads</p>
                <h3 className="mt-1 text-base font-extrabold text-gray-900">Top actionable leads</h3>
              </div>
              <Link href="/leads" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                Open list
              </Link>
            </div>
            <div className="space-y-3">
              {topPriorityLeads.length === 0 ? (
                <div className="rounded-md border border-gray-100 bg-surface px-4 py-6 text-center text-sm text-gray-500">
                  No priority items right now.
                </div>
              ) : (
                topPriorityLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex items-start justify-between rounded-md border border-black/5 bg-[#faf7f7] px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/60"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">{lead.name}</p>
                        <Badge value={lead.status} />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{lead.id} · {lead.loanType} · {lead.bank}</p>
                      <p className="mt-2 text-xs text-brand-700">
                        {lead.issues.filter((issue) => issue.status !== 'resolved').length} open issues · {lead.checklist.filter((item) => item.status === 'pending' || item.status === 'rejected').length} pending docs
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 text-gray-300" />
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-black/5 bg-white shadow-sm shadow-black/5">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-700">Recent Leads</p>
                <h3 className="mt-1 font-semibold text-gray-800">Main work area</h3>
              </div>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by customer, lead ID, or loan type"
                  className="w-full rounded-md border border-gray-200 bg-[#faf7f7] py-2.5 pl-9 pr-3 text-sm text-ink outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto border-b border-gray-50 px-5 py-3 scrollbar-hide">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${statusFilter === status ? 'bg-brand-500 text-white' : 'bg-[#f3f3f3] text-gray-600 hover:bg-brand-50 hover:text-brand-700'}`}
                >
                  {status}
                </button>
              ))}
            </div>
            {filteredLeads.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">No leads found</div>
            ) : (
              <div>
                {filteredLeads.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-md border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-700">Insights Panel</p>
              <h3 className="mt-1 text-base font-extrabold text-gray-900">Execution shortcuts</h3>
            </div>
            <div className="space-y-3">
              <Link href="/dashboard/leads/new" className="block rounded-md border border-black/5 bg-[#faf7f7] p-4 transition hover:border-brand-200">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-subtle">New lead</p>
                <p className="mt-2 text-sm font-bold text-ink">Create a fresh file</p>
                <p className="mt-1 text-xs text-muted">Capture customer details in 3 quick steps.</p>
              </Link>
              <Link href="/leads" className="block rounded-md border border-black/5 bg-[#faf7f7] p-4 transition hover:border-brand-200">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-subtle">Pipeline</p>
                <p className="mt-2 text-sm font-bold text-ink">Review active queue</p>
                <p className="mt-1 text-xs text-muted">Sort and progress pending leads.</p>
              </Link>
              <Link href="/docs" className="block rounded-md border border-black/5 bg-[#faf7f7] p-4 transition hover:border-brand-200">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-subtle">Documents</p>
                <p className="mt-2 text-sm font-bold text-ink">Resolve pending docs</p>
                <p className="mt-1 text-xs text-muted">Clear customer upload blockers.</p>
              </Link>
            </div>
          </div>

          <div className="rounded-md border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-700">Pipeline mix</p>
            </div>
            <div className="space-y-4">
              {pipelineCounts.map((item) => (
                <div key={item.stage}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">{item.stage}</p>
                    <p className="text-xs text-muted">{item.count}</p>
                  </div>
                  <div className="h-2 rounded-full bg-surface">
                    <div
                      className="h-2 rounded-full bg-brand-500"
                      style={{ width: `${leads.length ? (item.count / leads.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
            <div className="mb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-700">Bank exposure</p>
            </div>
            <div className="space-y-3">
              {bankExposure.slice(0, 4).map((item) => (
                <div key={item.bank} className="rounded-md border border-gray-100 bg-surface px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-ink">{item.bank}</p>
                    <p className="text-xs font-semibold text-brand-700">{formatAmount(item.amount)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">{item.count} active lead{item.count === 1 ? '' : 's'}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <Link
        href="/dashboard/leads/new"
        className="fixed bottom-20 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-black/20 transition hover:bg-brand-600 md:hidden"
      >
        <Plus className="h-5 w-5" />
      </Link>
    </div>
  )
}
