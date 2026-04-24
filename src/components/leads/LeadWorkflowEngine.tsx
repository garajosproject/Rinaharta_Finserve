'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Loader2,
  Lock,
  PauseCircle,
  Paperclip,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { cn, formatAmount } from '@/lib/utils'
import { useUpdateWorkflowStep, useUpsertChecklistItem } from '@/hooks/useLead'
import { getAuthUser } from '@/store/auth.store'
import { toast } from '@/components/ui/use-toast'
import type { Lead, WorkflowHistoryEntry, WorkflowStep, WorkflowStepName, WorkflowStepStatus } from '@/types/lead'

// ── Constants ─────────────────────────────────────────────────────────────────

const STEP_ORDER: WorkflowStepName[] = [
  'Inquiry', 'KYC', 'File Login', 'Verification', 'Sanction', 'Disbursement',
]

const SMART_CTA: Record<WorkflowStepName, string> = {
  'Inquiry':     'Lead Captured',
  'KYC':         'Complete KYC',
  'File Login':  'Login File to Bank',
  'Verification':'Update Verification',
  'Sanction':    'Add Sanction Details',
  'Disbursement':'Complete Disbursement',
}

// ── Shared field primitives ───────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink placeholder:text-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-50 outline-none'

const labelCls = 'block text-[10px] font-bold uppercase tracking-[0.1em] text-subtle mb-1'

// Custom select with ChevronDown overlay
function StepSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputCls, 'appearance-none pr-8')}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle" />
      </div>
    </div>
  )
}

// Amount input with live formatAmount preview
function AmountField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | number | null | undefined
  onChange: (v: string) => void
}) {
  const raw = String(value ?? '')
  const num = Number(raw.replace(/\D/g, ''))
  const preview = num > 0 ? formatAmount(num) : null

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="text"
        inputMode="numeric"
        className={inputCls}
        placeholder="e.g. 4500000"
        value={raw}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
      />
      {preview && (
        <p className="mt-1 text-[11px] font-bold text-brand-600">{preview}</p>
      )}
    </div>
  )
}

// ── Doc map: workflow fieldKey → checklist item ───────────────────────────────

const STEP_DOC_MAP: Partial<Record<WorkflowStepName, Record<string, { id: string; name: string }>>> = {
  KYC:          {
    aadhaarUpload: { id: 'aadhaar',           name: 'Aadhaar Card'       },
    panUpload:     { id: 'pan',               name: 'PAN Card'           },
  },
  'File Login': {
    uploadProof:   { id: 'bank-login-doc',    name: 'Bank Login Proof'   },
  },
  Verification: {
    uploadProof:   { id: 'verification-doc',  name: 'Verification Report'},
  },
  Sanction: {
    sanctionLetter:{ id: 'sanction-letter',   name: 'Sanction Letter'    },
  },
  Disbursement: {
    uploadProof:   { id: 'disbursement-proof', name: 'Disbursement Proof' },
  },
}

// Connected file field — reads/writes from lead.checklist (single source of truth)
function ConnectedFileField({
  label,
  docId,
  docName,
  leadId,
  checklist,
  accept = '*',
}: {
  label: string
  docId: string
  docName: string
  leadId: string
  checklist: import('@/types/lead').ChecklistItem[]
  accept?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const mutation = useUpsertChecklistItem(leadId)

  const item = checklist.find((c) => c.id === docId || c.name.toLowerCase() === docName.toLowerCase())
  const isUploaded = item?.status === 'uploaded' || item?.status === 'verified'

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: 'File too large — max 4 MB' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      mutation.mutate({
        docId,
        docName,
        updates: {
          status: 'uploaded',
          fileData: reader.result as string,
          fileType: file.type,
          fileSize: file.size,
          uploadedAt: new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
          rejectedReason: null,
        },
      })
    }
    reader.readAsDataURL(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleRemove() {
    mutation.mutate({
      docId,
      docName,
      updates: { status: 'pending', fileData: null, fileType: null, fileSize: null, uploadedAt: null },
    })
  }

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />

      {isUploaded && item ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
          <span className="flex-1 truncate text-xs font-medium text-green-800">
            {item.uploadedAt || docName}
          </span>
          {item.status === 'verified' && (
            <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Verified</span>
          )}
          {item.status === 'uploaded' && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">Uploaded</span>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="ml-1 flex-shrink-0 text-subtle hover:text-brand-600 transition"
            title="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={mutation.isPending}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-line bg-surface px-3 py-2.5 text-xs text-subtle hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 transition disabled:opacity-50"
        >
          {mutation.isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
            : <Upload className="h-3.5 w-3.5 flex-shrink-0" />}
          {mutation.isPending ? 'Saving…' : 'Click to upload file'}
        </button>
      )}
    </div>
  )
}

