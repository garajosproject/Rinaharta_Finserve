/**
 * lead.service.ts — thin async wrapper over lead-storage.
 * Storage layer now async (Supabase or localStorage).
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
  storageUpsertChecklistItem,
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

function requireLead(val: Lead | null, message = 'Lead not found'): Lead {
  if (val === null) throw new Error(message)
  return val
}

// ── Read ───────────────────────────────────────────────────────────────────────

export const getLeads = (): Promise<Lead[]> =>
  storageListLeads()

export const listDeletedLeads = (): Promise<Lead[]> =>
  storageListDeletedLeads()

export const getLeadById = async (id: string): Promise<Lead> =>
  requireLead(await storageFindLead(id))

// ── Notes ──────────────────────────────────────────────────────────────────────

export const addNote = async (leadId: string, message: string, author = 'You (Agent)'): Promise<Lead> =>
  requireLead(await storageAddNote(leadId, message, author))

// ── Issues ─────────────────────────────────────────────────────────────────────

export const addIssue = async (
  leadId: string,
  payload: Pick<LeadIssue, 'type' | 'description' | 'assignedTo' | 'priority'> & { documentId?: string | null }
): Promise<Lead> =>
  requireLead(await storageAddIssue(leadId, payload))

export const updateIssueStatus = async (
  leadId: string, issueId: string, status: LeadIssue['status']
): Promise<Lead> =>
  requireLead(await storageUpdateIssueStatus(leadId, issueId, status))

// ── Documents ─────────────────────────────────────────────────────────────────

export const uploadDocument = async (leadId: string, file: File): Promise<Lead> =>
  requireLead(await storageUploadDocument(leadId, file.name, file.size))

export const updateChecklistItem = async (
  leadId: string, docId: string, payload: Partial<ChecklistItem>
): Promise<Lead> =>
  requireLead(await storageUpdateChecklistItem(leadId, docId, payload))

export const upsertChecklistItem = async (
  leadId: string, docId: string, docName: string, updates: Partial<ChecklistItem>
): Promise<Lead> =>
  requireLead(await storageUpsertChecklistItem(leadId, docId, docName, updates))

// ── CIBIL ──────────────────────────────────────────────────────────────────────

export const fetchCibil = async (
  leadId: string, payload: { pan: string; name: string; dob: string; mobile: string }
): Promise<Lead> =>
  requireLead(await storageFetchLeadCibil(leadId, payload))

export const updateLeadCibil = async (
  leadId: string,
  payload: { cibilScore: number | null; cibilSource: 'api' | 'manual'; cibilVerified: boolean }
): Promise<Lead> =>
  requireLead(await storageUpdateLeadCibil(leadId, payload))

export const verifyLeadCibil = async (leadId: string, file: File): Promise<Lead> =>
  requireLead(await storageVerifyLeadCibil(leadId, file.name))

// ── Lead CRUD ─────────────────────────────────────────────────────────────────

export const createLead = (payload: NewLeadPayload): Promise<Lead> =>
  storageCreateLead(payload)

export const updateLead = async (
  leadId: string, payload: NewLeadPayload & { lastCompletedStep?: number }
): Promise<Lead> =>
  requireLead(await storageUpdateLead(leadId, payload, payload.lastCompletedStep))

export const updateAdminLeadStatus = async (leadId: string, adminStatus: AdminLeadStatus): Promise<Lead> =>
  requireLead(await storageUpdateAdminLeadStatus(leadId, adminStatus))

// ── Workflow ──────────────────────────────────────────────────────────────────

export const updateWorkflowStep = async (
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
    return requireLead(await storageAssignLead(leadId, payload.assignedUser ?? '', payload.changedBy ?? 'Agent'))
  }
  return requireLead(await storageUpdateWorkflowStep(leadId, payload.stepName!, {
    status: payload.status, data: payload.data, remarks: payload.remarks, changedBy: payload.changedBy,
  }))
}

// ── Soft delete / restore ─────────────────────────────────────────────────────

export const softDeleteLead = async (
  leadId: string, reason: string, note: string, deletedBy: string, deletedById: string
): Promise<Lead> =>
  requireLead(await storageSoftDeleteLead(leadId, reason, note, deletedBy, deletedById))

export const restoreLead = async (leadId: string, restoredBy: string): Promise<Lead> =>
  requireLead(await storageRestoreLead(leadId, restoredBy))
