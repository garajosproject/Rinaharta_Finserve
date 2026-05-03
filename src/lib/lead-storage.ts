/**
 * lead-storage.ts — dual-mode storage layer
 *
 * Priority 1: Supabase (when NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY are set)
 * Priority 2: localStorage (local dev / fallback)
 *
 * All exported functions return Promises — service layer awaits them.
 * Business logic unchanged; only storage primitives swapped.
 */

import { buildDocsFromChecklist, syncLeadProgressFromAdminStatus } from '@/lib/admin-leads'
import { buildDistrictCode } from '@/lib/lead-form'
import { supabase, hasSupabase } from '@/lib/supabase'
import type {
  AdminLeadStatus,
  ChecklistItem,
  CibilSource,
  Lead,
  LeadActivity,
  LeadIssue,
  LeadNote,
  NewLeadPayload,
  WorkflowStep,
  WorkflowStepName,
  WorkflowStepStatus,
} from '@/types/lead'

// ── localStorage keys (fallback mode) ────────────────────────────────────────

const ACTIVE_KEY  = 'finserve-active-leads'
const DELETED_KEY = 'finserve-deleted-leads'

// ── localStorage R/W ──────────────────────────────────────────────────────────

function lsRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function lsWrite<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* full */ }
}

function lsGetActive(): Lead[]  { return lsRead<Lead[]>(ACTIVE_KEY, []) }
function lsSaveActive(v: Lead[]): void { lsWrite(ACTIVE_KEY, v) }
function lsGetDeleted(): Lead[] { return lsRead<Lead[]>(DELETED_KEY, []) }
function lsSaveDeleted(v: Lead[]): void { lsWrite(DELETED_KEY, v) }

// ── Supabase row helpers ──────────────────────────────────────────────────────

function toRow(lead: Lead) {
  return {
    id:            lead.id,
    name:          lead.name,
    phone:         lead.phone,
    loan_type:     lead.loanType,
    status:        lead.status,
    admin_status:  lead.adminStatus,
    assigned_user: lead.assignedUser ?? null,
    agent:         lead.agent ?? null,
    is_deleted:    lead.isDeleted ?? false,
    deleted_at:    lead.deletedAt ?? null,
    deleted_by:    lead.deletedBy ?? null,
    delete_reason: lead.deleteReason ?? null,
    delete_note:   lead.deleteNote ?? null,
    data:          lead as unknown as Record<string, unknown>,
  }
}

function fromRow(row: Record<string, unknown>): Lead {
  return row.data as Lead
}

// ── Core storage primitives ───────────────────────────────────────────────────

async function dbGetActive(): Promise<Lead[]> {
  if (hasSupabase()) {
    const { data, error } = await supabase!
      .from('leads')
      .select('data')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => fromRow(r as Record<string, unknown>))
  }
  return lsGetActive()
}

async function dbGetDeleted(): Promise<Lead[]> {
  if (hasSupabase()) {
    const { data, error } = await supabase!
      .from('leads')
      .select('data')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => fromRow(r as Record<string, unknown>))
  }
  return lsGetDeleted()
}

async function dbFindOne(id: string): Promise<Lead | null> {
  if (hasSupabase()) {
    const { data, error } = await supabase!
      .from('leads')
      .select('data')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? fromRow(data as Record<string, unknown>) : null
  }
  const all = [...lsGetActive(), ...lsGetDeleted()]
  return all.find((l) => l.id === id) ?? null
}

async function dbUpsert(lead: Lead): Promise<void> {
  if (hasSupabase()) {
    const { error } = await supabase!.from('leads').upsert(toRow(lead))
    if (error) throw error
    return
  }
  // localStorage upsert
  if (lead.isDeleted) {
    const deleted = lsGetDeleted()
    const idx = deleted.findIndex((l) => l.id === lead.id)
    if (idx >= 0) deleted[idx] = lead; else deleted.unshift(lead)
    lsSaveDeleted(deleted)
    // Remove from active if present
    lsSaveActive(lsGetActive().filter((l) => l.id !== lead.id))
  } else {
    const active = lsGetActive()
    const idx = active.findIndex((l) => l.id === lead.id)
    if (idx >= 0) active[idx] = lead; else active.unshift(lead)
    lsSaveActive(active)
    // Remove from deleted if present
    lsSaveDeleted(lsGetDeleted().filter((l) => l.id !== lead.id))
  }
}

