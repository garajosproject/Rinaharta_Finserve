'use client'

import Link from 'next/link'
import { ChevronRight, type LucideIcon, Users } from 'lucide-react'
import Badge from '@/components/common/Badge'
import { formatAmount } from '@/lib/utils'
import type { Lead } from '@/types/lead'

export function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users | LucideIcon
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

export function LeadRow({ lead }: { lead: Lead }) {
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
          <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} />
        </div>
      </div>
      <Badge value={lead.status} />
      <ChevronRight className="h-4 w-4 text-gray-300 transition group-hover:text-gray-500" />
    </Link>
  )
}
