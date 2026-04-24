/**
 * lead-storage.ts — localStorage-based lead data layer (MVP, backend-ready)
 *
 * Primary data store for leads. No server-side state, no seed data.
 * All operations are synchronous (localStorage) wrapped in Promise for
 * React Query compatibility.
 *
 * Storage keys:
 *   finserve-active-leads   → Lead[]   (isDeleted=false)
 *   finserve-deleted-leads  → Lead[]   (isDeleted=true)
 */

import { buildDocsFromChecklist, syncLeadProgressFromAdminStatus } from '@/lib/admin-leads'
import { buildDistrictCode } from '@/lib/lead-form'
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

// ── Storage keys ───────────────────────────────────────────────────────────────

const ACTIVE_KEY   = 'finserve-active-leads'
const DELETED_KEY  = 'finserve-deleted-leads'

// ── Low-level R/W ──────────────────────────────────────────────────────────────

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable — silent fail
  }
}

// ── Active / Deleted accessors ────────────────────────────────────────────────

export function getActiveLeads(): Lead[] {
  return readStorage<Lead[]>(ACTIVE_KEY, [])
}

export function saveActiveLeads(leads: Lead[]): void {
  writeStorage(ACTIVE_KEY, leads)
}

export function getDeletedLeads(): Lead[] {
  return readStorage<Lead[]>(DELETED_KEY, [])
}