async function dbDelete(id: string): Promise<void> {
  // Soft-deletes are handled via dbUpsert with is_deleted=true.
  // Hard delete not used in this app.
  if (!hasSupabase()) {
    lsSaveActive(lsGetActive().filter((l) => l.id !== id))
  }
}

// ── patchActive — read → transform → write ────────────────────────────────────

async function patchActive(id: string, updater: (lead: Lead) => Lead): Promise<Lead | null> {
  const lead = await dbFindOne(id)
  if (!lead || lead.isDeleted) return null
  const updated = updater(lead)
  await dbUpsert(updated)
  return structuredClone(updated)
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

function nowLabel(): string {
  return new Date().toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '').join('')
}

function formatPhone(digits: string): string {
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '')
}

async function buildLeadId(): Promise<string> {
  if (hasSupabase()) {
    const { data } = await supabase!.from('leads').select('id')
    const maxId = (data ?? []).reduce((max, row) => {
      const n = Number((row.id as string).replace(/\D/g, ''))
      return Number.isFinite(n) ? Math.max(max, n) : max
    }, 0)
    return `L${String(maxId + 1).padStart(3, '0')}`
  }
  const all = [...lsGetActive(), ...lsGetDeleted()]
  const maxId = all.reduce((max, l) => {
    const n = Number(l.id.replace(/\D/g, ''))
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `L${String(maxId + 1).padStart(3, '0')}`
}

async function buildLeadCode(payload: NewLeadPayload): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2)
  const districtCode = buildDistrictCode(payload.district)
  const prefix = `RF-${payload.agentCode}-${districtCode}-${year}-`
  let count: number
  if (hasSupabase()) {
    const { count: c } = await supabase!
      .from('leads').select('id', { count: 'exact', head: true })
      .like('id', `${prefix}%`)
    count = (c ?? 0) + 1
  } else {
    count = lsGetActive().filter((l) => l.leadCode?.startsWith(prefix)).length + 1
  }
  return `${prefix}${String(count).padStart(3, '0')}`
}

function appendActivity(
  lead: Lead, event: string, detail: string, by: string,
  status: LeadActivity['status'] = 'done'
): Lead {
  return {
    ...lead,
    activity: [...lead.activity, { id: `a${Date.now()}`, event, detail, status, date: nowLabel(), by }],
  }
}

// ── Workflow constants ─────────────────────────────────────────────────────────

const WORKFLOW_STEP_ORDER: WorkflowStepName[] = [
  'Inquiry', 'KYC', 'File Login', 'Verification', 'Sanction', 'Disbursement',
]

function buildInitialWorkflowSteps(): WorkflowStep[] {
  return WORKFLOW_STEP_ORDER.map((stepName, idx) => ({
    stepName,
    status: idx === 0 ? 'completed' as WorkflowStepStatus : 'pending' as WorkflowStepStatus,
    data: {},
    history: [{
      id: `h-${stepName}-0`,
      status: idx === 0 ? 'completed' as WorkflowStepStatus : 'pending' as WorkflowStepStatus,
      previousStatus: null,
      changedBy: 'System',
      userId: 'system',
      timestamp: new Date().toISOString(),
      remarks: idx === 0 ? 'Lead created — Inquiry auto-completed' : '',
      action: 'created' as const,
    }],
  }))
}

// ── Checklist builder ──────────────────────────────────────────────────────────

function buildChecklist(payload: NewLeadPayload): ChecklistItem[] {
  const base: ChecklistItem[] = [
    {
      id: 'aadhaar', name: 'Aadhaar Card',
      status: payload.aadhaarUpload ? 'uploaded' : 'pending',
      uploadedAt: payload.aadhaarUpload ? payload.aadhaarUpload.name : null,
      rejectedReason: null, fileSize: payload.aadhaarUpload?.size ?? null,
    },
    {
      id: 'pan', name: 'PAN Card',
      status: payload.panUpload ? 'uploaded' : 'pending',
      uploadedAt: payload.panUpload ? payload.panUpload.name : null,
      rejectedReason: null, fileSize: payload.panUpload?.size ?? null,
    },
    ...payload.documentChecklist.map((item, index) => ({
      id: `loan-doc-${index + 1}`, name: item,
      status: payload.loanDocuments[index] ? ('uploaded' as const) : ('pending' as const),
      uploadedAt: payload.loanDocuments[index]?.name ?? null,
      rejectedReason: null, fileSize: payload.loanDocuments[index]?.size ?? null,
    })),
  ]
  if (payload.loanCategory === 'agriculture') {
    base.push({
      id: 'land-712', name: '7/12 Extract',
      status: payload.land712Upload ? 'uploaded' : 'pending',
      uploadedAt: payload.land712Upload?.name ?? null,
      rejectedReason: null, fileSize: payload.land712Upload?.size ?? null,
    })
  }
  return base
}

