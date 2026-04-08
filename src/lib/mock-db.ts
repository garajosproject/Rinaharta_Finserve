import { ISSUE_TYPES, seedLeads, seedNotifications } from '@/data/mockData'
import { buildDistrictCode } from '@/lib/lead-form'
import type {
  ChecklistItem,
  Lead,
  LeadIssue,
  LeadNote,
  NewLeadPayload,
  NotificationItem,
} from '@/types/lead'

let leads: Lead[] = structuredClone(seedLeads)
let notifications: NotificationItem[] = structuredClone(seedNotifications)

export function listLeads() {
  return structuredClone(leads)
}

export function listNotifications() {
  return structuredClone(notifications)
}

export function markNotificationsRead() {
  notifications = notifications.map((item) => ({ ...item, read: true }))
  return structuredClone(notifications)
}

export function findLead(id: string) {
  const lead = leads.find((item) => item.id === id)
  return lead ? structuredClone(lead) : null
}

function patchLead(id: string, updater: (lead: Lead) => Lead) {
  let updatedLead: Lead | null = null
  leads = leads.map((lead) => {
    if (lead.id !== id) return lead
    updatedLead = updater(lead)
    return updatedLead
  })
  return updatedLead ? structuredClone(updatedLead) : null
}

export function createNote(id: string, message: string) {
  return patchLead(id, (lead) => {
    const note: LeadNote = {
      id: `n${Date.now()}`,
      type: 'agent',
      text: message,
      author: 'You (Agent)',
      role: 'agent',
      time: new Date().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }

    return {
      ...lead,
      notes: [...lead.notes, note],
    }
  })
}

export function createIssue(
  id: string,
  payload: Pick<LeadIssue, 'type' | 'description' | 'assignedTo' | 'priority'>
) {
  return patchLead(id, (lead) => {
    const issue: LeadIssue = {
      id: `i${Date.now()}`,
      status: 'open',
      raisedBy: 'You',
      raisedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      ...payload,
    }

    return {
      ...lead,
      issues: [issue, ...lead.issues],
    }
  })
}

export function uploadLeadDocument(id: string, fileName: string) {
  return patchLead(id, (lead) => {
    const nextChecklist = [...lead.checklist]
    const target = nextChecklist.find((item) => item.status === 'pending' || item.status === 'rejected')

    if (target) {
      target.status = 'uploaded'
      target.uploadedAt = `Uploaded from ${fileName}`
      target.rejectedReason = null
    } else {
      const created: ChecklistItem = {
        id: `c${Date.now()}`,
        name: fileName,
        status: 'uploaded',
        uploadedAt: 'Just now',
        rejectedReason: null,
      }
      nextChecklist.push(created)
    }

    return {
      ...lead,
      checklist: nextChecklist,
    }
  })
}

export function updateChecklistItem(id: string, docId: string, updates: Partial<ChecklistItem>) {
  return patchLead(id, (lead) => ({
    ...lead,
    checklist: lead.checklist.map((item) => (item.id === docId ? { ...item, ...updates } : item)),
  }))
}

function buildLeadId() {
  const maxId = leads.reduce((max, item) => {
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
  const count = leads.filter((item) => item.leadCode?.startsWith(prefix)).length + 1
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
    },
    {
      id: 'pan',
      name: 'PAN Card',
      status: payload.panUpload ? 'uploaded' : 'pending',
      uploadedAt: payload.panUpload ? payload.panUpload.name : null,
      rejectedReason: null,
    },
    ...payload.documentChecklist.map((item, index) => ({
      id: `loan-doc-${index + 1}`,
      name: item,
      status: payload.loanDocuments[index] ? ('uploaded' as const) : ('pending' as const),
      uploadedAt: payload.loanDocuments[index]?.name ?? null,
      rejectedReason: null,
    })),
  ]

  if (payload.loanCategory === 'agriculture') {
    base.push({
      id: 'land-712',
      name: '7/12 Extract',
      status: payload.land712Upload ? 'uploaded' : 'pending',
      uploadedAt: payload.land712Upload?.name ?? null,
      rejectedReason: null,
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
    bank: payload.bankName || 'To Be Assigned',
    status: getLeadStatus(payload),
    progress: getLeadProgress(payload),
    agent: payload.leadName || 'You (Agent)',
    teamLeader: existing?.teamLeader ?? 'Unassigned',
    cibil: Number.isFinite(cibilCandidate) ? cibilCandidate : 0,
    createdAt: createdDate,
    stage: getLeadStage(payload),
    district: payload.district,
    checklist: buildChecklist(payload),
    issues: existing?.issues ?? [],
    notes: [createSystemNote(payload, leadCode), ...(existing?.notes ?? []).filter((note) => note.type !== 'system')],
    activity: buildActivity(payload, leadCode),
    intake: structuredClone(payload),
    lastCompletedStep: existing?.lastCompletedStep ?? 0,
  }

  return lead
}

export function createLead(payload: NewLeadPayload) {
  const lead = buildLeadFromPayload(null, payload)
  leads = [lead, ...leads]
  return structuredClone(lead)
}

export function updateLead(id: string, payload: NewLeadPayload, lastCompletedStep?: number) {
  return patchLead(id, (existing) => ({
    ...buildLeadFromPayload(existing, payload),
    lastCompletedStep: lastCompletedStep ?? existing.lastCompletedStep,
  }))
}

export function findLeadByMobile(mobile: string, excludeLeadId?: string) {
  const normalized = normalizeDigits(mobile).slice(0, 10)
  if (!normalized) return null

  const lead = leads.find((item) => normalizeDigits(item.phone).slice(-10) === normalized && item.id !== excludeLeadId)
  return lead ? structuredClone(lead) : null
}

export { ISSUE_TYPES }
