import { ISSUE_TYPES, seedLeads, seedNotifications } from '@/data/mockData'
import { buildDocsFromChecklist, syncLeadProgressFromAdminStatus } from '@/lib/admin-leads'
import { buildDistrictCode } from '@/lib/lead-form'
import type {
  AdminLeadStatus,
  CibilSource,
  ChecklistItem,
  Lead,
  LeadIssue,
  LeadNote,
  NewLeadPayload,
  NotificationItem,
  WorkflowStep,
  WorkflowStepName,
  WorkflowStepStatus,
} from '@/types/lead'

// ─── Persistent in-memory store (survives Next.js HMR hot reloads) ────────────
// Module-level `let` is re-initialized on every hot reload in dev.
// globalThis persists across module re-evaluations within the same process.

declare global {
  // eslint-disable-next-line no-var
  var __finserve_leads: Lead[] | undefined
  // eslint-disable-next-line no-var
  var __finserve_notifications: NotificationItem[] | undefined
}

if (globalThis.__finserve_leads === undefined) {
  globalThis.__finserve_leads = structuredClone(seedLeads)
}
if (globalThis.__finserve_notifications === undefined) {
  globalThis.__finserve_notifications = structuredClone(seedNotifications)
}

// Typed accessors — always read/write through globalThis
function getLeads(): Lead[] { return globalThis.__finserve_leads! }
function setLeads(val: Lead[]): void { globalThis.__finserve_leads = val }
function getNotifications(): NotificationItem[] { return globalThis.__finserve_notifications! }
function setNotifications(val: NotificationItem[]): void { globalThis.__finserve_notifications = val }

export function listLeads() {
  return structuredClone(getLeads())
}

export function listNotifications() {
  return structuredClone(getNotifications())
}

export function markNotificationsRead() {
  setNotifications(getNotifications().map((item) => ({ ...item, read: true })))
  return structuredClone(getNotifications())
}

export function findLead(id: string) {
  const lead = getLeads().find((item) => item.id === id)
  return lead ? structuredClone(lead) : null
}

function patchLead(id: string, updater: (lead: Lead) => Lead) {
  let updatedLead: Lead | null = null
  setLeads(getLeads().map((lead) => {
    if (lead.id !== id) return lead
    updatedLead = updater(lead)
    return updatedLead
  }))
  return updatedLead ? structuredClone(updatedLead) : null
}

function appendActivity(lead: Lead, event: string, detail: string, by: string, status: Lead['activity'][number]['status'] = 'done') {
  return {
    ...lead,
    activity: [
      ...lead.activity,
      {
        id: `a${Date.now()}`,
        event,
        detail,
        status,
        date: nowLabel(),
        by,
      },
    ],
  }
}

export function createNote(id: string, message: string, author = 'You (Agent)') {
  return patchLead(id, (lead) => {
    const note: LeadNote = {
      id: `n${Date.now()}`,
      type: 'agent',
      text: message,
      author,
      role: 'agent',
      time: nowLabel(),
    }

    return appendActivity(
      {
      ...lead,
      notes: [...lead.notes, note],
      },
      'Note Added',
      message,
      author
    )
  })
}

export function createIssue(
  id: string,
  payload: Pick<LeadIssue, 'type' | 'description' | 'assignedTo' | 'priority'> & { documentId?: string | null }
) {
  return patchLead(id, (lead) => {
    const issue: LeadIssue = {
      id: `i${Date.now()}`,
      status: 'open',
      raisedBy: 'You',
      raisedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      ...payload,
    }

    const linkedDoc = payload.documentId
      ? lead.checklist.find((item) => item.id === payload.documentId)?.name
      : null

    return appendActivity(
      {
      ...lead,
      issues: [issue, ...lead.issues],
      },
      'Issue Raised',
      linkedDoc ? `${payload.type} linked to ${linkedDoc}` : payload.type,
      'You'
    )
  })
}