function buildActivity(payload: NewLeadPayload, leadCode: string | null): LeadActivity[] {
  return [
    {
      id: 'a1',
      event: payload.submissionMode === 'draft' ? 'Draft Saved' : 'Lead Created',
      detail: payload.submissionMode === 'draft' ? 'Lead stored for later' : `${leadCode ?? 'Pending code'} generated`,
      status: 'done', date: 'Just now', by: 'You (Agent)',
    },
    {
      id: 'a2', event: 'Application Intake',
      detail: `${payload.loanType || 'Loan'} · ${payload.district || 'NA'}`,
      status: 'done', date: 'Just now', by: 'You (Agent)',
    },
    {
      id: 'a3', event: 'Document Readiness',
      detail: `${payload.loanDocuments.length + (payload.aadhaarUpload ? 1 : 0) + (payload.panUpload ? 1 : 0)} files tagged`,
      status: payload.submissionMode === 'draft' ? 'pending' : 'in_progress',
      date: payload.submissionMode === 'draft' ? '' : 'In progress',
      by: payload.submissionMode === 'draft' ? '' : 'System',
    },
  ]
}

async function buildLeadFromPayload(existing: Lead | null, payload: NewLeadPayload): Promise<Lead> {
  const name = payload.customerName.trim() || 'Untitled Lead'
  const mobile = normalizeDigits(payload.customerMobile).slice(0, 10)
  const leadCode = payload.submissionMode === 'submit'
    ? existing?.leadCode ?? await buildLeadCode(payload)
    : null

  const lead: Lead = {
    id:             existing?.id ?? await buildLeadId(),
    leadCode,
    name,
    initials:       getInitials(name),
    phone:          mobile ? formatPhone(mobile) : '',
    email:          payload.emailPersonal || payload.emailOfficial || `${name.toLowerCase().replace(/\s+/g, '.')}@pending.email`,
    loanCategory:   payload.loanCategory || null,
    loanType:       payload.loanType || 'Unknown',
    amount:         (() => { const a = Number(normalizeDigits(payload.annualIncome) || 0); return a > 0 ? a * 2 : 0 })(),
    source:         existing?.source ?? 'agent',
    sourceCode:     (existing?.sourceCode ?? payload.agentCode) || 'GM-NEW',
    bank:           payload.bankName || 'To Be Assigned',
    status:         payload.submissionMode === 'draft' ? 'Draft' : 'New',
    adminStatus:    existing?.adminStatus ?? (
      payload.submissionMode === 'draft' ? 'L1: New Lead' :
      (payload.loanDocuments.length > 0 || payload.aadhaarUpload || payload.panUpload) ? 'L2: Documentation' : 'L1: New Lead'
    ),
    progress:       [
      payload.loanCategory, payload.customerName && payload.customerMobile,
      payload.village && payload.district && payload.permanentAddress,
      payload.occupation && payload.annualIncome,
      payload.bankName && payload.accountNo && payload.ifscCode,
      payload.ref1Name && payload.ref2Name,
      payload.aadhaarNumber && payload.panNumber,
      payload.loanType && payload.documentChecklist.length > 0,
    ].filter(Boolean).length * 12.5,
    agent:          payload.leadName || 'You (Agent)',
    teamLeader:     existing?.teamLeader ?? 'Unassigned',
    cibil:          0,
    cibilScore:     existing?.cibilScore ?? null,
    cibilSource:    existing?.cibilSource ?? null,
    cibilVerified:  existing?.cibilVerified ?? false,
    cibilDocument:  existing?.cibilDocument ?? null,
    cibilUpdatedAt: existing?.cibilUpdatedAt ?? null,
    createdAt:      existing?.createdAt ?? new Date().toISOString().slice(0, 10),
    stage:          payload.submissionMode === 'draft' ? 'Draft saved' : payload.loanDocuments.length === 0 ? 'Lead Created' : 'Ready for review',
    district:       payload.district,
    commissionRate: existing?.commissionRate ?? 1,
    docs:           [],
    checklist:      buildChecklist(payload),
    issues:         existing?.issues ?? [],
    notes: [
      {
        id: `n${Date.now()}`, type: 'system',
        text: existing
          ? `Lead updated · ${payload.loanType || 'Loan'} · ${payload.submissionMode === 'draft' ? 'Draft' : 'Submitted'}`
          : payload.submissionMode === 'draft'
            ? `Draft saved · ${payload.loanType || 'Loan'} · ${payload.district || 'NA'}`
            : `Lead created · ${leadCode ?? 'Pending'} · ${payload.loanType || 'Loan'} · ${payload.district || 'NA'}`,
        author: 'System', role: 'system' as const, time: nowLabel(),
      },
      ...(existing?.notes ?? []),
    ],
    activity: existing
      ? [...existing.activity, {
          id: `a${Date.now()}`,
          event: payload.submissionMode === 'draft' ? 'Lead Draft Updated' : 'Lead Updated',
          detail: `${payload.loanType || 'Loan'} · ${payload.district || 'NA'}`,
          status: 'in_progress' as const, date: nowLabel(), by: payload.leadName || 'Agent',
        }]
      : buildActivity(payload, leadCode),
    intake:            structuredClone(payload),
    lastCompletedStep: existing?.lastCompletedStep ?? 0,
    workflowSteps:     existing?.workflowSteps ?? buildInitialWorkflowSteps(),
    currentStep:       existing?.currentStep ?? 'KYC',
    assignedUser:      existing?.assignedUser ?? null,
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    deletedById:       null,
    deleteReason:      null,
    deleteNote:        null,
  }
  lead.docs = buildDocsFromChecklist(lead)
  return lead
}

