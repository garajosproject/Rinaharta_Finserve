/**
 * lead.service.ts — calls lead-storage (localStorage) directly.
 * No HTTP/axios. API routes remain as future backend stubs.
 */

import {
  storageListLeads,
  storageListDeletedLeads,
  storageFindLead,
  storageCreateLead,
  storageUpdateLead,
  storageAddNote,
  storageAddIssue,
  storageUpdateIssueStatus,
  storageUploadDocument,
  storageUpdateChecklistItem,
  storageUpdateAdminLeadStatus,
  storageUpdateLeadCibil,
  storageVerifyLeadCibil,
  storageFetchLeadCibil,
  storageUpdateWorkflowStep,
  storageAssignLead,
  storageSoftDeleteLead,
  storageRestoreLead,
} from '@/lib/lead-storage'
import type { AdminLeadStatus, ChecklistItem, Lead, LeadIssue, NewLeadPayload } from '@/types/lead'

function require<T>(val: T | null, message = 'Lead not found'): T {
  if (val === null) throw new Error(message)
  return val
}

// ── Read ───────────────────────────────────────────────────────────────────────

export const getLeads = (): Promise<Lead[]> =>
  Promise.resolve(storageListLeads())

export const listDeletedLeads = (): Promise<Lead[]> =>
  Promise.resolve(storageListDeletedLeads())

export const getLeadById = (id: string): Promise<Lead> =>
  Promise.resolve(require(storageFindLead(id)))

// ── Notes ──────────────────────────────────────────────────────────────────────

export const addNote = (leadId: string, message: string, author = 'You (Agent)'): Promise<Lead> =>
  Promise.resolve(require(storageAddNote(leadId, message, author)))

// ── Issues ─────────────────────────────────────────────────────────────────────

export const addIssue = (
  leadId: string,
  payload: Pick<LeadIssue, 'type' | 'description' | 'assignedTo' | 'priority'> & { documentId?: string | null }
): Promise<Lead> =>
  Promise.resolve(require(storageAddIssue(leadId, payload)))

export const updateIssueStatus = (
  leadId: string,
  issueId: string,
  status: LeadIssue['status']
): Promise<Lead> =>
  Promise.resolve(require(storageUpdateIssueStatus(leadId, issueId, status)))

// ── Documents ─────────────────────────────────────────────────────────────────

export const uploadDocument = (leadId: string, file: File): Promise<Lead> =>
  Promise.resolve(require(storageUploadDocument(leadId, file.name, file.size)))

export const updateChecklistItem = (
  leadId: string,
  docId: string,
  payload: Partial<ChecklistItem>
): Promise<Lead> =>
  Promise.resolve(require(storageUpdateChecklistItem(leadId, docId, payload)))

// ── CIBIL ──────────────────────────────────────────────────────────────────────

export const fetchCibil = (
  leadId: string,
  payload: { pan: string; name: string; dob: string; mobile: string }
): Promise<Lead> =>
  Promise.resolve(require(storageFetchLeadCibil(leadId, payload)))

export const updateLeadCibil = (
  leadId: string,
  payload: { cibilScore: number | null; cibilSource: 'api' | 'manual'; cibilVerified: boolean }
): Promise<Lead> =>
  Promise.resolve(require(storageUpdateLeadCibil(leadId, payload)))

export const verifyLeadCibil = (leadId: string, file: File): Promise<Lead> =>
  Promise.resolve(require(storageVerifyLeadCibil(leadId, file.name)))

// ── Lead CRUD ─────────────────────────────────────────────────────────────────

export const createLead = (payload: NewLeadPayload): Promise<Lead> =>
  Promise.resolve(storageCreateLead(payload))

export const updateLead = (
  leadId: string,
  payload: NewLeadPayload & { lastCompletedStep?: number }
): Promise<Lead> =>
  Promise.resolve(require(storageUpdateLead(leadId, payload, payload.lastCompletedStep)))

export const updateAdminLeadStatus = (leadId: string, adminStatus: AdminLeadStatus): Promise<Lead> =>
  Promise.resolve(require(storageUpdateAdminLeadStatus(leadId, adminStatus)))

// ── Workflow ──────────────────────────────────────────────────────────────────

export const updateWorkflowStep = (
  leadId: string,
  payload: {
    action: 'update_step' | 'assign'
    stepName?: import('@/types/lead').WorkflowStepName
    status?: import('@/types/lead').WorkflowStepStatus
    data?: Partial<import('@/types/lead').WorkflowStep['data']>
    remarks?: string
    changedBy?: string
    assignedUser?: string
  }
): Promise<Lead> => {
  if (payload.action === 'assign') {
    return Promise.resolve(
      require(storageAssignLead(leadId, payload.assignedUser ?? '', payload.changedBy ?? 'Agent'))
    )
  }
  return Promise.resolve(
    require(
      storageUpdateWorkflowStep(leadId, payload.stepName!, {
        status: payload.status,
        data: payload.data,
        remarks: payload.remarks,
        changedBy: payload.changedBy,
      })
    )
  )
}

// ── Soft delete / restore ─────────────────────────────────────────────────────

export const softDeleteLead = (
  leadId: string,
  reason: string,
  note: string,
  deletedBy: string,
  deletedById: string
): Promise<Lead> =>
  Promise.resolve(require(storageSoftDeleteLead(leadId, reason, note, deletedBy, deletedById)))

export const restoreLead = (leadId: string, restoredBy: string): Promise<Lead> =>
  Promise.resolve(require(storageRestoreLead(leadId, restoredBy)))
