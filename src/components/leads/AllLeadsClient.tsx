'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, ChevronDown, ChevronRight, Loader2, Plus, Search, UserPlus } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import Badge from '@/components/common/Badge'
import { useLeads, useUpdateWorkflowStep } from '@/hooks/useLead'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatAmount } from '@/lib/utils'
import { dedupChecklist } from '@/lib/lead-detail'
import { getAuthUser, useAuthStore } from '@/store/auth.store'
import { toast } from '@/components/ui/use-toast'
import type { Lead } from '@/types/lead'

// ── Status filter options ──────────────────────────────────────────────────────

const STATUS_CHIPS = ['All', 'New', 'In Progress', 'Under Review', 'Docs Pending', 'Approved', 'Rejected'] as const
type StatusChip = (typeof STATUS_CHIPS)[number]

// ── Enhanced lead row ─────────────────────────────────────────────────────────

function AllLeadsRow({ lead, isNew }: { lead: Lead; isNew?: boolean }) {
  const router   = useRouter()
  const mutation = useUpdateWorkflowStep(lead.id)
  const user     = getAuthUser()
  const role     = useAuthStore((s) => s.role)

  const deduped      = dedupChecklist(lead.checklist)
  const verifiedDocs = deduped.filter((c) => c.status === 'verified').length
  const totalDocs    = deduped.length
  const pendingDocs  = deduped.filter((c) => c.status === 'pending' || c.status === 'rejected').length
  const openIssues   = lead.issues.filter((i) => i.status !== 'resolved').length
  const hasPriority  = pendingDocs > 0 || openIssues > 0
  const isSelf       = lead.assignedUser === user?.name
  const canAssign    = role === 'super_admin' || role === 'admin' || role === 'ops_manager' || role === 'agent'

  function handleAssignToMe(e: React.MouseEvent) {
    e.stopPropagation()
    if (isSelf || !canAssign) return
    mutation.mutate(
      { action: 'assign', assignedUser: user?.name || 'You', changedBy: user?.name || 'Agent' },
      { onSuccess: () => toast({ title: 'Assigned to you' }) }
    )
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/leads/${lead.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/leads/${lead.id}`)}
      className={cn(
        'group flex cursor-pointer items-center gap-3 border-b border-gray-50 px-4 py-3 transition last:border-b-0 outline-none focus-visible:bg-surface',
        isNew      ? 'bg-[#FEF2F2] hover:bg-[#FEF2F2]' : 'hover:bg-surface',
        hasPriority && 'border-l-[3px] border-l-amber-400 pl-[13px]'
      )}
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-[10px] font-black text-white">
        {lead.initials}
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold text-ink">{lead.name}</p>
          <Badge value={lead.status} />
          {openIssues > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-red-100 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
              <AlertCircle className="h-2.5 w-2.5" /> {openIssues}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted">
          {lead.loanType} · {lead.id}
          {lead.assignedUser ? ` · ${lead.assignedUser}` : ''}
        </p>
      </div>

      {/* Amount — hidden on small screens */}
      <div className="hidden flex-shrink-0 text-right sm:block">
        <p className="text-xs font-semibold text-ink">{formatAmount(lead.amount)}</p>
      </div>

      {/* Doc progress — hidden on xs */}
      <div className="hidden w-16 flex-shrink-0 sm:block">
        <div className="mb-1 flex justify-between text-[10px] text-subtle">
          <span>Docs</span>
          <span className={cn('font-medium', pendingDocs > 0 ? 'text-amber-600' : '')}>{verifiedDocs}/{totalDocs}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn('h-1 rounded-full transition-all', verifiedDocs === totalDocs && totalDocs > 0 ? 'bg-green-500' : pendingDocs > 0 ? 'bg-amber-400' : 'bg-brand-500')}
            style={{ width: `${totalDocs ? (verifiedDocs / totalDocs) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Assign me — visible on hover (desktop) */}
      {canAssign && (
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {isSelf ? (
            <span className="hidden rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 group-hover:inline-block">
              ME
            </span>
          ) : (
            <button
              type="button"
              onClick={handleAssignToMe}
              disabled={mutation.isPending}
              className="hidden items-center gap-1 rounded border border-outline bg-white px-2 py-1.5 text-[10px] font-semibold text-muted transition hover:border-brand-100 hover:bg-brand-50 hover:text-brand-600 group-hover:inline-flex disabled:opacity-40"
            >
              {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
              Assign me
            </button>
          )}
        </div>
      )}

      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-300 transition group-hover:text-gray-400" />
    </div>
  )
}

// ── Assigned-To dropdown ───────────────────────────────────────────────────────

function AssignedFilter({
  value,
  options,
  onChange,
}: {
  value: string | null
  options: string[]
  onChange: (v: string | null) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
          value ? 'border-brand-100 bg-brand-50 text-brand-700' : 'border-outline bg-white text-ink hover:bg-surface'
        )}
      >
        {value ?? 'Assigned To'}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-30 mt-1.5 min-w-[160px] rounded-lg border border-outline bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false) }}
              className={cn('w-full px-3 py-2 text-left text-xs transition hover:bg-surface', !value ? 'font-bold text-brand-700' : 'text-ink')}
            >
              All
            </button>
            {options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setOpen(false) }}
                className={cn('w-full px-3 py-2 text-left text-xs transition hover:bg-surface', value === o ? 'font-bold text-brand-700' : 'text-ink')}
              >
                {o}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