// ── Public API — all async ────────────────────────────────────────────────────

export async function storageListLeads(): Promise<Lead[]> {
  return structuredClone(await dbGetActive())
}

export async function storageListDeletedLeads(): Promise<Lead[]> {
  return structuredClone(await dbGetDeleted())
}

export async function storageFindLead(id: string): Promise<Lead | null> {
  const lead = await dbFindOne(id)
  return lead && !lead.isDeleted ? structuredClone(lead) : null
}

export async function storageFindLeadByMobile(mobile: string, excludeId?: string): Promise<Lead | null> {
  const normalized = normalizeDigits(mobile).slice(0, 10)
  if (!normalized) return null
  const leads = await dbGetActive()
  const lead = leads.find(
    (l) => normalizeDigits(l.phone).slice(-10) === normalized && l.id !== excludeId
  )
  return lead ? structuredClone(lead) : null
}

export async function storageCreateLead(payload: NewLeadPayload): Promise<Lead> {
  const lead = await buildLeadFromPayload(null, payload)
  await dbUpsert(lead)
  return structuredClone(lead)
}

export async function storageUpdateLead(id: string, payload: NewLeadPayload, lastCompletedStep?: number): Promise<Lead | null> {
  return patchActive(id, (existing) => {
    // Note: buildLeadFromPayload is async but we need sync here for patchActive.
    // We do a synchronous build using existing data (id, leadCode already known).
    const name = payload.customerName.trim() || 'Untitled Lead'
    const mobile = normalizeDigits(payload.customerMobile).slice(0, 10)
    const leadCode = payload.submissionMode === 'submit' ? existing.leadCode : null
    const lead: Lead = {
      ...existing,
      name,
      initials: getInitials(name),
      phone: mobile ? formatPhone(mobile) : existing.phone,
      loanType: payload.loanType || existing.loanType,
      district: payload.district || existing.district,
      intake: structuredClone(payload),
      lastCompletedStep: lastCompletedStep ?? existing.lastCompletedStep,
      leadCode: payload.submissionMode === 'submit' ? existing.leadCode ?? leadCode : existing.leadCode,
      status: payload.submissionMode === 'draft' ? 'Draft' : existing.status === 'Draft' ? 'New' : existing.status,
      notes: [
        {
          id: `n${Date.now()}`, type: 'system',
          text: `Lead updated · ${payload.loanType || 'Loan'} · ${payload.submissionMode === 'draft' ? 'Draft' : 'Submitted'}`,
          author: 'System', role: 'system' as const, time: nowLabel(),
        },
        ...existing.notes,
      ],
      activity: [...existing.activity, {
        id: `a${Date.now()}`,
        event: payload.submissionMode === 'draft' ? 'Lead Draft Updated' : 'Lead Updated',
        detail: `${payload.loanType || 'Loan'} · ${payload.district || 'NA'}`,
        status: 'in_progress' as const, date: nowLabel(), by: payload.leadName || 'Agent',
      }],
    }
    return lead
  })
}

