'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronDown, Edit2, Loader2, MailCheck, Plus, RotateCcw, Send, ShieldCheck, Trash2, UserX } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { getRoleLabel } from '@/lib/demo-access'
import { getAuthUser } from '@/store/auth.store'
import { useDeletedLeads, useRestoreLead } from '@/hooks/useLead'
import { useUsers, useCreateUser, useUpdateUser, useResendInvite } from '@/hooks/useUsers'
import type { AppUser } from '@/lib/user-storage'
import type { Lead, UserRole } from '@/types/lead'
import AccessControlCenter from '@/components/settings/AccessControlCenter'

// ── Role config ───────────────────────────────────────────────────────────────

const ROLE_OPTIONS: UserRole[] = ['super_admin', 'admin', 'agent', 'lead_generator', 'viewer']

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin:    'bg-[#171717] text-white border-black/20',
  admin:          'bg-[#FEF2F2] text-brand-700 border-[#FECACA]',
  ops_manager:    'bg-[#EFF6FF] text-blue-700 border-blue-200',
  agent:          'bg-[#F0FDF4] text-green-700 border-green-200',
  lead_generator: 'bg-[#FFFBEB] text-amber-700 border-amber-200',
  viewer:         'bg-[#F5F5F5] text-gray-600 border-gray-200',
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[role] ?? ''}`}>
      {getRoleLabel(role)}
    </span>
  )
}

function StatusBadge({ status }: { status: 'pending' | 'active' }) {
  return status === 'active' ? (
    <span className="inline-flex items-center gap-0.5 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
      <CheckCircle2 className="h-2.5 w-2.5" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
      <MailCheck className="h-2.5 w-2.5" /> Not Joined
    </span>
  )
}

// ── Role dropdown ─────────────────────────────────────────────────────────────

function RoleDropdown({ value, onChange }: { value: UserRole; onChange: (r: UserRole) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-outline bg-white px-3 py-1.5 text-xs text-ink transition hover:bg-surface"
      >
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[value] ?? ''}`}>
          {getRoleLabel(value)}
        </span>
        <ChevronDown className={`h-3 w-3 text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-lg border border-outline bg-white py-1 shadow-lg">
            {ROLE_OPTIONS.map((r) => (
              <button key={r} type="button" onClick={() => { onChange(r); setOpen(false) }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs text-ink transition hover:bg-surface">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[r] ?? ''}`}>
                  {getRoleLabel(r)}
                </span>
                {r === value && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Create user form ──────────────────────────────────────────────────────────

function CreateUserForm() {
  const createUser = useCreateUser()
  const [name,   setName]   = useState('')
  const [mobile, setMobile] = useState('')
  const [email,  setEmail]  = useState('')
  const [role,   setRole]   = useState<UserRole>('agent')

  const inputCls = 'w-full rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-xs text-ink placeholder:text-subtle outline-none focus:border-brand-500 focus:ring-2 focus:ring-[#FEF2F2]'

  function handleAdd() {
    if (!name.trim() || !mobile.trim() || !email.trim()) return
    createUser.mutate({ name: name.trim(), mobile: mobile.replace(/\D/g,''), email: email.trim().toLowerCase(), role },
      { onSuccess: () => { setName(''); setMobile(''); setEmail(''); setRole('agent') } }
    )
  }

  return (
    <div className="rounded-lg border border-outline bg-surface p-4 space-y-3">
      <p className="text-xs font-bold text-ink">Create New User</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-subtle mb-1">Full Name *</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ravi Kumar" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-subtle mb-1">Mobile *</label>
          <input className={inputCls} value={mobile} inputMode="numeric"
            onChange={(e) => setMobile(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="10-digit number" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-subtle mb-1">Email * <span className="text-brand-500">(invite sent here)</span></label>
          <input className={inputCls} value={email} type="email"
            onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-subtle mb-1">Role</label>
          <RoleDropdown value={role} onChange={setRole} />
        </div>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={createUser.isPending || !name.trim() || !mobile.trim() || !email.trim()}
        className="flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-700 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white transition"
      >
        {createUser.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        {createUser.isPending ? 'Creating…' : 'Add User & Send Invite'}
      </button>
    </div>
  )
}

// ── User row ──────────────────────────────────────────────────────────────────

function UserRow({ user }: { user: AppUser }) {
  const updateUser   = useUpdateUser()
  const resendInvite = useResendInvite()
  const [editing, setEditing] = useState(false)

  return (
    <div className={`flex flex-wrap items-center gap-3 border-b border-gray-50 px-4 py-3.5 last:border-b-0 ${!user.active ? 'opacity-50' : ''}`}>
      {/* Avatar */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand-500 text-xs font-bold text-white">
        {user.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className="text-[10px] text-subtle">+91 {user.mobile.slice(0,5)} {user.mobile.slice(5)}</span>
          {user.email && <span className="text-[10px] text-subtle truncate max-w-[140px]">{user.email}</span>}
          <StatusBadge status={user.onboardingStatus} />
        </div>
      </div>

      {/* Role */}
      <div className="flex items-center gap-2">
        {editing ? (
          <RoleDropdown
            value={user.role}
            onChange={(r) => { updateUser.mutate({ id: user.id, role: r }); setEditing(false) }}
          />
        ) : (
          <RoleBadge role={user.role} />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button type="button" title="Edit role" onClick={() => setEditing(!editing)}
          className="rounded-md p-1.5 text-subtle hover:bg-surface hover:text-ink transition">
          <Edit2 className="h-3.5 w-3.5" />
        </button>

        {user.onboardingStatus === 'pending' && (
          <button type="button" title="Resend invite" onClick={() => resendInvite.mutate(user.id)}
            disabled={resendInvite.isPending}
            className="rounded-md p-1.5 text-subtle hover:bg-blue-50 hover:text-blue-600 transition disabled:opacity-40">
            {resendInvite.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        )}

        <button type="button" title={user.active ? 'Deactivate' : 'Activate'}
          onClick={() => updateUser.mutate({ id: user.id, active: !user.active })}
          disabled={updateUser.isPending}
          className={`rounded-md p-1.5 transition disabled:opacity-40 ${user.active ? 'text-subtle hover:bg-[#FEF2F2] hover:text-brand-600' : 'text-green-500 hover:bg-[#F0FDF4]'}`}>
          {user.active ? <UserX className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ── Deleted leads section ─────────────────────────────────────────────────────

function formatDeletedDate(iso: string | null): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

function DeletedLeadCard({ lead }: { lead: Lead }) {
  const restore = useRestoreLead()
  const user    = getAuthUser()
  return (
    <div className="flex items-start gap-3 border-b border-gray-50 px-4 py-4 last:border-b-0">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-surface border border-outline text-xs font-bold text-muted">
        {lead.initials || lead.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{lead.name} <span className="text-[11px] font-normal text-subtle">({lead.id})</span></p>
        <div className="mt-1 space-y-0.5 text-[11px] text-muted">
          <p><span className="text-subtle">Deleted by:</span> {lead.deletedBy ?? '—'}</p>
          <p><span className="text-subtle">Reason:</span> {lead.deleteReason ?? '—'}</p>
          {lead.deleteNote && <p><span className="text-subtle">Note:</span> {lead.deleteNote}</p>}
          <p><span className="text-subtle">Date:</span> {formatDeletedDate(lead.deletedAt)}</p>
        </div>
      </div>
      <button type="button" disabled={restore.isPending}
        onClick={() => restore.mutate({ leadId: lead.id, restoredBy: user?.name ?? 'Admin' })}
        className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-outline bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-white hover:border-green-300 hover:text-green-700 transition disabled:opacity-50">
        {restore.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
        Restore
      </button>
    </div>
  )
}

function DeletedLeadsSection() {
  const { data: deletedLeads = [], isLoading } = useDeletedLeads()
  return (
    <div className="rounded-md border border-black/5 bg-white shadow-sm shadow-black/5 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <Trash2 className="h-4 w-4 text-brand-500 flex-shrink-0" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">Deleted Leads</p>
          <p className="text-xs text-muted mt-0.5">Soft-deleted leads — restore anytime.</p>
        </div>
        {deletedLeads.length > 0 && (
          <span className="ml-auto flex items-center justify-center rounded-full bg-[#FEF2F2] border border-[#FECACA] px-2 py-0.5 text-[10px] font-bold text-brand-700">
            {deletedLeads.length}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-subtle" /></div>
      ) : deletedLeads.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface mb-2"><Trash2 className="h-5 w-5 text-subtle" /></div>
          <p className="text-sm font-semibold text-ink">No deleted leads</p>
          <p className="mt-0.5 text-xs text-muted">Deleted leads appear here for recovery.</p>
        </div>
      ) : (
        <div>{deletedLeads.map((lead) => <DeletedLeadCard key={lead.id} lead={lead} />)}</div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const role = useAuthStore((state) => state.role)
  const user = useAuthStore((state) => state.user)
  const { data: users = [], isLoading: usersLoading } = useUsers()
  const canManageRBAC = role === 'super_admin' || role === 'admin' || role === 'ops_manager'

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">

      {/* Header */}
      <div className="rounded-md border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Settings</p>
        <h1 className="mt-1 text-lg font-bold text-ink">Workspace Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage your account, roles, and preferences.</p>
      </div>

      {/* Current session */}
      <div className="rounded-md border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-subtle mb-3">Current Session</p>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-500 text-sm font-black text-white flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="text-sm font-bold text-ink">{user?.name ?? 'Guest'}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {role && <RoleBadge role={role} />}
            </div>
          </div>
        </div>
      </div>

      {/* User & role management */}
      {canManageRBAC ? (
        <div className="rounded-md border border-black/5 bg-white shadow-sm shadow-black/5 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <ShieldCheck className="h-4 w-4 text-brand-500 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">User & Role Management</p>
              <p className="text-xs text-muted mt-0.5">Create users, assign roles, send onboarding invites</p>
            </div>
            {usersLoading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-subtle" />}
          </div>
          <div className="p-5 space-y-4">
            <CreateUserForm />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-subtle mb-2">
                All Users ({users.length})
              </p>
              <div className="rounded-lg border border-outline overflow-hidden">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-subtle" /></div>
                ) : (
                  users.map((u: AppUser) => <UserRow key={u.id} user={u} />)
                )}
              </div>
            </div>
            <div className="rounded-lg border border-[#E0E0E0] bg-[#F5F5F5] px-4 py-3">
              <p className="text-[10px] font-bold text-subtle uppercase tracking-wide mb-1.5">Role Permissions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((r) => (
                  <div key={r} className="flex items-center gap-2">
                    <RoleBadge role={r} />
                    <span className="text-[10px] text-subtle">
                      {r === 'super_admin'    && '— Owner, all controls'}
                      {r === 'admin'          && '— Full access'}
                      {r === 'agent'          && '— Create + manage leads'}
                      {r === 'lead_generator' && '— Create leads only'}
                      {r === 'viewer'         && '— Read-only access'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
          <div className="flex items-center gap-2 text-muted">
            <ShieldCheck className="h-4 w-4 text-subtle flex-shrink-0" />
            <p className="text-sm">User management available to <strong className="text-ink">Admin</strong> and above.</p>
          </div>
        </div>
      )}

      {canManageRBAC && <AccessControlCenter />}
      {(role === 'super_admin' || role === 'admin') && <DeletedLeadsSection />}

    </div>
  )
}
