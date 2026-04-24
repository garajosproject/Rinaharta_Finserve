'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from '@/services/lead.service'
import { toast } from '@/components/ui/use-toast'
import { getAuthUser } from '@/store/auth.store'
import type { AdminLeadStatus, ChecklistItem, Lead, LeadIssue, NewLeadPayload, WorkflowStepName, WorkflowStepStatus, WorkflowStep } from '@/types/lead'

export const useLeads = () =>
  useQuery({
    queryKey: ['leads'],
    queryFn: service.getLeads,
  })

export const useCreateLead = () => {
  const queryClient = useQueryClient()

  return useMutation<Lead, Error, NewLeadPayload>({
    mutationFn: (payload) => service.createLead(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: () => {
      toast({ title: 'Failed to create lead. Please try again.' })
    },
  })
}

export const useLead = (id: string) =>
  useQuery({
    queryKey: ['lead', id],
    queryFn: () => service.getLeadById(id),
    enabled: Boolean(id),
  })

export const useAddNote = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (message: string) => service.addNote(id, message, getAuthUser()?.name || 'Demo User'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast({ title: 'Note added' })
    },
  })
}

export const useUpdateIssueStatus = (leadId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ issueId, status }: { issueId: string; status: LeadIssue['status'] }) =>
      service.updateIssueStatus(leadId, issueId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast({ title: 'Issue updated' })
    },
  })
}

export const useAddIssue = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (
      payload: Pick<LeadIssue, 'type' | 'description' | 'assignedTo' | 'priority'> & { documentId?: string | null }
    ) => service.addIssue(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast({ title: 'Issue raised' })
    },
  })
}

export const useUploadDoc = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => service.uploadDocument(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast({ title: 'Document uploaded' })
    },
  })
}

export const useUpdateChecklistItem = (leadId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ docId, payload }: { docId: string; payload: Partial<ChecklistItem> }) =>
      service.updateChecklistItem(leadId, docId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export const useUpsertChecklistItem = (leadId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ docId, docName, updates }: { docId: string; docName: string; updates: Partial<ChecklistItem> }) =>
      service.upsertChecklistItem(leadId, docId, docName, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export const useUpdateAdminLeadStatus = (leadId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (adminStatus: AdminLeadStatus) => service.updateAdminLeadStatus(leadId, adminStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast({ title: 'Lead status updated' })
    },
  })
}

export const useFetchCibil = (leadId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { pan: string; name: string; dob: string; mobile: string }) =>
      service.fetchCibil(leadId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast({ title: 'CIBIL fetched successfully' })
    },
  })
}

export const useUpdateLeadCibil = (leadId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { cibilScore: number | null; cibilSource: 'api' | 'manual'; cibilVerified: boolean }) =>
      service.updateLeadCibil(leadId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast({ title: 'CIBIL updated' })
    },
  })
}

export const useVerifyLeadCibil = (leadId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => service.verifyLeadCibil(leadId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast({ title: 'CIBIL report verified' })
    },
  })
}

export const useDeletedLeads = () =>
  useQuery({
    queryKey: ['deleted-leads'],
    queryFn: service.listDeletedLeads,
  })

export const useDeleteLead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      leadId,
      reason,
      note,
      deletedBy,
      deletedById,
    }: {
      leadId: string
      reason: string
      note: string
      deletedBy: string
      deletedById: string
    }) => service.softDeleteLead(leadId, reason, note, deletedBy, deletedById),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead', vars.leadId] })
      queryClient.invalidateQueries({ queryKey: ['deleted-leads'] })
      toast({ title: 'Lead deleted' })
    },
    onError: (err: Error) => {
      toast({ title: err.message || 'Delete failed' })
    },
  })
}

export const useRestoreLead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ leadId, restoredBy }: { leadId: string; restoredBy: string }) =>
      service.restoreLead(leadId, restoredBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['deleted-leads'] })
      toast({ title: 'Lead restored successfully' })
    },
    onError: (err: Error) => {
      toast({ title: err.message || 'Restore failed' })
    },
  })
}

export const useUpdateWorkflowStep = (leadId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      action: 'update_step' | 'assign'
      stepName?: WorkflowStepName
      status?: WorkflowStepStatus
      data?: Partial<WorkflowStep['data']>
      remarks?: string
      changedBy?: string
      assignedUser?: string
    }) => service.updateWorkflowStep(leadId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: (err: Error) => {
      toast({ title: err.message || 'Workflow update failed' })
    },
  })
}