// Notes
export async function storageAddNote(id: string, message: string, author = 'You (Agent)'): Promise<Lead | null> {
  return patchActive(id, (lead) => {
    const note: LeadNote = {
      id: `n${Date.now()}`, type: 'agent', text: message, author, role: 'agent', time: nowLabel(),
    }
    return appendActivity({ ...lead, notes: [...lead.notes, note] }, 'Note Added', message, author)
  })
}

// Issues
export async function storageAddIssue(
  id: string,
  payload: Pick<LeadIssue, 'type' | 'description' | 'assignedTo' | 'priority'> & { documentId?: string | null }
): Promise<Lead | null> {
  return patchActive(id, (lead) => {
    const issue: LeadIssue = {
      id: `i${Date.now()}`, status: 'open', raisedBy: 'You',
      raisedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      ...payload,
    }
    const linkedDoc = payload.documentId
      ? lead.checklist.find((c) => c.id === payload.documentId)?.name : null
    return appendActivity(
      { ...lead, issues: [issue, ...lead.issues] },
      'Issue Raised',
      linkedDoc ? `${payload.type} linked to ${linkedDoc}` : payload.type,
      'You'
    )
  })
}

export async function storageUpdateIssueStatus(id: string, issueId: string, status: LeadIssue['status']): Promise<Lead | null> {
  return patchActive(id, (lead) => {
    const issues = lead.issues.map((i) => (i.id === issueId ? { ...i, status } : i))
    const target = issues.find((i) => i.id === issueId)
    const next = { ...lead, issues }
    if (!target) return next
    return appendActivity(
      next,
      status === 'resolved' ? 'Issue Resolved' : 'Issue Updated',
      target.type, 'Admin',
      status === 'resolved' ? 'done' : 'in_progress'
    )
  })
}

// Documents / checklist
export async function storageUploadDocument(id: string, fileName: string, fileSize = 0): Promise<Lead | null> {
  return patchActive(id, (lead) => {
    const nextChecklist = [...lead.checklist]
    const target = nextChecklist.find((c) => c.status === 'pending' || c.status === 'rejected')
    if (target) {
      target.status = 'uploaded'; target.uploadedAt = `Uploaded from ${fileName}`
      target.rejectedReason = null; target.fileSize = fileSize
    } else {
      nextChecklist.push({ id: `c${Date.now()}`, name: fileName, status: 'uploaded', uploadedAt: 'Just now', rejectedReason: null, fileSize })
    }
    return appendActivity(
      { ...lead, checklist: nextChecklist, docs: buildDocsFromChecklist({ id: lead.id, checklist: nextChecklist }) },
      'Document Uploaded', fileName, 'Agent', 'in_progress'
    )
  })
}

export async function storageUpdateChecklistItem(id: string, docId: string, updates: Partial<ChecklistItem>): Promise<Lead | null> {
  return patchActive(id, (lead) => {
    const checklist = lead.checklist.map((c) => (c.id === docId ? { ...c, ...updates } : c))
    const target = checklist.find((c) => c.id === docId)
    const next = { ...lead, checklist, docs: buildDocsFromChecklist({ id: lead.id, checklist }) }
    if (target?.status === 'verified') return appendActivity(next, 'Document Verified', target.name, 'Admin')
    if (target?.status === 'rejected') return appendActivity(next, 'Document Rejected', target.rejectedReason || target.name, 'Admin', 'warning')
    return next
  })
}