export function uploadLeadDocument(id: string, fileName: string, fileSize = 0) {
  return patchLead(id, (lead) => {
    const nextChecklist = [...lead.checklist]
    const target = nextChecklist.find((item) => item.status === 'pending' || item.status === 'rejected')

    if (target) {
      target.status = 'uploaded'
      target.uploadedAt = `Uploaded from ${fileName}`
      target.rejectedReason = null
      target.fileSize = fileSize
    } else {
      const created: ChecklistItem = {
        id: `c${Date.now()}`,
        name: fileName,
        status: 'uploaded',
        uploadedAt: 'Just now',
        rejectedReason: null,
        fileSize,
      }
      nextChecklist.push(created)
    }

    return appendActivity(
      {
      ...lead,
      checklist: nextChecklist,
      docs: buildDocsFromChecklist({ id: lead.id, checklist: nextChecklist }),
      },
      'Document Uploaded',
      fileName,
      'Agent',
      'in_progress'
    )
  })
}

export function updateChecklistItem(id: string, docId: string, updates: Partial<ChecklistItem>) {
  return patchLead(id, (lead) => {
    const checklist = lead.checklist.map((item) => (item.id === docId ? { ...item, ...updates } : item))
    const target = checklist.find((item) => item.id === docId)
    const nextLead = {
      ...lead,
      checklist,
      docs: buildDocsFromChecklist({ id: lead.id, checklist }),
    }

    if (target?.status === 'verified') {
      return appendActivity(nextLead, 'Document Verified', target.name, 'Admin')
    }

    if (target?.status === 'rejected') {
      return appendActivity(nextLead, 'Document Rejected', target.rejectedReason || target.name, 'Admin', 'warning')
    }

    return nextLead
  })
}

export function updateAdminLeadStatus(id: string, adminStatus: AdminLeadStatus) {
  return patchLead(id, (lead) => ({
    ...lead,
    ...syncLeadProgressFromAdminStatus(adminStatus),
  }))
}

export function updateIssueStatus(id: string, issueId: string, status: LeadIssue['status']) {
  return patchLead(id, (lead) => {
    const issues = lead.issues.map((issue) => (issue.id === issueId ? { ...issue, status } : issue))
    const target = issues.find((issue) => issue.id === issueId)
    const nextLead = { ...lead, issues }

    if (target) {
      return appendActivity(
        nextLead,
        status === 'resolved' ? 'Issue Resolved' : 'Issue Updated',
        target.type,
        'Admin',
        status === 'resolved' ? 'done' : 'in_progress'
      )
    }

    return nextLead
  })
}

