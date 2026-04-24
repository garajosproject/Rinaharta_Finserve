'use client'

import { LogOut, Loader2, RotateCcw } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useQueryClient } from '@tanstack/react-query'
import { getRoleLabel } from '@/lib/demo-access'
import { getAuthUser } from '@/store/auth.store'
import { useDeletedLeads, useLeads, useRestoreLead } from '@/hooks/useLead'

// ── Role badge colors ─────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  super_admin:    'bg-[#171717] text-white border-black/20',
  admin:          'bg-[#FEF2F2] text-brand-700 border-[#FECACA]',
  ops_manager:    'bg-[#EFF6FF] text-blue-700 border-blue-200',
  agent:          'bg-[#F0FDF4] text-green-700 border-green-200',
  lead_generator: 'bg-[#FFFBEB] text-amber-700 border-amber-200',
  viewer:         'bg-[#F5F5F5] text-gray-600 border-gray-200',
}

// ── Super Admin Controls ───────────────────────────────────────────────────────

function SuperAdminControls() {
  const { data: leads = [], isLoading } = useLeads()
  const { data: deletedLeads = [], isLoading: deletedLoading } = useDeletedLeads()
  const restore = useRestoreLead()
  const user    = getAuthUser()

  const totalLeads = leads.length

  // Group leads by assignedUser
  const leadsPerAgent = leads.reduce<Record<string, number>>((acc, lead) => {
    const key = lead.assignedUser ?? 'Unassigned'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const totalAgents = Object.keys(leadsPerAgent).filter((k) => k !== 'Unassigned').length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-subtle" />
      </div>
    )
  }

  return (
    <div>
      {/* Total Leads */}
      <div className="flex items-center justify-between border-b border-gray-50 py-3">
        <span className="text-sm text-ink">Total Leads</span>
        <span className="text-sm font-bold text-ink">{totalLeads}</span>
      </div>

      {/* Total Agents */}
      <div className="flex items-center justify-between border-b border-gray-50 py-3">
        <span className="text-sm text-ink">Total Agents</span>
        <span className="text-sm font-bold text-ink">{totalAgents}</span>
      </div>

      {/* Leads per Agent */}
      <div className="border-b border-gray-50 py-3">
        <p className="mb-2 text-sm text-ink">Leads per Agent</p>
        <div className="space-y-1.5">
          {Object.entries(leadsPerAgent)
            .filter(([k]) => k !== 'Unassigned')
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-xs text-muted">{name}</span>
                <span className="text-xs font-semibold text-ink">{count}</span>
              </div>
            ))}
          {leadsPerAgent['Unassigned'] !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-subtle">Unassigned</span>
              <span className="text-xs font-semibold text-subtle">{leadsPerAgent['Unassigned']}</span>
            </div>
          )}
          {Object.keys(leadsPerAgent).length === 0 && (
            <p className="text-xs text-subtle">No leads yet.</p>
          )}
        </div>
      </div>

      {/* Deleted Leads */}
      <div className="pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-ink">Deleted Leads</p>
          {deletedLeads.length > 0 && (
            <span className="text-xs font-bold text-muted">{deletedLeads.length}</span>
          )}
        </div>

        {deletedLoading ? (
          <div className="flex items-center gap-1.5 py-2 text-xs text-subtle">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        ) : deletedLeads.length === 0 ? (
          <p className="text-xs text-subtle">No deleted leads.</p>
        ) : (
          <div className="space-y-2">
            {deletedLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink">{lead.name}</p>
                  <p className="text-[10px] text-subtle">
                    {lead.id} · {lead.deleteReason ?? '—'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={restore.isPending}
                  onClick={() =>
                    restore.mutate({ leadId: lead.id, restoredBy: user?.name ?? 'Admin' })
                  }
                  className="flex flex-shrink-0 items-center gap-1 rounded border border-outline bg-white px-2 py-1 text-[10px] font-semibold text-ink transition hover:border-green-300 hover:text-green-700 disabled:opacity-50"
                >
                  {restore.isPending ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-2.5 w-2.5" />
                  )}
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Account Page ──────────────────────────────────────────────────────────────

export default function AccountPage() {
  const user         = useAuthStore((s) => s.user)
  const role         = useAuthStore((s) => s.role)
  const clearSession = useAuthStore((s) => s.clearSession)
  const queryClient  = useQueryClient()

  const roleLabel    = role ? getRoleLabel(role) : null
  const roleColor    = role ? (ROLE_COLORS[role] ?? 'bg-surface text-muted border-outline') : 'bg-surface text-muted border-outline'
  const isSuperAdmin = role === 'super_admin'

  function handleLogout() {
    clearSession()
    queryClient.clear()
    window.location.href = '/login'
  }

  return (
    <div className="mx-auto max-w-md space-y-4 py-2">

      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-ink">Account</h1>
        <p className="mt-0.5 text-xs text-subtle">Profile and session.</p>
      </div>

      {/* User Info */}
      <div className="rounded-lg border border-outline bg-white p-5 shadow-sm shadow-black/5">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.1em] text-subtle">User Info</p>
        <div className="flex items-center gap-4">
          <div
            suppressHydrationWarning
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-black text-white"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <p suppressHydrationWarning className="text-base font-extrabold text-ink">
              {user?.name || 'Guest'}
            </p>
            {user?.mobile && (
              <p suppressHydrationWarning className="mt-0.5 text-xs text-muted">
                +91 {user.mobile}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Role */}
      <div className="rounded-lg border border-outline bg-white px-5 py-4 shadow-sm shadow-black/5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-subtle">Role</p>
          {roleLabel && role && (
            <span
              suppressHydrationWarning
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${roleColor}`}
            >
              {roleLabel}
            </span>
          )}
        </div>
      </div>

      {/* Super Admin Controls — only visible to super_admin */}
      {isSuperAdmin && (
        <div className="rounded-lg border border-outline bg-white p-5 shadow-sm shadow-black/5">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.1em] text-subtle">Admin Controls</p>
          <SuperAdminControls />
        </div>
      )}

      {/* Sign Out */}
      <div className="rounded-lg border border-outline bg-white p-5 shadow-sm shadow-black/5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-bold text-brand-700 transition hover:bg-[#fee2e2]"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

    </div>
  )
}