export async function storageUpsertChecklistItem(
  leadId: string, docId: string, docName: string, updates: Partial<ChecklistItem>
): Promise<Lead | null> {
  return patchActive(leadId, (lead) => {
    const checklist = [...lead.checklist]
    const idx = checklist.findIndex((c) => c.id === docId || c.name.toLowerCase() === docName.toLowerCase())
    if (idx >= 0) {
      checklist[idx] = { ...checklist[idx], ...updates }
    } else {
      checklist.push({ id: docId, name: docName, status: 'pending', uploadedAt: null, rejectedReason: null, ...updates })
    }
    return { ...lead, checklist, docs: buildDocsFromChecklist({ id: lead.id, checklist }) }
  })
}

// Admin status
export async function storageUpdateAdminLeadStatus(id: string, adminStatus: AdminLeadStatus): Promise<Lead | null> {
  return patchActive(id, (lead) => ({ ...lead, ...syncLeadProgressFromAdminStatus(adminStatus) }))
}

// CIBIL
export async function storageUpdateLeadCibil(
  id: string,
  payload: { cibilScore: number | null; cibilSource: CibilSource; cibilVerified: boolean; cibilDocument?: Lead['cibilDocument'] }
): Promise<Lead | null> {
  return patchActive(id, (lead) =>
    appendActivity(
      { ...lead, cibil: payload.cibilScore ?? 0, cibilScore: payload.cibilScore, cibilSource: payload.cibilSource,
        cibilVerified: payload.cibilVerified, cibilDocument: payload.cibilDocument ?? lead.cibilDocument, cibilUpdatedAt: nowLabel() },
      'CIBIL Updated', `${payload.cibilScore ?? 'Pending'} via ${payload.cibilSource.toUpperCase()}`,
      'Ops', payload.cibilVerified ? 'done' : 'in_progress'
    )
  )
}

