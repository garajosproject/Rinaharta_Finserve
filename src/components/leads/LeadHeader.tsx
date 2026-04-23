'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Phone,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import Badge from '@/components/common/Badge'
import { useDeleteLead, useUpdateWorkflowStep } from '@/hooks/useLead'
import { getAuthUser } from '@/store/auth.store'
import { useAuthStore } from '@/store/auth.store'
import { toast } from '@/components/ui/use-toast'
import { formatAmount } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { Lead } from '@/types/lead'
import LeadReportModal from './LeadReportModal'
import DocSelectModal from './DocSelectModal'

// ── Assign modal ──────────────────────────────────────────────────────────────

const TEAM_MEMBERS = [
  'Prashant S.',
  'Vrushal S.',
  'Ravi M.',
  'Krishna P.',
  'Deepak J.',
]

function AssignModal({
  lead,
  mode,
  onClose,
}: {
  lead: Lead
  mode: 'assign' | 'transfer'
  onClose: () => void
}) {
  const [selected, setSelected] = useState(lead.assignedUser ?? '')
  const mutation = useUpdateWorkflowStep(lead.id)
  const user = getAuthUser()

  function handleConfirm() {
    if (!selected) return
    mutation.mutate(
      { action: 'assign', assignedUser: selected, changedBy: user?.name || 'Agent' },
      {
        onSuccess: () => {
          toast({ title: `Lead ${mode === 'assign' ? 'assigned' : 'transferred'} to ${selected}` })
          onClose()
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg border border-black/5 bg-white p-6 shadow-xl">
        <h3 className="text-sm font-bold text-ink mb-1">
          {mode === 'assign' ? 'Assign Lead' : 'Transfer Lead'}
        </h3>
        <p className="text-xs text-muted mb-4">
          {mode === 'assign' ? 'Assign this lead to a team member.' : 'Transfer ownership to another agent.'}
        </p>

        <div className="space-y-1.5 mb-5">
          {TEAM_MEMBERS.map((member) => (
            <button
              key={member}
              type="button"
              onClick={() => setSelected(member)}
              className={`w-full flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition ${
                selected === member
                  ? 'bg-brand-50 text-brand-700 border border-brand-100 font-semibold'
                  : 'bg-surface text-ink hover:bg-[#f0f0f0] border border-transparent'
              }`}
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-black text-white">
                {member.charAt(0)}
              </div>
              {member}
              {selected === member && <CheckCircle2 className="ml-auto h-4 w-4 text-brand-500" />}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-outline bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-[#ececec] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected || mutation.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-brand-500 hover:bg-brand-700 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete modal ──────────────────────────────────────────────────────────────

const DELETE_REASONS = [
  'Duplicate Lead',
  'Invalid Customer',
  'Customer Not Interested',
  'Wrong Entry',
  'Other',
]

function DeleteLeadModal({
  lead,
  onClose,
}: {
  lead: Lead
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [note, setNote]     = useState('')
  const router = useRouter()
  const mutation = useDeleteLead()
  const user = getAuthUser()

  function handleDelete() {
    if (!reason) return
    mutation.mutate(
      {
        leadId: lead.id,
        reason,
        note: note.trim(),
        deletedBy: user?.name ?? 'Admin',
        deletedById: user?.mobile ?? 'admin',
      },
      {
        onSuccess: () => {
          toast({ title: `Lead ${lead.name} deleted` })
          onClose()
          router.push('/leads')
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg border border-black/5 bg-white p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#FEF2F2]">
            <AlertTriangle className="h-4 w-4 text-brand-600" />
          </div>
          <h3 className="text-sm font-bold text-ink">Delete Lead</h3>
        </div>
        <p className="text-xs text-muted mb-4 ml-10">
          This action moves <span className="font-semibold text-ink">{lead.name}</span> to deleted leads. Admin can restore it later.
        </p>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-subtle mb-1">
              Reason <span className="text-brand-500">*</span>
            </label>
            <div className="relative">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full appearance-none rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-[#FEF2F2] pr-8"
              >
                <option value="">Select a reason…</option>
                {DELETE_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-subtle" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-subtle mb-1">
              Note <span className="text-subtle font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Additional details…"
              className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink placeholder:text-subtle outline-none focus:border-brand-500 focus:ring-2 focus:ring-[#FEF2F2]"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-outline bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-[#ececec] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!reason || mutation.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-brand-500 hover:bg-brand-700 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete Lead
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Info chip ─────────────────────────────────────────────────────────────────

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-subtle truncate">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink truncate">{value || '—'}</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LeadHeader({ lead }: { lead: Lead }) {
  const [modal, setModal]           = useState<'assign' | 'transfer' | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [docsOpen, setDocsOpen]     = useState(false)
  const mutation = useUpdateWorkflowStep(lead.id)
  const user = getAuthUser()
  const role = useAuthStore((s) => s.role)

  function handleHandleMyself() {
    mutation.mutate(
      { action: 'assign', assignedUser: user?.name || 'You', changedBy: user?.name || 'Agent' },
      { onSuccess: () => toast({ title: 'You are now handling this lead' }) }
    )
  }

  const cibilScore = lead.cibilScore ?? lead.cibil
  const eligibleAmount = lead.amount // real eligible amount lives here

  return (
    <>
      {modal && (
        <AssignModal lead={lead} mode={modal} onClose={() => setModal(null)} />
      )}
      {deleteOpen && (
        <DeleteLeadModal lead={lead} onClose={() => setDeleteOpen(false)} />
      )}
      {reportOpen && (
        <LeadReportModal lead={lead} onClose={() => setReportOpen(false)} />
      )}
      {docsOpen && (
        <DocSelectModal lead={lead} onClose={() => setDocsOpen(false)} />
      )}

      <div className="rounded-md border border-black/5 bg-white p-5 shadow-sm shadow-black/5">

        {/* Top row: avatar + name + badges + actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-black text-white">
              {lead.initials}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-ink">{lead.name}</h1>
                <Badge value={lead.status} />
                {cibilScore > 0 && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    cibilScore >= 750 ? 'bg-green-50 text-green-700 border-green-200' :
                    cibilScore >= 650 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-brand-50 text-brand-700 border-brand-100'
                  }`}>
                    CIBIL {cibilScore}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span className="font-mono text-subtle">{lead.id}</span>
                {lead.leadCode && <span className="text-subtle">·</span>}
                {lead.leadCode && <span className="font-medium">{lead.leadCode}</span>}
              </div>

              <a
                href={`tel:${lead.phone}`}
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-subtle hover:text-brand-600 transition"
              >
                <Phone className="h-3 w-3" />
                {lead.phone}
              </a>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModal('assign')}
              className="flex items-center gap-1.5 rounded bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-[#fee2e2] transition"
            >
              <UserPlus className="h-3.5 w-3.5" /> Assign
            </button>
            <button
              type="button"
              onClick={() => setModal('transfer')}
              className="flex items-center gap-1.5 rounded bg-white border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-surface transition"
            >
              <Users className="h-3.5 w-3.5" /> Transfer
            </button>
            <button
              type="button"
              onClick={handleHandleMyself}
              disabled={mutation.isPending || lead.assignedUser === user?.name}
              className="flex items-center gap-1.5 rounded bg-white border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-surface transition disabled:opacity-50"
            >
              {mutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <UserCheck className="h-3.5 w-3.5" />}
              Handle Myself
            </button>
            {/* Report — visible to admin + agent */}
            {(role === 'admin' || role === 'agent') && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-1.5 rounded bg-white border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-surface transition"
                title="Generate PDF report"
              >
                <FileText className="h-3.5 w-3.5" /> Report
              </button>
            )}
            {/* Export docs — opens selection modal */}
            {(role === 'admin' || role === 'agent' || role === 'lead_generator') && (
              <button
                type="button"
                onClick={() => setDocsOpen(true)}
                className="flex items-center gap-1.5 rounded bg-white border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-surface transition"
                title="Download selected documents"
              >
                <Download className="h-3.5 w-3.5" /> Docs
              </button>
            )}
            {role === 'admin' && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-1.5 rounded bg-white border border-line px-3 py-2 text-xs font-semibold text-subtle hover:bg-[#FEF2F2] hover:text-brand-600 hover:border-[#FECACA] transition"
                title="Delete lead (admin only)"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-50 pt-4 sm:grid-cols-3 lg:grid-cols-6">
          <InfoChip label="Loan Type"       value={lead.loanType} />
          <InfoChip label="Requested"       value={formatAmount(lead.amount)} />
          <InfoChip label="Eligible"        value={eligibleAmount > 0 ? formatAmount(eligibleAmount) : 'Calculating…'} />
          <InfoChip label="Agent"           value={lead.agent} />
          <InfoChip label="Assigned To"     value={lead.assignedUser ?? 'Unassigned'} />
          <InfoChip label="Created"         value={lead.createdAt} />
        </div>

        {/* Current step indicator */}
        <div className="mt-4 flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-4 py-2.5">
          <Calendar className="h-4 w-4 flex-shrink-0 text-blue-500" />
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-blue-700">Current Step:</span>
            <span className="font-bold text-ink">{lead.currentStep}</span>
            <span className="text-blue-500">·</span>
            <span className="text-muted">{lead.district}</span>
          </div>
          {lead.assignedUser && (
            <>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-muted">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[9px] font-black text-white flex-shrink-0">
                  {lead.assignedUser.charAt(0)}
                </div>
                <span className="font-medium">{lead.assignedUser}</span>
              </div>
            </>
          )}
        </div>

      </div>
    </>
  )
}
