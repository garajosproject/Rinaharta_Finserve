'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from '@/services/lead.service'
import { toast } from '@/components/ui/use-toast'
import type { ChecklistItem, LeadIssue } from '@/types/lead'

export const useLeads = () =>
  useQuery({
    queryKey: ['leads'],
    queryFn: service.getLeads,
  })

export const useLead = (id: string) =>
  useQuery({
    queryKey: ['lead', id],
    queryFn: () => service.getLeadById(id),
    enabled: Boolean(id),
  })

export const useAddNote = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (message: string) => service.addNote(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast({ title: 'Note added' })
    },
  })
}

export const useAddIssue = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (
      payload: Pick<LeadIssue, 'type' | 'description' | 'assignedTo' | 'priority'>
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