// ── Status helpers ────────────────────────────────────────────────────────────

type StepState = 'completed' | 'current' | 'locked' | 'rejected' | 'on_hold'

function getStepState(step: WorkflowStep, currentStep: WorkflowStepName): StepState {
  const stepIdx   = STEP_ORDER.indexOf(step.stepName)
  const currentIdx = STEP_ORDER.indexOf(currentStep)
  if (step.status === 'rejected') return 'rejected'
  if (step.status === 'on_hold')  return 'on_hold'
  if (step.status === 'completed') return 'completed'
  if (stepIdx === currentIdx) return 'current'
  return 'locked'
}

const STATUS_CONFIG: Record<WorkflowStepStatus, { label: string; cls: string }> = {
  pending:     { label: 'Pending',     cls: 'bg-surface text-subtle border-outline' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed:   { label: 'Completed',   cls: 'bg-green-50 text-green-700 border-green-200' },
  rejected:    { label: 'Rejected',    cls: 'bg-brand-50 text-brand-700 border-brand-100' },
  on_hold:     { label: 'On Hold',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
}

function StatusBadge({ status }: { status: WorkflowStepStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

// ── History log ───────────────────────────────────────────────────────────────

function HistoryLog({ history }: { history: WorkflowHistoryEntry[] }) {
  const [open, setOpen] = useState(false)
  if (!history.length) return null
  const sorted = [...history].reverse()

  return (
    <div className="mt-4 border-t border-outline pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-subtle hover:text-ink transition"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        History ({history.length})
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {sorted.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 rounded-md bg-surface px-3 py-2">
              <div className="mt-0.5 flex-shrink-0">
                {entry.status === 'completed'   && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                {entry.status === 'rejected'    && <XCircle      className="h-3.5 w-3.5 text-brand-500" />}
                {entry.status === 'on_hold'     && <PauseCircle  className="h-3.5 w-3.5 text-amber-500" />}
                {entry.status === 'in_progress' && <Clock        className="h-3.5 w-3.5 text-blue-500" />}
                {entry.status === 'pending'     && <Clock        className="h-3.5 w-3.5 text-subtle" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={entry.status} />
                  <span className="text-[10px] text-subtle">
                    {entry.action === 'edited'
                      ? 'Edited'
                      : entry.previousStatus
                        ? `${STATUS_CONFIG[entry.previousStatus].label} → ${STATUS_CONFIG[entry.status].label}`
                        : 'Created'}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-subtle">
                  <span className="font-medium text-muted">{entry.changedBy}</span>
                  <span>·</span>
                  <span>{new Date(entry.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {entry.remarks && <p className="mt-1 text-[11px] text-muted">{entry.remarks}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Step forms ────────────────────────────────────────────────────────────────

const KYC_TYPES   = ['Aadhaar', 'PAN', 'Voter ID', 'Driving License', 'Passport']
const BANKS       = ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra', 'PNB', 'Bank of Baroda', 'Canara Bank', 'Other']
const VERIFY_STATUS = ['Pending', 'In Review', 'Verified', 'Rejected']
const LOAN_RATE_TYPES = ['Fixed Rate', 'Floating Rate']

function KYCForm({ data, onChange, lead }: { data: WorkflowStep['data']; onChange: (k: string, v: string) => void; lead: Lead }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <ConnectedFileField
        label="Aadhaar Upload"
        docId="aadhaar"
        docName="Aadhaar Card"
        leadId={lead.id}
        checklist={lead.checklist}
        accept=".pdf,.jpg,.jpeg,.png"
      />
      <ConnectedFileField
        label="PAN Upload"
        docId="pan"
        docName="PAN Card"
        leadId={lead.id}
        checklist={lead.checklist}
        accept=".pdf,.jpg,.jpeg,.png"
      />
      <StepSelect
        label="KYC Document Type"
        value={data.kycNotes?.startsWith('Type:') ? data.kycNotes.replace('Type: ', '') : ''}
        options={KYC_TYPES}
        onChange={(v) => onChange('kycNotes', v ? `Type: ${v}` : '')}
        placeholder="Select KYC type…"
      />
      <div className="sm:col-span-2">
        <label className={labelCls}>Notes</label>
        <textarea
          className={cn(inputCls, 'resize-none')}
          rows={2}
          placeholder="Any KYC remarks…"
          value={data.kycNotes?.startsWith('Type:') ? '' : (data.kycNotes ?? '')}
          onChange={(e) => onChange('kycNotes', e.target.value)}
        />
      </div>
    </div>
  )
}

function FileLoginForm({ data, onChange, lead }: { data: WorkflowStep['data']; onChange: (k: string, v: string) => void; lead: Lead }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <StepSelect
        label="Bank Name"
        value={data.bankName ?? ''}
        options={BANKS}
        onChange={(v) => onChange('bankName', v)}
        placeholder="Select bank…"
      />
      <div>
        <label className={labelCls}>Application ID</label>
        <input
          className={inputCls}
          placeholder="e.g. HDFC-2024-00142"
          value={data.applicationId ?? ''}
          onChange={(e) => onChange('applicationId', e.target.value)}
        />
      </div>
      <div>
        <label className={labelCls}>Submission Date</label>
        <input
          type="date"
          className={inputCls}
          value={data.submissionDate ?? ''}
          onChange={(e) => onChange('submissionDate', e.target.value)}
        />
      </div>
      <ConnectedFileField
        label="Submission Proof"
        docId="bank-login-doc"
        docName="Bank Login Proof"
        leadId={lead.id}
        checklist={lead.checklist}
        accept=".pdf,.jpg,.jpeg,.png"
      />
    </div>
  )
}

function VerificationForm({ data, onChange, lead }: { data: WorkflowStep['data']; onChange: (k: string, v: string) => void; lead: Lead }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <StepSelect
        label="Verification Status"
        value={data.verificationStatus ?? ''}
        options={VERIFY_STATUS}
        onChange={(v) => onChange('verificationStatus', v)}
        placeholder="Select status…"
      />
      <div>
        <label className={labelCls}>Verification Date</label>
        <input
          type="date"
          className={inputCls}
          value={data.verificationDate ?? ''}
          onChange={(e) => onChange('verificationDate', e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Remarks</label>
        <textarea
          className={cn(inputCls, 'resize-none')}
          rows={2}
          placeholder="Verification notes…"
          value={data.verificationRemarks ?? ''}
          onChange={(e) => onChange('verificationRemarks', e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <ConnectedFileField
          label="Verification Proof (Optional)"
          docId="verification-doc"
          docName="Verification Report"
          leadId={lead.id}
          checklist={lead.checklist}
          accept=".pdf,.jpg,.jpeg,.png"
        />
      </div>
    </div>
  )
}

function SanctionForm({ data, onChange, lead }: { data: WorkflowStep['data']; onChange: (k: string, v: string) => void; lead: Lead }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <AmountField
        label="Approved Amount (₹)"
        value={data.approvedAmount}
        onChange={(v) => onChange('approvedAmount', v)}
      />
      <div>
        <label className={labelCls}>Interest Rate (%)</label>
        <input
          className={inputCls}
          placeholder="e.g. 9.5"
          value={data.interestRate ?? ''}
          onChange={(e) => onChange('interestRate', e.target.value)}
        />
      </div>
      <div>
        <label className={labelCls}>Tenure</label>
        <input
          className={inputCls}
          placeholder="e.g. 240 months"
          value={data.tenure ?? ''}
          onChange={(e) => onChange('tenure', e.target.value)}
        />
      </div>
      <StepSelect
        label="Rate Type"
        value={(data as Record<string, string | null | undefined>).rateType ?? ''}
        options={LOAN_RATE_TYPES}
        onChange={(v) => onChange('rateType', v)}
        placeholder="Select rate type…"
      />
      <div className="sm:col-span-2">
        <ConnectedFileField
          label="Sanction Letter"
          docId="sanction-letter"
          docName="Sanction Letter"
          leadId={lead.id}
          checklist={lead.checklist}
          accept=".pdf"
        />
      </div>
    </div>
  )
}

function DisbursementForm({ data, onChange, lead }: { data: WorkflowStep['data']; onChange: (k: string, v: string) => void; lead: Lead }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <AmountField
        label="Disbursed Amount (₹)"
        value={data.disbursedAmount}
        onChange={(v) => onChange('disbursedAmount', v)}
      />
      <div>
        <label className={labelCls}>Disbursement Date</label>
        <input
          type="date"
          className={inputCls}
          value={data.disbursementDate ?? ''}
          onChange={(e) => onChange('disbursementDate', e.target.value)}
        />
      </div>
      <div>
        <label className={labelCls}>Transaction ID</label>
        <input
          className={inputCls}
          placeholder="e.g. HDFC-TXN-123456"
          value={data.transactionId ?? ''}
          onChange={(e) => onChange('transactionId', e.target.value)}
        />
      </div>
      <ConnectedFileField
        label="Disbursement Proof"
        docId="disbursement-proof"
        docName="Disbursement Proof"
        leadId={lead.id}
        checklist={lead.checklist}
        accept=".pdf,.jpg,.jpeg,.png"
      />
      <div className="sm:col-span-2">
        <label className={labelCls}>Notes</label>
        <textarea
          className={cn(inputCls, 'resize-none')}
          rows={2}
          placeholder="Disbursement notes…"
          value={data.disbursementNotes ?? ''}
          onChange={(e) => onChange('disbursementNotes', e.target.value)}
        />
      </div>
    </div>
  )
}

// ── Read-only display ─────────────────────────────────────────────────────────

function docStatus(checklist: Lead['checklist'], docId: string): string | null {
  const item = checklist.find((c) => c.id === docId)
  if (!item || item.status === 'pending') return null
  if (item.status === 'verified') return '✓ Verified'
  if (item.status === 'rejected') return '✗ Rejected'
  return 'Uploaded'
}

function ReadOnlyStepData({ step, lead }: { step: WorkflowStep; lead: Lead }) {
  const d = step.data as Record<string, string | number | null | undefined>
  const rows: Array<[string, string]> = []

  if (step.stepName === 'KYC') {
    const a = docStatus(lead.checklist, 'aadhaar')
    const p = docStatus(lead.checklist, 'pan')
    if (a) rows.push(['Aadhaar', a])
    if (p) rows.push(['PAN', p])
    if (d.kycNotes) rows.push(['Notes', String(d.kycNotes)])
  }
  if (step.stepName === 'File Login') {
    if (d.bankName)       rows.push(['Bank', String(d.bankName)])
    if (d.applicationId)  rows.push(['Application ID', String(d.applicationId)])
    if (d.submissionDate) rows.push(['Submission Date', String(d.submissionDate)])
    const proof = docStatus(lead.checklist, 'bank-login-doc')
    if (proof) rows.push(['Proof', proof])
  }
  if (step.stepName === 'Verification') {
    if (d.verificationStatus)  rows.push(['Status', String(d.verificationStatus)])
    if (d.verificationDate)    rows.push(['Date', String(d.verificationDate)])
    if (d.verificationRemarks) rows.push(['Remarks', String(d.verificationRemarks)])
    const proof = docStatus(lead.checklist, 'verification-doc')
    if (proof) rows.push(['Report', proof])
  }
  if (step.stepName === 'Sanction') {
    if (d.approvedAmount != null) rows.push(['Approved Amount', formatAmount(Number(d.approvedAmount))])
    if (d.interestRate)           rows.push(['Interest Rate', `${d.interestRate}%`])
    if (d.tenure)                 rows.push(['Tenure', String(d.tenure)])
    if (d.rateType)               rows.push(['Rate Type', String(d.rateType)])
    const letter = docStatus(lead.checklist, 'sanction-letter')
    if (letter) rows.push(['Sanction Letter', letter])
  }
  if (step.stepName === 'Disbursement') {
    if (d.disbursedAmount != null) rows.push(['Disbursed Amount', formatAmount(Number(d.disbursedAmount))])
    if (d.disbursementDate)        rows.push(['Date', String(d.disbursementDate)])
    if (d.transactionId)           rows.push(['Transaction ID', String(d.transactionId)])
    const proof = docStatus(lead.checklist, 'disbursement-proof')
    if (proof) rows.push(['Proof', proof])
    if (d.disbursementNotes) rows.push(['Notes', String(d.disbursementNotes)])
  }

  if (!rows.length) return <p className="text-xs text-subtle italic">No data recorded</p>

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-subtle">{label}</dt>
          <dd className="mt-0.5 text-xs font-medium text-ink break-all">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

// ── Step panel ────────────────────────────────────────────────────────────────

function StepPanel({ step, lead, isReadOnly }: {
  step: WorkflowStep
  lead: Lead
  isReadOnly: boolean
}) {
  const [localData, setLocalData] = useState<WorkflowStep['data']>({ ...step.data })
  const [remarks, setRemarks]     = useState('')
  const [saving, setSaving]       = useState(false)

  const mutation = useUpdateWorkflowStep(lead.id)
  const user = getAuthUser()

  function handleChange(key: string, val: string) {
    setLocalData((prev) => ({ ...prev, [key]: val }))
  }

  function handleSave() {
    setSaving(true)
    mutation.mutate(
      { action: 'update_step', stepName: step.stepName, data: localData, remarks: remarks || undefined, changedBy: user?.name || 'Agent' },
      { onSuccess: () => { toast({ title: `${step.stepName} saved` }); setSaving(false) }, onError: () => setSaving(false) }
    )
  }

  function handleStatusChange(newStatus: WorkflowStepStatus) {
    if ((newStatus === 'rejected' || newStatus === 'on_hold') && !remarks.trim()) {
      toast({ title: `${newStatus === 'rejected' ? 'Rejection reason' : 'Hold note'} required` })
      return
    }
    setSaving(true)
    mutation.mutate(
      { action: 'update_step', stepName: step.stepName, status: newStatus, data: localData, remarks, changedBy: user?.name || 'Agent' },
      {
        onSuccess: () => {
          toast({ title: newStatus === 'completed' ? `${step.stepName} completed ✓` : `Status → ${newStatus}` })
          setSaving(false)
          setRemarks('')
        },
        onError: () => setSaving(false),
      }
    )
  }

  const hasData = step.stepName !== 'Inquiry'

  return (
    <div className="space-y-4">
      {/* Step form */}
      {hasData && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-subtle">Step Details</p>
          {isReadOnly ? (
            <ReadOnlyStepData step={step} lead={lead} />
          ) : (
            <>
              {step.stepName === 'KYC'          && <KYCForm          data={localData} onChange={handleChange} lead={lead} />}
              {step.stepName === 'File Login'   && <FileLoginForm    data={localData} onChange={handleChange} lead={lead} />}
              {step.stepName === 'Verification' && <VerificationForm data={localData} onChange={handleChange} lead={lead} />}
              {step.stepName === 'Sanction'     && <SanctionForm     data={localData} onChange={handleChange} lead={lead} />}
              {step.stepName === 'Disbursement' && <DisbursementForm data={localData} onChange={handleChange} lead={lead} />}
            </>
          )}
        </div>
      )}

      {/* Status control */}
      {!isReadOnly && step.stepName !== 'Inquiry' && (
        <div className="rounded-md border border-outline bg-surface p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-subtle">Status Control</p>

          <div>
            <label className={labelCls}>Remarks</label>
            <textarea
              className={cn(inputCls, 'resize-none')}
              rows={2}
              placeholder={
                step.status === 'rejected' ? 'Rejection reason (required)…' :
                step.status === 'on_hold'  ? 'Hold reason (required)…' :
                'Optional remarks…'
              }
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button" onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-white border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Save
            </button>

            <button
              type="button" onClick={() => handleStatusChange('on_hold')} disabled={saving || step.status === 'on_hold'}
              className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition disabled:opacity-40"
            >
              <PauseCircle className="h-3.5 w-3.5" /> Hold
            </button>

            <button
              type="button" onClick={() => handleStatusChange('rejected')} disabled={saving || step.status === 'rejected'}
              className="flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-[#fee2e2] transition disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>

            {step.status !== 'completed' && (
              <button
                type="button" onClick={() => handleStatusChange('completed')} disabled={saving}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-700 px-4 py-1.5 text-xs font-bold text-white transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {SMART_CTA[step.stepName]}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inquiry auto-complete banner */}
      {step.stepName === 'Inquiry' && step.status === 'completed' && (
        <div className="rounded-md border border-green-100 bg-green-50 px-4 py-3 text-xs text-green-700">
          <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5" />
          Auto-completed on lead creation
        </div>
      )}

      <HistoryLog history={step.history} />
    </div>
  )
}

// ── Timeline node ─────────────────────────────────────────────────────────────

function TimelineNode({ step, state, isActive, onClick }: {
  step: WorkflowStep
  state: StepState
  isActive: boolean
  onClick: () => void
}) {
  const iconCls = cn(
    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-black flex-shrink-0 transition',
    state === 'completed' && 'bg-green-500 text-white',
    state === 'current'   && 'bg-brand-500 text-white ring-4 ring-brand-50',
    state === 'rejected'  && 'bg-brand-500 text-white',
    state === 'on_hold'   && 'bg-amber-500 text-white',
    state === 'locked'    && 'bg-surface text-subtle border border-outline',
  )
  const stepIdx = STEP_ORDER.indexOf(step.stepName)

  return (
    <button
      type="button" onClick={onClick}
      title={state === 'locked' ? 'Complete previous steps first' : undefined}
      className={cn('group flex flex-col items-center gap-1.5 transition', state === 'locked' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}
    >
      <div className="relative">
        <div className={iconCls}>
          {state === 'completed' && <CheckCircle2 className="h-4 w-4" />}
          {state === 'rejected'  && <XCircle      className="h-4 w-4" />}
          {state === 'on_hold'   && <PauseCircle  className="h-4 w-4" />}
          {state === 'locked'    && <Lock         className="h-3.5 w-3.5" />}
          {state === 'current'   && <span className="text-[11px] font-black">{stepIdx + 1}</span>}
        </div>
        {isActive && <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-500" />}
      </div>
      <span className={cn('text-[10px] font-bold leading-tight text-center', isActive ? 'text-brand-700' : state === 'completed' ? 'text-green-700' : 'text-subtle')}>
        {step.stepName}
      </span>
      <StatusBadge status={step.status} />
    </button>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function LeadWorkflowEngine({ lead }: { lead: Lead }) {
  const [activeStep, setActiveStep] = useState<WorkflowStepName>(lead.currentStep)

  // Sync activeStep when lead.currentStep advances after a step completion
  useEffect(() => {
    setActiveStep(lead.currentStep)
  }, [lead.currentStep])

  const activeStepData = lead.workflowSteps.find((s) => s.stepName === activeStep)
  const currentIdx = STEP_ORDER.indexOf(lead.currentStep)
  if (!activeStepData) return null

  const activeState = getStepState(activeStepData, lead.currentStep)
  const isReadOnly = activeState === 'completed' || activeState === 'locked'

  return (
    <div className="rounded-md border border-black/5 bg-white shadow-sm shadow-black/5 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Loan Processing</p>
        <h2 className="mt-0.5 text-base font-extrabold text-ink">Workflow Engine</h2>
      </div>

      {/* Timeline */}
      <div className="border-b border-gray-100 bg-[#faf9f9] px-5 py-5">
        <div className="flex items-start justify-between gap-2 overflow-x-auto pb-1">
          {lead.workflowSteps.map((step, idx) => {
            const state = getStepState(step, lead.currentStep)
            return (
              <div key={step.stepName} className="flex items-center gap-2 flex-shrink-0">
                <TimelineNode
                  step={step} state={state} isActive={activeStep === step.stepName}
                  onClick={() => state !== 'locked' && setActiveStep(step.stepName)}
                />
                {idx < lead.workflowSteps.length - 1 && (
                  <div className={cn('h-px w-8 flex-shrink-0 mt-[-14px]', idx < currentIdx ? 'bg-green-300' : 'bg-outline')} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Active step panel */}
      <div className="px-5 py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink">{activeStep}</h3>
            <StatusBadge status={activeStepData.status} />
            {isReadOnly && <span className="text-[10px] text-subtle italic">Read-only</span>}
          </div>
          {activeState === 'locked' && (
            <div className="flex items-center gap-1 text-[11px] text-subtle">
              <Lock className="h-3 w-3" /> Complete previous steps first
            </div>
          )}
          {activeState === 'rejected' && (
            <div className="flex items-center gap-1 text-[11px] text-brand-700">
              <AlertCircle className="h-3 w-3" /> Step rejected
            </div>
          )}
        </div>

        <StepPanel key={activeStep} step={activeStepData} lead={lead} isReadOnly={isReadOnly} />
      </div>
    </div>
  )
}