export function saveDeletedLeads(leads: Lead[]): void {
  writeStorage(DELETED_KEY, leads)
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

function nowLabel(): string {
  return new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function formatPhone(digits: string): string {
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function buildLeadId(): string {
  const all = [...getActiveLeads(), ...getDeletedLeads()]
  const maxId = all.reduce((max, item) => {
    const n = Number(item.id.replace(/\D/g, ''))
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `L${String(maxId + 1).padStart(3, '0')}`
}

function buildLeadCode(payload: NewLeadPayload): string {
  const year = new Date().getFullYear().toString().slice(-2)
  const districtCode = buildDistrictCode(payload.district)
  const prefix = `RF-${payload.agentCode}-${districtCode}-${year}-`
  const count = getActiveLeads().filter((item) => item.leadCode?.startsWith(prefix)).length + 1
  return `${prefix}${String(count).padStart(3, '0')}`
}

function patchActive(id: string, updater: (lead: Lead) => Lead): Lead | null {
  const leads = getActiveLeads()
  let result: Lead | null = null
  const next = leads.map((lead) => {
    if (lead.id !== id) return lead
    result = updater(lead)
    return result
  })
  if (result) saveActiveLeads(next)
  return result
}

function appendActivity(
  lead: Lead,
  event: string,
  detail: string,
  by: string,
  status: LeadActivity['status'] = 'done'
): Lead {
  return {
    ...lead,
    activity: [
      ...lead.activity,
      { id: `a${Date.now()}`, event, detail, status, date: nowLabel(), by },
    ],
  }
}

// ── Workflow constants ────────────────────────────────────────────────────────

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

// ── Checklist + docs ──────────────────────────────────────────────────────────

function buildChecklist(payload: NewLeadPayload): ChecklistItem[] {
  const base: ChecklistItem[] = [
    {
      id: 'aadhaar',
      name: 'Aadhaar Card',
      status: payload.aadhaarUpload ? 'uploaded' : 'pending',
      uploadedAt: payload.aadhaarUpload ? payload.aadhaarUpload.name : null,
      rejectedReason: null,
      fileSize: payload.aadhaarUpload?.size ?? null,
    },
    {
      id: 'pan',
      name: 'PAN Card',
      status: payload.panUpload ? 'uploaded' : 'pending',
      uploadedAt: payload.panUpload ? payload.panUpload.name : null,
      rejectedReason: null,
      fileSize: payload.panUpload?.size ?? null,
    },
    ...payload.documentChecklist.map((item, index) => ({
      id: `loan-doc-${index + 1}`,
      name: item,
      status: payload.loanDocuments[index] ? ('uploaded' as const) : ('pending' as const),
      uploadedAt: payload.loanDocuments[index]?.name ?? null,
      rejectedReason: null,
      fileSize: payload.loanDocuments[index]?.size ?? null,
    })),
  ]

  if (payload.loanCategory === 'agriculture') {
    base.push({
      id: 'land-712',
      name: '7/12 Extract',
      status: payload.land712Upload ? 'uploaded' : 'pending',
      uploadedAt: payload.land712Upload?.name ?? null,
      rejectedReason: null,
      fileSize: payload.land712Upload?.size ?? null,
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
      status: 'done',
      date: 'Just now',
      by: 'You (Agent)',
    },
    {
      id: 'a2',
      event: 'Application Intake',
      detail: `${payload.loanType || 'Loan'} · ${payload.district || 'NA'}`,
      status: 'done',
      date: 'Just now',
      by: 'You (Agent)',
    },
    {
      id: 'a3',
      event: 'Document Readiness',
      detail: `${payload.loanDocuments.length + (payload.aadhaarUpload ? 1 : 0) + (payload.panUpload ? 1 : 0)} files tagged`,
      status: payload.submissionMode === 'draft' ? 'pending' : 'in_progress',
      date: payload.submissionMode === 'draft' ? '' : 'In progress',
      by: payload.submissionMode === 'draft' ? '' : 'System',
    },
  ]
}

function getLeadStage(payload: NewLeadPayload): string {
  if (payload.submissionMode === 'draft') return 'Draft saved'
  if (payload.loanDocuments.length === 0) return 'Lead Created'
  return 'Ready for review'
}

function getLeadStatus(payload: NewLeadPayload): Lead['status'] {
  return payload.submissionMode === 'draft' ? 'Draft' : 'New'
}

function getAdminLeadStatus(payload: NewLeadPayload): AdminLeadStatus {
  if (payload.submissionMode === 'draft') return 'L1: New Lead'
  if (payload.loanDocuments.length > 0 || payload.aadhaarUpload || payload.panUpload) return 'L2: Documentation'
  return 'L1: New Lead'
}

function getLeadProgress(payload: NewLeadPayload): number {
  const scores = [
    payload.loanCategory ? 1 : 0,
    payload.customerName && payload.customerMobile ? 1 : 0,
    payload.village && payload.district && payload.permanentAddress ? 1 : 0,
    payload.occupation && payload.annualIncome ? 1 : 0,
    payload.bankName && payload.accountNo && payload.ifscCode ? 1 : 0,
    payload.ref1Name && payload.ref2Name ? 1 : 0,
    payload.aadhaarNumber && payload.panNumber ? 1 : 0,
    payload.loanType && payload.documentChecklist.length > 0 ? 1 : 0,
  ].filter(Boolean).length
  return Math.round((scores / 8) * 100)
}

function getLeadAmount(payload: NewLeadPayload): number {
  const annual = Number(normalizeDigits(payload.annualIncome) || 0)
  return annual > 0 ? annual * 2 : 0
}

function buildLeadFromPayload(existing: Lead | null, payload: NewLeadPayload): Lead {
  const name = payload.customerName.trim() || 'Untitled Lead'
  const mobile = normalizeDigits(payload.customerMobile).slice(0, 10)
  const leadCode = payload.submissionMode === 'submit' ? existing?.leadCode ?? buildLeadCode(payload) : null
  const createdDate = existing?.createdAt ?? new Date().toISOString().slice(0, 10)

  const lead: Lead = {
    id: existing?.id ?? buildLeadId(),
    leadCode,
    name,
    initials: getInitials(name),
    phone: mobile ? formatPhone(mobile) : '',
    email: payload.emailPersonal || payload.emailOfficial || `${name.toLowerCase().replace(/\s+/g, '.')}@pending.email`,
    loanCategory: payload.loanCategory || null,
    loanType: payload.loanType || 'Unknown',
    amount: getLeadAmount(payload),
    source: existing?.source ?? 'agent',
    sourceCode: (existing?.sourceCode ?? payload.agentCode) || 'GM-NEW',
    bank: payload.bankName || 'To Be Assigned',
    status: getLeadStatus(payload),
    adminStatus: existing?.adminStatus ?? getAdminLeadStatus(payload),
    progress: getLeadProgress(payload),
    agent: payload.leadName || 'You (Agent)',
    teamLeader: existing?.teamLeader ?? 'Unassigned',
    cibil: 0,
    cibilScore: existing?.cibilScore ?? null,
    cibilSource: existing?.cibilSource ?? null,
    cibilVerified: existing?.cibilVerified ?? false,
    cibilDocument: existing?.cibilDocument ?? null,
    cibilUpdatedAt: existing?.cibilUpdatedAt ?? null,
    createdAt: createdDate,
    stage: getLeadStage(payload),
    district: payload.district,
    commissionRate: existing?.commissionRate ?? 1,
    docs: [],
    checklist: buildChecklist(payload),
    issues: existing?.issues ?? [],
    notes: [
      {
        id: `n${Date.now()}`,
        type: 'system',
        text: existing
          ? `Lead updated · ${payload.loanType || 'Loan'} · ${payload.submissionMode === 'draft' ? 'Draft' : 'Submitted'}`
          : payload.submissionMode === 'draft'
            ? `Draft saved · ${payload.loanType || 'Loan'} · ${payload.district || 'NA'}`
            : `Lead created · ${leadCode ?? 'Pending'} · ${payload.loanType || 'Loan'} · ${payload.district || 'NA'}`,
        author: 'System',
        role: 'system' as const,
        time: nowLabel(),
      },
      ...(existing?.notes ?? []),
    ],
    activity: existing
      ? [
          ...existing.activity,
          {
            id: `a${Date.now()}`,
            event: payload.submissionMode === 'draft' ? 'Lead Draft Updated' : 'Lead Updated',
            detail: `${payload.loanType || 'Loan'} · ${payload.district || 'NA'}`,
            status: 'in_progress' as const,
            date: nowLabel(),
            by: payload.leadName || 'Agent',
          },
        ]
      : buildActivity(payload, leadCode),
    intake: structuredClone(payload),
    lastCompletedStep: existing?.lastCompletedStep ?? 0,
    workflowSteps: existing?.workflowSteps ?? buildInitialWorkflowSteps(),
    currentStep: existing?.currentStep ?? 'KYC',
    assignedUser: existing?.assignedUser ?? null,
    // Soft delete defaults
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    deletedById: null,
    deleteReason: null,
    deleteNote: null,
  }

  lead.docs = buildDocsFromChecklist(lead)
  return lead
}

// ── Public API ────────────────────────────────────────────────────────────────

export function storageListLeads(): Lead[] {
  return structuredClone(getActiveLeads())
}

export function storageListDeletedLeads(): Lead[] {
  return structuredClone(getDeletedLeads())
}

export function storageFindLead(id: string): Lead | null {
  const lead = getActiveLeads().find((l) => l.id === id)
  return lead ? structuredClone(lead) : null
}

export function storageFindLeadByMobile(mobile: string, excludeId?: string): Lead | null {
  const normalized = normalizeDigits(mobile).slice(0, 10)
  if (!normalized) return null
  const lead = getActiveLeads().find(
    (l) => normalizeDigits(l.phone).slice(-10) === normalized && l.id !== excludeId
  )
  return lead ? structuredClone(lead) : null
}

export function storageCreateLead(payload: NewLeadPayload): Lead {
  const lead = buildLeadFromPayload(null, payload)
  saveActiveLeads([lead, ...getActiveLeads()])
  return structuredClone(lead)
}

export function storageUpdateLead(id: string, payload: NewLeadPayload, lastCompletedStep?: number): Lead | null {
  return patchActive(id, (existing) => ({
    ...buildLeadFromPayload(existing, payload),
    lastCompletedStep: lastCompletedStep ?? existing.lastCompletedStep,
  }))
}

// Notes
export function storageAddNote(id: string, message: string, author = 'You (Agent)'): Lead | null {
  return patchActive(id, (lead) => {
    const note: LeadNote = {
      id: `n${Date.now()}`,
      type: 'agent',
      text: message,
      author,
      role: 'agent',
      time: nowLabel(),
    }
    return appendActivity({ ...lead, notes: [...lead.notes, note] }, 'Note Added', message, author)
  })
}

// Issues
export function storageAddIssue(
  id: string,
  payload: Pick<LeadIssue, 'type' | 'description' | 'assignedTo' | 'priority'> & { documentId?: string | null }
): Lead | null {
  return patchActive(id, (lead) => {
    const issue: LeadIssue = {
      id: `i${Date.now()}`,
      status: 'open',
      raisedBy: 'You',
      raisedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      ...payload,
    }
    const linkedDoc = payload.documentId
      ? lead.checklist.find((c) => c.id === payload.documentId)?.name
      : null
    return appendActivity(
      { ...lead, issues: [issue, ...lead.issues] },
      'Issue Raised',
      linkedDoc ? `${payload.type} linked to ${linkedDoc}` : payload.type,
      'You'
    )
  })
}

export function storageUpdateIssueStatus(id: string, issueId: string, status: LeadIssue['status']): Lead | null {
  return patchActive(id, (lead) => {
    const issues = lead.issues.map((i) => (i.id === issueId ? { ...i, status } : i))
    const target = issues.find((i) => i.id === issueId)
    const next = { ...lead, issues }
    if (target) {
      return appendActivity(
        next,
        status === 'resolved' ? 'Issue Resolved' : 'Issue Updated',
        target.type,
        'Admin',
        status === 'resolved' ? 'done' : 'in_progress'
      )
    }
    return next
  })
}

// Documents / checklist
export function storageUploadDocument(id: string, fileName: string, fileSize = 0): Lead | null {
  return patchActive(id, (lead) => {
    const nextChecklist = [...lead.checklist]
    const target = nextChecklist.find((c) => c.status === 'pending' || c.status === 'rejected')
    if (target) {
      target.status = 'uploaded'
      target.uploadedAt = `Uploaded from ${fileName}`
      target.rejectedReason = null
      target.fileSize = fileSize
    } else {
      nextChecklist.push({
        id: `c${Date.now()}`,
        name: fileName,
        status: 'uploaded',
        uploadedAt: 'Just now',
        rejectedReason: null,
        fileSize,
      })
    }
    return appendActivity(
      { ...lead, checklist: nextChecklist, docs: buildDocsFromChecklist({ id: lead.id, checklist: nextChecklist }) },
      'Document Uploaded',
      fileName,
      'Agent',
      'in_progress'
    )
  })
}

export function storageUpdateChecklistItem(id: string, docId: string, updates: Partial<ChecklistItem>): Lead | null {
  return patchActive(id, (lead) => {
    const checklist = lead.checklist.map((c) => (c.id === docId ? { ...c, ...updates } : c))
    const target = checklist.find((c) => c.id === docId)
    const next = { ...lead, checklist, docs: buildDocsFromChecklist({ id: lead.id, checklist }) }
    if (target?.status === 'verified') return appendActivity(next, 'Document Verified', target.name, 'Admin')
    if (target?.status === 'rejected') return appendActivity(next, 'Document Rejected', target.rejectedReason || target.name, 'Admin', 'warning')
    return next
  })
}

/** Upsert — find by id or name, create new item if not found. Used by workflow doc fields. */
export function storageUpsertChecklistItem(
  leadId: string,
  docId: string,
  docName: string,
  updates: Partial<ChecklistItem>
): Lead | null {
  return patchActive(leadId, (lead) => {
    const checklist = [...lead.checklist]
    const idx = checklist.findIndex(
      (c) => c.id === docId || c.name.toLowerCase() === docName.toLowerCase()
    )
    if (idx >= 0) {
      checklist[idx] = { ...checklist[idx], ...updates }
    } else {
      checklist.push({
        id: docId,
        name: docName,
        status: 'pending',
        uploadedAt: null,
        rejectedReason: null,
        ...updates,
      })
    }
    return { ...lead, checklist, docs: buildDocsFromChecklist({ id: lead.id, checklist }) }
  })
}

// Admin status
export function storageUpdateAdminLeadStatus(id: string, adminStatus: AdminLeadStatus): Lead | null {
  return patchActive(id, (lead) => ({
    ...lead,
    ...syncLeadProgressFromAdminStatus(adminStatus),
  }))
}

// CIBIL
export function storageUpdateLeadCibil(
  id: string,
  payload: { cibilScore: number | null; cibilSource: CibilSource; cibilVerified: boolean; cibilDocument?: Lead['cibilDocument'] }
): Lead | null {
  return patchActive(id, (lead) =>
    appendActivity(
      {
        ...lead,
        cibil: payload.cibilScore ?? 0,
        cibilScore: payload.cibilScore,
        cibilSource: payload.cibilSource,
        cibilVerified: payload.cibilVerified,
        cibilDocument: payload.cibilDocument ?? lead.cibilDocument,
        cibilUpdatedAt: nowLabel(),
      },
      'CIBIL Updated',
      `${payload.cibilScore ?? 'Pending'} via ${payload.cibilSource.toUpperCase()}`,
      'Ops',
      payload.cibilVerified ? 'done' : 'in_progress'
    )
  )
}

export function storageVerifyLeadCibil(id: string, documentName: string): Lead | null {
  return patchActive(id, (lead) => {
    const cibilDocument = {
      id: `cibil-${Date.now()}`,
      name: documentName,
      fileType: 'application/pdf',
      size: 245000,
      uploadedAt: nowLabel(),
      downloadUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(`Mock CIBIL report for ${lead.id}`)}`,
    }
    return appendActivity(
      { ...lead, cibilVerified: true, cibilDocument, cibilUpdatedAt: nowLabel() },
      'CIBIL Verified',
      documentName,
      'Admin'
    )
  })
}

export function storageFetchLeadCibil(
  id: string,
  payload: { pan: string; name: string; dob: string; mobile: string }
): Lead | null {
  const seed = `${payload.pan}${payload.name}${payload.dob}${payload.mobile}`
    .split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const score = Math.min(900, Math.max(300, 650 + (seed % 180)))
  return storageUpdateLeadCibil(id, { cibilScore: score, cibilSource: 'api', cibilVerified: true })
}

// Workflow
export function storageUpdateWorkflowStep(
  leadId: string,
  stepName: WorkflowStepName,
  patch: {
    status?: WorkflowStepStatus
    data?: Partial<WorkflowStep['data']>
    remarks?: string
    changedBy?: string
  }
): Lead | null {
  return patchActive(leadId, (lead) => {
    const stepIdx = WORKFLOW_STEP_ORDER.indexOf(stepName)
    const currentStepIdx = WORKFLOW_STEP_ORDER.indexOf(lead.currentStep)
    if (stepIdx > currentStepIdx) return lead

    const prevStep = lead.workflowSteps.find((s) => s.stepName === stepName)
    if (!prevStep) return lead

    const previousStatus = prevStep.status
    const newStatus = patch.status ?? previousStatus

    const historyEntry = {
      id: `h-${stepName}-${Date.now()}`,
      status: newStatus,
      previousStatus,
      changedBy: patch.changedBy || 'Agent',
      userId: patch.changedBy || 'agent',
      timestamp: new Date().toISOString(),
      remarks: patch.remarks ?? '',
      action: (patch.data && !patch.status ? 'edited' : 'updated') as 'updated' | 'edited',
    }

    const updatedSteps = lead.workflowSteps.map((step) => {
      if (step.stepName !== stepName) return step
      return {
        ...step,
        status: newStatus,
        data: { ...step.data, ...(patch.data ?? {}) },
        history: [...step.history, historyEntry],
      }
    })

    let nextCurrentStep = lead.currentStep
    if (newStatus === 'completed' && stepName === lead.currentStep) {
      const nextIdx = stepIdx + 1
      if (nextIdx < WORKFLOW_STEP_ORDER.length) {
        nextCurrentStep = WORKFLOW_STEP_ORDER[nextIdx]
        const nextName = WORKFLOW_STEP_ORDER[nextIdx]
        const autoEntry = {
          id: `h-${nextName}-${Date.now() + 1}`,
          status: 'in_progress' as WorkflowStepStatus,
          previousStatus: 'pending' as WorkflowStepStatus,
          changedBy: 'System',
          userId: 'system',
          timestamp: new Date().toISOString(),
          remarks: `${stepName} completed — ${nextName} started`,
          action: 'updated' as const,
        }
        const finalSteps = updatedSteps.map((step) =>
          step.stepName !== nextName ? step
            : { ...step, status: 'in_progress' as WorkflowStepStatus, history: [...step.history, autoEntry] }
        )
        return appendActivity(
          { ...lead, workflowSteps: finalSteps, currentStep: nextCurrentStep },
          'Step Advanced',
          `${stepName} → ${nextName}`,
          patch.changedBy || 'Agent'
        )
      }
    }

    return appendActivity(
      { ...lead, workflowSteps: updatedSteps, currentStep: nextCurrentStep },
      'Workflow Updated',
      `${stepName} — ${newStatus}`,
      patch.changedBy || 'Agent'
    )
  })
}

export function storageAssignLead(leadId: string, assignedUser: string, changedBy: string): Lead | null {
  return patchActive(leadId, (lead) =>
    appendActivity({ ...lead, assignedUser }, 'Lead Assigned', `Assigned to ${assignedUser}`, changedBy)
  )
}

// ── Soft delete ────────────────────────────────────────────────────────────────

export function storageSoftDeleteLead(
  id: string,
  reason: string,
  note: string,
  deletedBy: string,
  deletedById: string
): Lead | null {
  const active = getActiveLeads()
  const lead = active.find((l) => l.id === id)
  if (!lead) return null

  const deletedLead: Lead = {
    ...lead,
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy,
    deletedById,
    deleteReason: reason,
    deleteNote: note,
    activity: [
      ...lead.activity,
      {
        id: `a${Date.now()}`,
        event: 'Lead Deleted',
        detail: `Reason: ${reason}${note ? ` · ${note}` : ''}`,
        status: 'warning' as const,
        date: nowLabel(),
        by: deletedBy,
      },
    ],
  }

  saveActiveLeads(active.filter((l) => l.id !== id))
  saveDeletedLeads([deletedLead, ...getDeletedLeads()])

  return structuredClone(deletedLead)
}

// ── Restore ────────────────────────────────────────────────────────────────────

export function storageRestoreLead(id: string, restoredBy: string): Lead | null {
  const deleted = getDeletedLeads()
  const lead = deleted.find((l) => l.id === id)
  if (!lead) return null

  const restored: Lead = {
    ...lead,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    deletedById: null,
    deleteReason: null,
    deleteNote: null,
    status: 'New',
    activity: [
      ...lead.activity,
      {
        id: `a${Date.now()}`,
        event: 'Lead Restored',
        detail: `Restored by ${restoredBy}`,
        status: 'done' as const,
        date: nowLabel(),
        by: restoredBy,
      },
    ],
  }

  saveDeletedLeads(deleted.filter((l) => l.id !== id))
  saveActiveLeads([restored, ...getActiveLeads()])

  return structuredClone(restored)
}
