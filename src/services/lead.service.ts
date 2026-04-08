import { api } from '@/services/api'
import type { ChecklistItem, Lead, LeadIssue, NewLeadPayload } from '@/types/lead'

export const getLeads = async () => {
  const { data } = await api.get<Lead[]>('/leads')
  return data
}

export const getLeadById = async (id: string) => {
  const { data } = await api.get<Lead>(`/leads/${id}`)
  return data
}

export const addNote = async (leadId: string, message: string) => {
  const { data } = await api.post<Lead>(`/leads/${leadId}/notes`, { message })
  return data
}

export const addIssue = async (
  leadId: string,
  payload: Pick<LeadIssue, 'type' | 'description' | 'assignedTo' | 'priority'>
) => {
  const { data } = await api.post<Lead>(`/leads/${leadId}/issues`, payload)
  return data
}

export const uploadDocument = async (leadId: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<Lead>(`/leads/${leadId}/documents`, form)
  return data
}

export const updateChecklistItem = async (
  leadId: string,
  docId: string,
  payload: Partial<ChecklistItem>
) => {
  const { data } = await api.patch<Lead>(`/leads/${leadId}/checklist/${docId}`, payload)
  return data
}

export const createLead = async (payload: NewLeadPayload) => {
  const { data } = await api.post<Lead>('/leads', payload)
  return data
}

export const updateLead = async (
  leadId: string,
  payload: NewLeadPayload & { lastCompletedStep?: number }
) => {
  const { data } = await api.put<Lead>(`/leads/${leadId}`, payload)
  return data
}
