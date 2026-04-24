'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Phone,
  Share2,
  Trash2,
  UserPlus,
} from 'lucide-react'
import Badge from '@/components/common/Badge'
import { useDeleteLead, useUpdateWorkflowStep } from '@/hooks/useLead'
import { getAuthUser, useAuthStore } from '@/store/auth.store'
import { toast } from '@/components/ui/use-toast'
import { cn, formatAmount } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { Lead } from '@/types/lead'
import ShareLeadModal from './ShareLeadModal'

// ── Team members ──────────────────────────────────────────────────────────────

const TEAM_MEMBERS = ['Prashant S.', 'Vrushal S.', 'Ravi M.', 'Krishna P.', 'Deepak J.']

// ── Assign dropdown ───────────────────────────────────────────────────────────

function AssignDropdown({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false)
  const mutation = useUpdateWorkflowStep(lead.id)
  const user = getAuthUser()
  const currentUser = user?.name || 'You'
  const isSelf = lead.assignedUser === currentUser

  function assign(member: string, label: string) {
    mutation.mutate(
      { action: 'assign', assignedUser: member, changedBy: currentUser },
      { onSuccess: () => { toast({ title: label }); setOpen(false) } }
    )
  }

  // Label shown on button: "Me" if self, first word of assignee if someone else
  const assigneeLabel = lead.assignedUser
    ? isSelf ? 'Me' : lead.assignedUser.split(' ')[0]
    : null

  // All members to show in list (self first, then rest)
  const allMembers = [
    currentUser,
    ...TEAM_MEMBERS.filter((m) => m !== currentUser),
  ]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-[#fee2e2]"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Assign
        {assigneeLabel && (
          <span className="ml-1 rounded-full border border-outline bg-white px-1.5 py-0.5 text-[9px] font-bold text-muted">
            {assigneeLabel}
          </span>
        )}
        <ChevronDown className={cn('ml-0.5 h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full z-40 mt-1.5 w-52 rounded-lg border border-outline bg-white py-1 shadow-lg">
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-subtle">Assign to</p>

            {allMembers.map((member) => {
              const isMe      = member === currentUser
              const isCurrent = lead.assignedUser === member
              return (
                <button
                  key={member}
                  type="button"
                  disabled={mutation.isPending || isCurrent}
                  onClick={() => assign(member, isMe ? 'Assigned to you' : `Assigned to ${member}`)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-ink transition hover:bg-surface disabled:opacity-50"
                >
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-outline bg-surface text-[9px] font-bold text-muted">
                    {member.charAt(0)}
                  </div>
                  <span className={cn('flex-1 text-left', isCurrent && 'font-semibold text-ink')}>
                    {isMe ? `${member} (Me)` : member}
                  </span>
                  {isCurrent && (
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Delete modal ──────────────────────────────────────────────────────────────

const DELETE_REASONS = ['Duplicate Lead', 'Invalid Customer', 'Customer Not Interested', 'Wrong Entry', 'Other']

function DeleteLeadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [note, setNote]     = useState('')
  const router   = useRouter()
  const mutation = useDeleteLead()
  const user     = getAuthUser()

  function handleDelete() {
    if (!reason) return
    mutation.mutate(
      { leadId: lead.id, reason, note: note.trim(), deletedBy: user?.name ?? 'Admin', deletedById: user?.mobile ?? 'admin' },
      {
        onSuccess: () => { toast({ title: `Lead ${lead.name} deleted` }); onClose(); router.push('/leads') },
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg border border-black/5 bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#FEF2F2]">
            <AlertTriangle className="h-4 w-4 text-brand-600" />
          </div>
          <h3 className="text-sm font-bold text-ink">Delete Lead</h3>
        </div>
        <p className="mb-4 ml-10 text-xs text-muted">
          Moves <span className="font-semibold text-ink">{lead.name}</span> to deleted leads. Admin can restore later.
        </p>

        <div className="mb-5 space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-subtle">
              Reason <span className="text-brand-500">*</span>
            </label>
            <div className="relative">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full appearance-none rounded-lg border border-line bg-white px-3 py-2 pr-8 text-xs text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-[#FEF2F2]"
              >
                <option value="">Select a reason…</option>
                {DELETE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-subtle" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-subtle">
              Note <span className="font-normal text-subtle">(optional)</span>
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
          <button type="button" onClick={onClose}
            className="flex-1 rounded-md border border-outline bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:bg-[#ececec]"
          >
            Cancel
          </button>
          <button type="button" onClick={handleDelete} disabled={!reason || mutation.isPending}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-brand-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
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
      <p className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-subtle">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-ink">{value || '—'}</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LeadHeader({ lead }: { lead: Lead }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [shareOpen, setShareOpen]   = useState(false)
  const role = useAuthStore((s) => s.role)

  const cibilScore     = lead.cibilScore ?? lead.cibil
  const eligibleAmount = lead.amount

  return (
    <>
      {deleteOpen && <DeleteLeadModal lead={lead} onClose={() => setDeleteOpen(false)} />}
      {shareOpen  && <ShareLeadModal  lead={lead} onClose={() => setShareOpen(false)} />}

      <div className="rounded-md border border-black/5 bg-white p-5 shadow-sm shadow-black/5">

        {/* Top row: avatar + name + badges + CTAs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          {/* Identity */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-black text-white">
              {lead.initials}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-ink">{lead.name}</h1>
                <Badge value={lead.status} />
                {cibilScore > 0 && (
                  <span className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold',
                    cibilScore >= 750 ? 'border-green-200 bg-green-50 text-green-700' :
                    cibilScore >= 650 ? 'border-amber-200 bg-amber-50 text-amber-700' :
                    'border-brand-100 bg-brand-50 text-brand-700'
                  )}>
                    CIBIL {cibilScore}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span className="font-mono text-subtle">{lead.id}</span>
                {lead.leadCode && <><span className="text-subtle">·</span><span className="font-medium">{lead.leadCode}</span></>}
              </div>

              <a href={`tel:${lead.phone}`}
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-subtle transition hover:text-brand-600"
              >
                <Phone className="h-3 w-3" />{lead.phone}
              </a>
            </div>
          </div>

          {/* ── 2 CTAs + optional Delete ── */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Assign — dropdown */}
            <AssignDropdown lead={lead} />

            {/* Share Lead — primary */}
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 rounded border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-surface"
            >
              <Share2 className="h-3.5 w-3.5" /> Share Lead
            </button>

            {/* Delete — admin only, low-key */}
            {role === 'admin' && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-1.5 rounded border border-outline bg-white px-3 py-2 text-xs font-semibold text-subtle transition hover:border-[#FECACA] hover:bg-[#FEF2F2] hover:text-brand-600"
                title="Delete lead (admin only)"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-50 pt-4 sm:grid-cols-3 lg:grid-cols-6">
          <InfoChip label="Loan Type"   value={lead.loanType} />
          <InfoChip label="Requested"   value={formatAmount(lead.amount)} />
          <InfoChip label="Eligible"    value={eligibleAmount > 0 ? formatAmount(eligibleAmount) : 'Calculating…'} />
          <InfoChip label="Agent"       value={lead.agent} />
          <InfoChip label="Assigned To" value={lead.assignedUser ?? 'Unassigned'} />
          <InfoChip label="Created"     value={lead.createdAt} />
        </div>

        {/* Current step banner */}
        <div className="mt-4 flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-4 py-2.5">
          <Calendar className="h-4 w-4 flex-shrink-0 text-blue-500" />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-blue-700">Current Step:</span>
            <span className="font-bold text-ink">{lead.currentStep}</span>
            <span className="text-blue-400">·</span>
            <span className="text-muted">{lead.district}</span>
          </div>
          {lead.assignedUser && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-muted">
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-[9px] font-black text-white">
                {lead.assignedUser.charAt(0)}
              </div>
              <span className="font-medium">{lead.assignedUser}</span>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
