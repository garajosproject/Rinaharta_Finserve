import { ISSUE_TYPES, seedLeads, seedNotifications } from '@/data/mockData'
import type { ChecklistItem, Lead, LeadIssue, LeadNote, NewLeadPayload, NotificationItem } from '@/types/lead'

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
    checklist: lead.checklist.map((item) =>
      item.id === docId ? { ...item, ...updates } : item
    ),
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

export function createLead(payload: NewLeadPayload) {
  const leadId = buildLeadId()
  const name = payload.customerName.trim()
  const mobile = payload.mobileNumber.replace(/\D/g, '').slice(0, 10)
  const monthlyIncome = Number(payload.monthlyIncome || 0)
  const cibilScore = Number(payload.cibilScore || 0)
  const createdDate = new Date().toISOString().slice(0, 10)

  const lead: Lead = {
    id: leadId,
    name,
    initials: getInitials(name),
    phone: formatPhone(mobile),
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@pending.email`,
    loanType: payload.loanType || 'Unknown',
    amount: monthlyIncome > 0 ? monthlyIncome * 36 : 0,
    bank: 'To Be Assigned',
    status: 'New',
    progress: 12,
    agent: 'You (Agent)',
    teamLeader: 'Unassigned',
    cibil: cibilScore > 0 ? cibilScore : 0,
    createdAt: createdDate,
    stage: 'Lead Created',
    checklist: [
      { id: 'c1', name: 'Aadhaar Card', status: 'pending', uploadedAt: null, rejectedReason: null },
      { id: 'c2', name: 'PAN Card', status: 'pending', uploadedAt: null, rejectedReason: null },
      { id: 'c3', name: 'Income Proof', status: 'pending', uploadedAt: null, rejectedReason: null },
    ],
    issues: [],
    notes: [
      {
        id: `n${Date.now()}`,
        type: 'system',
        text: `Lead created · ${payload.loanType || 'Unknown'} · ${payload.location || 'NA'} · ${payload.businessType || 'NA'}`,
        author: 'System',
        role: 'system',
        time: new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      },
    ],
    activity: [
      {
        id: 'a1',
        event: 'Lead Created',
        detail: `${payload.loanType || 'Unknown'} · ${payload.location || 'NA'}`,
        status: 'done',
        date: 'Just now',
        by: 'You (Agent)',
      },
      {
        id: 'a2',
        event: 'Qualification Captured',
        detail: `Income ₹${monthlyIncome.toLocaleString('en-IN')} · ${payload.businessType || 'NA'} · CIBIL ${cibilScore || 'NA'}`,
        status: 'done',
        date: 'Just now',
        by: 'You (Agent)',
      },
      { id: 'a3', event: 'Checklist Generated', detail: 'Initial KYC checklist created', status: 'done', date: 'Just now', by: 'System' },
      { id: 'a4', event: 'Submit to Lender', detail: '', status: 'pending', date: '', by: '' },
      { id: 'a5', event: 'Approval / Rejection', detail: '', status: 'pending', date: '', by: '' },
      { id: 'a6', event: 'Commission Triggered', detail: '', status: 'pending', date: '', by: '' },
    ],
  }

  leads = [lead, ...leads]
  return structuredClone(lead)
}

export { ISSUE_TYPES }
