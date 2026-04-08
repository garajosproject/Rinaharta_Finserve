'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, FileCheck } from 'lucide-react'
import Badge from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import { useLeads } from '@/hooks/useLead'
import { Skeleton } from '@/components/ui/skeleton'

const DOCUMENT_FILTERS = ['all', 'received', 'pending', 'issues'] as const

function mapDocumentStatus(status: 'verified' | 'uploaded' | 'pending' | 'rejected') {
  if (status === 'verified' || status === 'uploaded') return 'received'
  if (status === 'rejected') return 'issues'
  return 'pending'
}

export default function DocumentsPageClient() {
  const { data: leads = [], isLoading, error } = useLeads()
  const [filter, setFilter] = useState<(typeof DOCUMENT_FILTERS)[number]>('all')

  const leadGroups = useMemo(() => {
    return leads
      .map((lead) => {
        const documents = lead.checklist.map((item) => ({
          ...item,
          groupStatus: mapDocumentStatus(item.status),
        }))

        const filteredDocuments = documents.filter((item) => filter === 'all' || item.groupStatus === filter)

        return {
          lead,
          documents: filteredDocuments,
          missingCount: documents.filter((item) => item.groupStatus !== 'received').length,
        }
      })
      .filter((item) => item.documents.length > 0)
      .sort((a, b) => b.missingCount - a.missingCount)
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
    return <EmptyState icon="⚠️" title="Unable to load documents" description="Please try refreshing the page." />
  }

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      <section className="rounded-md border border-black/5 bg-white p-4 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Documents</p>
            <h1 className="mt-1 text-lg font-bold text-ink">Lead document tracker</h1>
            <p className="mt-1 text-sm text-muted">Documents stay grouped under each lead so missing and issue items are easy to spot.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {DOCUMENT_FILTERS.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === item ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-line hover:bg-surface'}`}
              >
                {item === 'all' ? 'All' : item === 'received' ? 'Received' : item === 'pending' ? 'Pending' : 'Issues'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {leadGroups.length === 0 ? (
        <EmptyState icon="📄" title="No matching documents" description="No document records match the current filter." />
      ) : (
        <section className="space-y-4">
          {leadGroups.map(({ lead, documents, missingCount }) => (
            <div key={lead.id} className="rounded-md border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
              <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold text-gray-900">{lead.name}</p>
                    <Badge value={lead.status} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{lead.id} · {lead.loanType} · {lead.bank}</p>
                  <p className={`mt-2 text-xs font-semibold ${missingCount > 0 ? 'text-brand-700' : 'text-green-700'}`}>
                    {missingCount > 0 ? `${missingCount} missing or issue document${missingCount > 1 ? 's' : ''}` : 'All tracked documents received'}
                  </p>
                </div>
                <Link
                  href={`/leads/${lead.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  Open lead <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {documents.map((item) => (
                  <div key={item.id} className={`rounded-md border px-4 py-3 ${item.groupStatus === 'issues' ? 'border-red-100 bg-red-50' : item.groupStatus === 'pending' ? 'border-amber-100 bg-amber-50' : 'border-black/5 bg-[#faf7f7]'}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                        <Badge value={item.groupStatus === 'issues' ? 'issue' : item.groupStatus} />
                      </div>
                      <p className="text-xs text-gray-400">
                        {item.uploadedAt ? `Updated ${item.uploadedAt}` : 'Missing document'}
                      </p>
                    </div>
                    {item.rejectedReason ? (
                      <p className="mt-2 text-sm text-red-600">{item.rejectedReason}</p>
                    ) : item.groupStatus === 'pending' ? (
                      <p className="mt-2 text-sm text-amber-700">Pending from customer or partner branch.</p>
                    ) : (
                      <p className="mt-2 text-sm text-gray-600">Available in the lead record.</p>
                    )}
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