export async function storageVerifyLeadCibil(id: string, documentName: string): Promise<Lead | null> {
  return patchActive(id, (lead) => {
    const cibilDocument = {
      id: `cibil-${Date.now()}`, name: documentName, fileType: 'application/pdf', size: 245000,
      uploadedAt: nowLabel(), downloadUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(`CIBIL report for ${lead.id}`)}`,
    }
    return appendActivity({ ...lead, cibilVerified: true, cibilDocument, cibilUpdatedAt: nowLabel() }, 'CIBIL Verified', documentName, 'Admin')
  })
}

export async function storageFetchLeadCibil(
  id: string, payload: { pan: string; name: string; dob: string; mobile: string }
): Promise<Lead | null> {
  const seed = `${payload.pan}${payload.name}${payload.dob}${payload.mobile}`
    .split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const score = Math.min(900, Math.max(300, 650 + (seed % 180)))
  return storageUpdateLeadCibil(id, { cibilScore: score, cibilSource: 'api', cibilVerified: true })
}

// Workflow
export async function storageUpdateWorkflowStep(
  leadId: string, stepName: WorkflowStepName,
  patch: { status?: WorkflowStepStatus; data?: Partial<WorkflowStep['data']>; remarks?: string; changedBy?: string }
): Promise<Lead | null> {
  return patchActive(leadId, (lead) => {
    const stepIdx = WORKFLOW_STEP_ORDER.indexOf(stepName)
    const currentStepIdx = WORKFLOW_STEP_ORDER.indexOf(lead.currentStep)
    if (stepIdx > currentStepIdx) return lead

    const prevStep = lead.workflowSteps.find((s) => s.stepName === stepName)
    if (!prevStep) return lead

    const previousStatus = prevStep.status
    const newStatus = patch.status ?? previousStatus
    const historyEntry = {
      id: `h-${stepName}-${Date.now()}`, status: newStatus, previousStatus,
      changedBy: patch.changedBy || 'Agent', userId: patch.changedBy || 'agent',
      timestamp: new Date().toISOString(), remarks: patch.remarks ?? '',
      action: (patch.data && !patch.status ? 'edited' : 'updated') as 'updated' | 'edited',
    }

    const updatedSteps = lead.workflowSteps.map((step) =>
      step.stepName !== stepName ? step
        : { ...step, status: newStatus, data: { ...step.data, ...(patch.data ?? {}) }, history: [...step.history, historyEntry] }
    )

    let nextCurrentStep = lead.currentStep
    if (newStatus === 'completed' && stepName === lead.currentStep) {
      const nextIdx = stepIdx + 1
      if (nextIdx < WORKFLOW_STEP_ORDER.length) {
        nextCurrentStep = WORKFLOW_STEP_ORDER[nextIdx]
        const nextName = WORKFLOW_STEP_ORDER[nextIdx]
        const autoEntry = {
          id: `h-${nextName}-${Date.now() + 1}`, status: 'in_progress' as WorkflowStepStatus,
          previousStatus: 'pending' as WorkflowStepStatus, changedBy: 'System', userId: 'system',
          timestamp: new Date().toISOString(), remarks: `${stepName} completed — ${nextName} started`, action: 'updated' as const,
        }
        const finalSteps = updatedSteps.map((step) =>
          step.stepName !== nextName ? step
            : { ...step, status: 'in_progress' as WorkflowStepStatus, history: [...step.history, autoEntry] }
        )
        return appendActivity(
          { ...lead, workflowSteps: finalSteps, currentStep: nextCurrentStep },
          'Step Advanced', `${stepName} → ${nextName}`, patch.changedBy || 'Agent'
        )
      }
    }

    return appendActivity(
      { ...lead, workflowSteps: updatedSteps, currentStep: nextCurrentStep },
      'Workflow Updated', `${stepName} — ${newStatus}`, patch.changedBy || 'Agent'
    )
  })
}

export async function storageAssignLead(leadId: string, assignedUser: string, changedBy: string): Promise<Lead | null> {
  return patchActive(leadId, (lead) =>
    appendActivity({ ...lead, assignedUser }, 'Lead Assigned', `Assigned to ${assignedUser}`, changedBy)
  )
}

// ── Soft delete ────────────────────────────────────────────────────────────────

export async function storageSoftDeleteLead(
  id: string, reason: string, note: string, deletedBy: string, deletedById: string
): Promise<Lead | null> {
  const lead = await dbFindOne(id)
  if (!lead || lead.isDeleted) return null

  const deletedLead: Lead = {
    ...lead,
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy,
    deletedById,
    deleteReason: reason,
    deleteNote: note,
    activity: [...lead.activity, {
      id: `a${Date.now()}`, event: 'Lead Deleted',
      detail: `Reason: ${reason}${note ? ` · ${note}` : ''}`,
      status: 'warning' as const, date: nowLabel(), by: deletedBy,
    }],
  }

  if (hasSupabase()) {
    await supabase!.from('leads').update({
      is_deleted: true, deleted_at: deletedLead.deletedAt, deleted_by: deletedBy,
      delete_reason: reason, delete_note: note || null, data: deletedLead as unknown as Record<string, unknown>,
    }).eq('id', id)
  } else {
    lsSaveActive(lsGetActive().filter((l) => l.id !== id))
    lsSaveDeleted([deletedLead, ...lsGetDeleted()])
  }

  return structuredClone(deletedLead)
}

// ── Restore ────────────────────────────────────────────────────────────────────

export async function storageRestoreLead(id: string, restoredBy: string): Promise<Lead | null> {
  const lead = await dbFindOne(id)
  if (!lead || !lead.isDeleted) return null

  const restored: Lead = {
    ...lead,
    isDeleted: false, deletedAt: null, deletedBy: null, deletedById: null, deleteReason: null, deleteNote: null,
    status: 'New',
    activity: [...lead.activity, {
      id: `a${Date.now()}`, event: 'Lead Restored',
      detail: `Restored by ${restoredBy}`,
      status: 'done' as const, date: nowLabel(), by: restoredBy,
    }],
  }

  if (hasSupabase()) {
    await supabase!.from('leads').update({
      is_deleted: false, deleted_at: null, deleted_by: null, delete_reason: null, delete_note: null,
      status: 'New', data: restored as unknown as Record<string, unknown>,
    }).eq('id', id)
  } else {
    lsSaveDeleted(lsGetDeleted().filter((l) => l.id !== id))
    lsSaveActive([restored, ...lsGetActive()])
  }

  return structuredClone(restored)
}

// ── Expose localStorage getters for seeding/migration (dev only) ──────────────
export { lsGetActive as getActiveLeads, lsSaveActive as saveActiveLeads }
export { lsGetDeleted as getDeletedLeads, lsSaveDeleted as saveDeletedLeads }
