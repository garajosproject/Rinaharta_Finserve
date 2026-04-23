'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import { LeadRow } from '@/components/leads/lead-shared'
import { useLeads } from '@/hooks/useLead'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_FILTERS = ['All', 'New', 'In Progress', 'Submitted', 'Approved', 'Rejected'] as const

export default function AllLeadsClient() {
  const { data: leads = [], isLoading, error } = useLeads()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All')
  const deferredSearch = useDeferredValue(search)
  const searchParams = useSearchParams()
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
      <div className="space-y-5">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-[520px] w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return <EmptyState icon="⚠️" title="Unable to load leads" description="Please try refreshing the page." />
  }

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      <section className="rounded-md border border-black/5 bg-white p-4 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">All Leads</p>
            <h1 className="mt-1 text-lg font-bold text-ink">Lead pipeline</h1>
            <p className="mt-1 text-sm text-muted">Track every application with the same workspace cards and detail views.</p>
          </div>
          <Link
            href="/leads/new"
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-600"
          >
            <Plus className="mr-1 h-4 w-4" /> Add New Lead
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-black/5 bg-white shadow-sm shadow-black/5">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-700">Lead List</p>
            <h3 className="mt-1 font-semibold text-gray-800">All leads</h3>
          </div>
          <div className="relative w-full flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by customer, lead ID, or loan type"
              className="w-full rounded-md border border-gray-200 bg-[#faf7f7] py-2.5 pl-9 pr-3 text-sm text-ink outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-gray-50 px-4 py-3 scrollbar-hide sm:px-5">
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
              <LeadRow key={lead.id} lead={lead} isNew={lead.id === newLeadId} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
