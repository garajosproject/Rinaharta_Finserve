'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import {
  BadgeIndianRupee,
  Download,
  Files,
  Filter,
  FolderOpen,
  ShieldCheck,
  Users,
} from 'lucide-react'
import AdminGuard from '@/components/auth/AdminGuard'
import EmptyState from '@/components/common/EmptyState'
import { useLeads, useUpdateAdminLeadStatus } from '@/hooks/useLead'
import {
  ADMIN_STATUS_OPTIONS,
  getDisplayCommission,
  getPayableCommission,
  getSourceLabel,
} from '@/lib/admin-leads'
import { formatAmount } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import type { AdminLeadStatus, Lead } from '@/types/lead'

function downloadLeadDocuments(lead: Lead) {
  if (lead.docs.length === 0) return

  const manifest = [
    `Lead: ${lead.name} (${lead.id})`,
    `Documents: ${lead.docs.length}`,
    '',
    ...lead.docs.map((doc, index) => `${index + 1}. ${doc.name} | ${doc.fileType} | ${doc.uploadedAt ?? 'Unknown upload date'}`),
  ].join('\n')

  const blob = new Blob([manifest], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${lead.id}-documents.txt`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function SummaryCard({
  title,
  value,
  subtext,
  icon: Icon,
}: {
  title: string
  value: string
  subtext: string
  icon: typeof Users
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">{title}</p>
          <p className="mt-3 text-3xl font-black text-ink">{value}</p>
          <p className="mt-2 text-sm text-muted">{subtext}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function LeadTableRow({ lead }: { lead: Lead }) {
  const { mutate, isPending } = useUpdateAdminLeadStatus(lead.id)
  const commission = getDisplayCommission(lead)
  const payableCommission = getPayableCommission(lead)

  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="px-4 py-4">
        <div className="min-w-[220px]">
          <p className="font-semibold text-ink">{lead.name}</p>
          <p className="mt-1 text-sm text-muted">{lead.phone}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-surface px-2 py-1 text-muted">{lead.district}</span>
            <span className="rounded-full bg-brand-50 px-2 py-1 text-brand-700">
              {getSourceLabel(lead.source)} · {lead.sourceCode}
            </span>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="min-w-[180px]">
          <p className="font-semibold text-ink">{formatAmount(lead.amount)}</p>
          <p className="mt-1 text-sm text-muted">{lead.commissionRate}% commission rate</p>
          <p className="mt-2 text-sm font-semibold text-brand-700">Lead commission: {formatAmount(commission)}</p>
          <p className="mt-1 text-xs text-muted">
            {payableCommission > 0 ? `Payable now: ${formatAmount(payableCommission)}` : 'Payable after L5 disbursal'}
          </p>
        </div>
      </td>
      <td className="px-4 py-4">
        <label className="block min-w-[170px]">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">
            Pipeline
          </span>
          <select
            value={lead.adminStatus}
            onChange={(event) => mutate(event.target.value as AdminLeadStatus)}
            disabled={isPending}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 disabled:bg-surface"
          >
            {ADMIN_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-muted">{lead.stage}</p>
      </td>
      <td className="px-4 py-4">
        <div className="min-w-[160px]">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FolderOpen className="h-4 w-4 text-brand-700" />
            {lead.docs.length > 0 ? `${lead.docs.length} file${lead.docs.length > 1 ? 's' : ''}` : 'No Docs'}
          </div>
          <p className="mt-2 text-xs text-muted">
            {lead.docs.length > 0 ? lead.docs.map((doc) => doc.name).join(', ') : 'Awaiting uploads'}
          </p>
        </div>
      </td>
      <td className="px-4 py-4">
        <button
          type="button"
          onClick={() => downloadLeadDocuments(lead)}
          disabled={lead.docs.length === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface disabled:cursor-not-allowed disabled:text-subtle"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      </td>
    </tr>
  )
}

export default function AdminDashboardClient() {
  const { data: leads = [], isLoading, error } = useLeads()
  const role = useAuthStore((state) => state.role)
  const [search, setSearch] = useState('')
  const [agentCodeFilter, setAgentCodeFilter] = useState('all')
  const deferredSearch = useDeferredValue(search)

  const agentCodes = useMemo(
    () =>
      Array.from(
        new Set(
          leads
            .filter((lead) => lead.source === 'agent')
            .map((lead) => lead.sourceCode)
        )
      ).sort(),
    [leads]
  )

  const filteredLeads = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()

    return leads.filter((lead) => {
      const matchesSearch =
        query.length === 0 ||
        lead.name.toLowerCase().includes(query) ||
        lead.phone.toLowerCase().includes(query) ||
        lead.district.toLowerCase().includes(query) ||
        lead.sourceCode.toLowerCase().includes(query)

      const matchesAgentCode =
        agentCodeFilter === 'all' || lead.sourceCode === agentCodeFilter

      return matchesSearch && matchesAgentCode
    })
  }, [agentCodeFilter, deferredSearch, leads])

  const summary = useMemo(() => {
    const totalCommissionPayable = filteredLeads.reduce((sum, lead) => sum + getPayableCommission(lead), 0)
    const totalDocuments = filteredLeads.reduce((sum, lead) => sum + lead.docs.length, 0)
    const disbursedLeads = filteredLeads.filter((lead) => lead.adminStatus === 'L5: Disbursed').length

    return {
      totalCommissionPayable,
      totalDocuments,
      disbursedLeads,
    }
  }, [filteredLeads])

  const agentCommissionSummary = useMemo(() => {
    return filteredLeads
      .filter((lead) => lead.source === 'agent')
      .reduce<Record<string, { leadCount: number; payable: number; projected: number }>>((acc, lead) => {
        const current = acc[lead.sourceCode] ?? { leadCount: 0, payable: 0, projected: 0 }
        current.leadCount += 1
        current.payable += getPayableCommission(lead)
        current.projected += getDisplayCommission(lead)
        acc[lead.sourceCode] = current
        return acc
      }, {})
  }, [filteredLeads])

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="rounded-3xl border border-black/5 bg-white p-10 text-center text-sm text-muted">
          Loading admin dashboard...
        </div>
      </AdminGuard>
    )
  }

  if (error) {
    return (
      <AdminGuard>
        <EmptyState icon="⚠️" title="Unable to load admin dashboard" description="Please refresh and try again." />
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="space-y-6 pb-24 md:pb-8">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Admin Pipeline</h1>
          <p className="mt-0.5 text-xs text-muted">Commission and document control across all leads.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Leads"
            value={String(filteredLeads.length)}
            subtext="Leads currently visible with active filters"
            icon={Users}
          />
          <SummaryCard
            title="Commission Payable"
            value={formatAmount(summary.totalCommissionPayable)}
            subtext="Only L5 disbursed leads are counted"
            icon={BadgeIndianRupee}
          />
          <SummaryCard
            title="Disbursed Leads"
            value={String(summary.disbursedLeads)}
            subtext="Commission-eligible cases ready for payout"
            icon={ShieldCheck}
          />
          <SummaryCard
            title="Documents Uploaded"
            value={String(summary.totalDocuments)}
            subtext="Uploaded files available for review and download"
            icon={Files}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[2.1fr,0.9fr]">
          <div className="rounded-3xl border border-black/5 bg-white shadow-sm shadow-black/5">
            <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">Lead Table</p>
                <h2 className="mt-1 text-xl font-bold text-ink">Loan operations overview</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="min-w-[220px]">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Search</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Name, phone, district, code"
                    className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500"
                  />
                </label>
                <label className="min-w-[220px]">
                  <span className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">
                    <Filter className="h-3.5 w-3.5" />
                    Gram Mitra Code
                  </span>
                  <select
                    value={agentCodeFilter}
                    onChange={(event) => setAgentCodeFilter(event.target.value)}
                    className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500"
                  >
                    <option value="all">All Agent Codes</option>
                    {agentCodes.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {filteredLeads.length === 0 ? (
              <div className="px-5 py-14 text-center text-sm text-muted">No leads matched the current search or agent-code filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-surface text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">
                    <tr>
                      <th className="px-4 py-3">Client Info</th>
                      <th className="px-4 py-3">Loan and Commission</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Documents</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <LeadTableRow key={lead.id} lead={lead} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">Agent Commission</p>
              <h2 className="mt-1 text-xl font-bold text-ink">Gram Mitra earnings</h2>
              <div className="mt-5 space-y-3">
                {Object.entries(agentCommissionSummary).length === 0 ? (
                  <p className="text-sm text-muted">No agent-linked leads in the current filter.</p>
                ) : (
                  Object.entries(agentCommissionSummary)
                    .sort((a, b) => b[1].payable - a[1].payable)
                    .map(([code, data]) => (
                      <div key={code} className="rounded-2xl border border-gray-100 bg-surface p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">{code}</p>
                            <p className="mt-1 text-xs text-muted">{data.leadCount} linked lead{data.leadCount > 1 ? 's' : ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-brand-700">{formatAmount(data.payable)}</p>
                            <p className="mt-1 text-xs text-muted">Projected {formatAmount(data.projected)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">Storage Ready</p>
              <h2 className="mt-1 text-xl font-bold text-ink">Document handling notes</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
                <li>Current downloads generate a local manifest so the admin flow works before S3 or Supabase storage is connected.</li>
                <li>Each lead already exposes document metadata in a `docs` array, which is the seam for real signed download URLs later.</li>
                <li>Status-based commission logic is centralized, so adding payout requests or ZIP exports later will not require rewriting the table.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </AdminGuard>
  )
}