export function updateLeadCibil(
  id: string,
  payload: {
    cibilScore: number | null
    cibilSource: CibilSource
    cibilVerified: boolean
    cibilDocument?: Lead['cibilDocument']
  }
) {
  return patchLead(id, (lead) =>
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

export function verifyLeadCibil(id: string, documentName: string) {
  return patchLead(id, (lead) => {
    const cibilDocument = {
      id: `cibil-${Date.now()}`,
      name: documentName,
      fileType: 'application/pdf',
      size: 245000,
      uploadedAt: nowLabel(),
      downloadUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(`Mock CIBIL report for ${lead.id}`)}`,
    }

    return appendActivity(
      {
        ...lead,
        cibilVerified: true,
        cibilDocument,
        cibilUpdatedAt: nowLabel(),
      },
      'CIBIL Verified',
      documentName,
      'Admin'
    )
  })
}

export function fetchLeadCibil(
  id: string,
  payload: { pan: string; name: string; dob: string; mobile: string }
) {
  const seed =
    `${payload.pan}${payload.name}${payload.dob}${payload.mobile}`
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0)

  const score = 650 + (seed % 180)
  return updateLeadCibil(id, {
    cibilScore: Math.min(900, Math.max(300, score)),
    cibilSource: 'api',
    cibilVerified: true,
  })
}

function buildLeadId() {
  const maxId = getLeads().reduce((max, item) => {
    const numeric = Number(item.id.replace(/\D/g, ''))
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max
  }, 0)

  return `L${String(maxId + 1).padStart(3, '0')}`
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatPhone(lastTenDigits: string) {
  return `+91 ${lastTenDigits.slice(0, 5)} ${lastTenDigits.slice(5)}`
}

function nowLabel() {
  return new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function buildLeadCode(payload: NewLeadPayload) {
  const year = new Date().getFullYear().toString().slice(-2)
  const districtCode = buildDistrictCode(payload.district)
  const prefix = `RF-${payload.agentCode}-${districtCode}-${year}-`
  const count = getLeads().filter((item) => item.leadCode?.startsWith(prefix)).length + 1
  return `${prefix}${String(count).padStart(3, '0')}`
}

function buildChecklist(payload: NewLeadPayload) {
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

function getLeadStage(payload: NewLeadPayload) {
  if (payload.submissionMode === 'draft') return 'Draft saved'
  if (payload.loanDocuments.length === 0) return 'Lead Created'
  return 'Ready for review'
}

function getLeadStatus(payload: NewLeadPayload): Lead['status'] {
  if (payload.submissionMode === 'draft') return 'Draft'
  return 'New'
}

function getAdminLeadStatus(payload: NewLeadPayload): AdminLeadStatus {
  if (payload.submissionMode === 'draft') return 'L1: New Lead'
  if (payload.loanDocuments.length > 0 || payload.aadhaarUpload || payload.panUpload) return 'L2: Documentation'
  return 'L1: New Lead'
}

function getLeadProgress(payload: NewLeadPayload) {
  const sectionScores = [
    payload.loanCategory ? 1 : 0,
    payload.customerName && payload.customerMobile ? 1 : 0,
    payload.village && payload.district && payload.permanentAddress ? 1 : 0,
    payload.occupation && payload.annualIncome ? 1 : 0,
    payload.bankName && payload.accountNo && payload.ifscCode ? 1 : 0,
    payload.ref1Name && payload.ref2Name ? 1 : 0,
    payload.aadhaarNumber && payload.panNumber ? 1 : 0,
    payload.loanType && payload.documentChecklist.length > 0 ? 1 : 0,
  ].filter(Boolean).length

  return Math.round((sectionScores / 8) * 100)
}

function getLeadAmount(payload: NewLeadPayload) {
  const annualIncome = Number(normalizeDigits(payload.annualIncome) || 0)
  if (annualIncome <= 0) return 0
  return annualIncome * 2
}

function createSystemNote(payload: NewLeadPayload, leadCode: string | null) {
  return {
    id: `n${Date.now()}`,
    type: 'system',
    text:
      payload.submissionMode === 'draft'
        ? `Draft saved · ${payload.loanType || 'Loan'} · ${payload.district || 'NA'}`
        : `Lead created · ${leadCode ?? 'Pending code'} · ${payload.loanType || 'Loan'} · ${payload.district || 'NA'}`,
    author: 'System',
    role: 'system' as const,
    time: nowLabel(),
  }
}

function buildActivity(payload: NewLeadPayload, leadCode: string | null) {
  return [
    {
      id: 'a1',
      event: payload.submissionMode === 'draft' ? 'Draft Saved' : 'Lead Created',
      detail: payload.submissionMode === 'draft' ? 'Lead stored for later completion' : `${leadCode ?? 'Pending code'} generated`,
      status: 'done' as const,
      date: 'Just now',
      by: 'You (Agent)',
    },
    {
      id: 'a2',
      event: 'Application Intake',
      detail: `${payload.loanType || 'Loan'} · ${payload.district || 'NA'}`,
      status: 'done' as const,
      date: 'Just now',
      by: 'You (Agent)',
    },
    {
      id: 'a3',
      event: 'Document Readiness',
      detail: `${payload.loanDocuments.length + (payload.aadhaarUpload ? 1 : 0) + (payload.panUpload ? 1 : 0)} files tagged`,
      status: payload.submissionMode === 'draft' ? 'pending' as const : 'in_progress' as const,
      date: payload.submissionMode === 'draft' ? '' : 'In progress',
      by: payload.submissionMode === 'draft' ? '' : 'System',
    },
    {
      id: 'a4',
      event: 'Admin Visibility',
      detail: payload.submissionMode === 'draft' ? 'Will appear after submission' : 'Visible in pipeline',
      status: payload.submissionMode === 'draft' ? 'pending' as const : 'done' as const,
      date: payload.submissionMode === 'draft' ? '' : 'Just now',
      by: payload.submissionMode === 'draft' ? '' : 'System',
    },
  ]
}

function buildLeadFromPayload(existing: Lead | null, payload: NewLeadPayload) {
  const name = payload.customerName.trim() || 'Untitled Lead'
  const mobile = normalizeDigits(payload.customerMobile).slice(0, 10)
  const cibilCandidate = Number(payload.occupation ? 0 : 0)
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
    cibil: Number.isFinite(cibilCandidate) ? cibilCandidate : 0,
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
    notes: [createSystemNote(payload, leadCode), ...(existing?.notes ?? []).filter((note) => note.type !== 'system')],
    activity: buildActivity(payload, leadCode),
    intake: structuredClone(payload),
    lastCompletedStep: existing?.lastCompletedStep ?? 0,
    workflowSteps: existing?.workflowSteps ?? buildInitialWorkflowSteps(payload.submissionMode === 'draft'),
    currentStep: existing?.currentStep ?? 'KYC',
    assignedUser: existing?.assignedUser ?? null,
    // Soft delete fields
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

export function createLead(payload: NewLeadPayload) {
  const lead = buildLeadFromPayload(null, payload)
  setLeads([lead, ...getLeads()])
  return structuredClone(lead)
}

export function updateLead(id: string, payload: NewLeadPayload, lastCompletedStep?: number) {
  return patchLead(id, (existing) => ({
    ...buildLeadFromPayload(existing, payload),
    lastCompletedStep: lastCompletedStep ?? existing.lastCompletedStep,
  }))
}

// ── Workflow Engine ────────────────────────────────────────────────────────────

const WORKFLOW_STEP_ORDER: WorkflowStepName[] = [
  'Inquiry', 'KYC', 'File Login', 'Verification', 'Sanction', 'Disbursement',
]

function buildInitialWorkflowSteps(isDraft: boolean): WorkflowStep[] {
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

export function updateWorkflowStep(
  leadId: string,
  stepName: WorkflowStepName,
  patch: {
    status?: WorkflowStepStatus
    data?: Partial<WorkflowStep['data']>
    remarks?: string
    changedBy?: string
  }
) {
  return patchLead(leadId, (lead) => {
    const stepIdx = WORKFLOW_STEP_ORDER.indexOf(stepName)
    const currentStepIdx = WORKFLOW_STEP_ORDER.indexOf(lead.currentStep)

    // Lock future steps (can only act on current or completed steps)
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

    // If step just completed, advance currentStep to next
    let nextCurrentStep = lead.currentStep
    if (newStatus === 'completed' && stepName === lead.currentStep) {
      const nextIdx = stepIdx + 1
      if (nextIdx < WORKFLOW_STEP_ORDER.length) {
        nextCurrentStep = WORKFLOW_STEP_ORDER[nextIdx]
        // Mark next step as in_progress
        const nextName = WORKFLOW_STEP_ORDER[nextIdx]
        const nextStepHistoryEntry = {
          id: `h-${nextName}-${Date.now() + 1}`,
          status: 'in_progress' as WorkflowStepStatus,
          previousStatus: 'pending' as WorkflowStepStatus,
          changedBy: 'System',
          userId: 'system',
          timestamp: new Date().toISOString(),
          remarks: `${stepName} completed — ${nextName} started`,
          action: 'updated' as const,
        }
        const finalSteps = updatedSteps.map((step) => {
          if (step.stepName !== nextName) return step
          return {
            ...step,
            status: 'in_progress' as WorkflowStepStatus,
            history: [...step.history, nextStepHistoryEntry],
          }
        })
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

export function assignLead(leadId: string, assignedUser: string, changedBy: string) {
  return patchLead(leadId, (lead) =>
    appendActivity(
      { ...lead, assignedUser },
      'Lead Assigned',
      `Assigned to ${assignedUser}`,
      changedBy
    )
  )
}

export function findLeadByMobile(mobile: string, excludeLeadId?: string) {
  const normalized = normalizeDigits(mobile).slice(0, 10)
  if (!normalized) return null

  const lead = getLeads().find((item) => normalizeDigits(item.phone).slice(-10) === normalized && item.id !== excludeLeadId)
  return lead ? structuredClone(lead) : null
}

export { ISSUE_TYPES }
