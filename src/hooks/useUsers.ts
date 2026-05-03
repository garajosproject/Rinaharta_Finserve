'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/use-toast'
import type { UserRole } from '@/types/lead'

// ── Fetch all users ───────────────────────────────────────────────────────────

export const useUsers = () =>
  useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('Failed to load users')
      return res.json()
    },
  })

// ── Create user + send invite ─────────────────────────────────────────────────

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; mobile: string; email: string; role: UserRole }) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create user')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'User created — invite sent' })
    },
    onError: (err: Error) => {
      toast({ title: err.message || 'Failed to create user' })
    },
  })
}

// ── Update user role / active ─────────────────────────────────────────────────

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; role?: UserRole; active?: boolean }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Update failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: Error) => {
      toast({ title: err.message || 'Update failed' })
    },
  })
}

// ── Resend invite ─────────────────────────────────────────────────────────────

export const useResendInvite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}/resend-invite`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to resend invite')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'Invite resent' })
    },
    onError: (err: Error) => {
      toast({ title: err.message })
    },
  })
}