// Map ?filter= query param → StatusChip
function filterParamToChip(param: string | null): StatusChip {
  switch (param) {
    case 'active':       return 'In Progress'
    case 'docs_pending': return 'Docs Pending'
    default:             return 'All'
  }
}

// ── Quick filter chips for super_admin ───────────────────────────────────────

type QuickFilter = 'All' | 'My Leads' | 'Unassigned'

export default function AllLeadsClient() {
  const { data: leads = [], isLoading, error } = useLeads()
  const searchParams = useSearchParams()
  const role = useAuthStore((s) => s.role)
  const currentUser = getAuthUser()
  const isSuperAdmin = role === 'super_admin'

  // Init status filter from ?filter= query param (dashboard card click)
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState<StatusChip>(
    () => filterParamToChip(searchParams?.get('filter') ?? null)
  )
  const [hasIssues, setHasIssues]         = useState(false)
  const [assignedFilter, setAssignedFilter] = useState<string | null>(null)
  const [quickFilter, setQuickFilter]     = useState<QuickFilter>('All')
  const deferredSearch = useDeferredValue(search)

  // Role-scoped leads — applied BEFORE all other filters
  const scopedLeads = useMemo(() => {
    if (role === 'super_admin' || role === 'admin' || role === 'ops_manager') {
      return leads // full visibility
    }
    if (role === 'agent') {
      // own: assigned to me OR created by me (agent field)
      return leads.filter(
        (l) => l.assignedUser === currentUser?.name || l.agent === currentUser?.name
      )
    }
    if (role === 'lead_generator') {
      // only leads they created
      return leads.filter((l) => l.agent === currentUser?.name)
    }
    return leads
  }, [leads, role, currentUser?.name])

  // Sync filter when ?filter= param changes (e.g. back/forward)
  useEffect(() => {
    const chip = filterParamToChip(searchParams?.get('filter') ?? null)
    setStatusFilter(chip)
  }, [searchParams])

  // New lead highlight
  const [newLeadId, setNewLeadId] = useState<string | null>(() => searchParams?.get('new') ?? null)
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const id = searchParams?.get('new')
    if (id) {
      setNewLeadId(id)
      clearRef.current = setTimeout(() => setNewLeadId(null), 2500)
    }
    return () => { if (clearRef.current) clearTimeout(clearRef.current) }
  }, [searchParams])

  // Unique assignees (from scoped set)
  const assignees = useMemo(() => {
    const names = scopedLeads.map((l) => l.assignedUser).filter(Boolean) as string[]
    return [...new Set(names)].sort()
  }, [scopedLeads])

  // Filter logic
  const filteredLeads = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()

    return scopedLeads.filter((lead) => {
      const deduped      = dedupChecklist(lead.checklist)
      const pendingDocs  = deduped.filter((c) => c.status === 'pending' || c.status === 'rejected').length
      const openIssues   = lead.issues.filter((i) => i.status !== 'resolved').length

      const matchesSearch = !query ||
        lead.name.toLowerCase().includes(query) ||
        lead.id.toLowerCase().includes(query) ||
        lead.loanType.toLowerCase().includes(query) ||
        (lead.assignedUser ?? '').toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'All'         ? true :
        statusFilter === 'Docs Pending' ? pendingDocs > 0 :
        lead.status === statusFilter

      const matchesIssues   = !hasIssues || openIssues > 0
      const matchesAssigned = !assignedFilter || lead.assignedUser === assignedFilter
      const matchesQuick =
        quickFilter === 'My Leads'   ? lead.assignedUser === currentUser?.name :
        quickFilter === 'Unassigned' ? !lead.assignedUser :
        true

      return matchesSearch && matchesStatus && matchesIssues && matchesAssigned && matchesQuick
    })
  }, [deferredSearch, scopedLeads, statusFilter, hasIssues, assignedFilter, quickFilter, currentUser?.name])

  const activeFilterCount = [statusFilter !== 'All', hasIssues, !!assignedFilter, quickFilter !== 'All'].filter(Boolean).length

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-[480px] w-full rounded-lg" />
      </div>
    )
  }

  if (error) {
    return <EmptyState icon="⚠️" title="Unable to load leads" description="Please try refreshing the page." />
  }

  return (
    <div className="space-y-5 pb-24 md:pb-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-ink">All Leads</h1>
          <p className="mt-0.5 text-xs text-muted">{scopedLeads.length} leads total · {filteredLeads.length} shown</p>
        </div>
        <a
          href="/leads/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" /> Add Lead
        </a>
      </div>

      {/* ── Work area ── */}
      <div className="overflow-hidden rounded-lg border border-black/5 bg-white shadow-sm shadow-black/5">

        {/* Search + filters */}
        <div className="space-y-3 border-b border-outline px-4 py-3">

          {/* Search row */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, loan type…"
              className="w-full rounded-lg border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-subtle outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50"
            />
          </div>

          {/* Filter chips row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status chips */}
            <div className="flex flex-wrap gap-1.5">
              {STATUS_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setStatusFilter(chip)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                    statusFilter === chip
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface text-muted hover:bg-brand-50 hover:text-brand-700'
                  )}
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-outline hidden sm:block" />

            {/* Quick filters — super_admin / admin / ops_manager only */}
            {(role === 'super_admin' || role === 'admin' || role === 'ops_manager') && (
              <>
                {(['My Leads', 'Unassigned'] as QuickFilter[]).map((qf) => (
                  <button
                    key={qf}
                    type="button"
                    onClick={() => setQuickFilter((v) => v === qf ? 'All' : qf)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                      quickFilter === qf
                        ? 'border-brand-100 bg-brand-50 text-brand-700'
                        : 'border-outline bg-white text-muted hover:bg-surface'
                    )}
                  >
                    {qf}
                  </button>
                ))}
                <div className="h-4 w-px bg-outline hidden sm:block" />
              </>
            )}

            {/* Has Issues toggle */}
            <button
              type="button"
              onClick={() => setHasIssues((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                hasIssues ? 'border-red-200 bg-red-50 text-red-700' : 'border-outline bg-white text-muted hover:bg-surface'
              )}
            >
              <AlertCircle className="h-3 w-3" />
              Has Issues
            </button>

            {/* Assigned To dropdown */}
            {assignees.length > 0 && (
              <AssignedFilter
                value={assignedFilter}
                options={assignees}
                onChange={setAssignedFilter}
              />
            )}

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setStatusFilter('All'); setHasIssues(false); setAssignedFilter(null); setQuickFilter('All') }}
                className="text-xs font-semibold text-subtle hover:text-brand-600 transition"
              >
                Clear ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* Lead rows */}
        {filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Search className="mb-3 h-8 w-8 text-subtle" />
            <p className="text-sm font-semibold text-ink">No leads found</p>
            <p className="mt-0.5 text-xs text-muted">Try adjusting filters or search query.</p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setStatusFilter('All'); setHasIssues(false); setAssignedFilter(null); setQuickFilter('All'); setSearch('') }}
                className="mt-3 text-xs font-semibold text-brand-600 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div>
            {filteredLeads.map((lead) => (
              <AllLeadsRow key={lead.id} lead={lead} isNew={lead.id === newLeadId} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
