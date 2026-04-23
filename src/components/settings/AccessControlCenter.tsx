'use client'

import { useState, useCallback } from 'react'
import {
  AlertTriangle, Check, ChevronDown, Clock, Copy,
  RefreshCw, Save, Shield, TriangleAlert, X,
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

type RoleKey = 'super_admin' | 'admin' | 'agent' | 'lead_generator' | 'viewer'
type PermKey = string
type PermMatrix = Record<RoleKey, Record<PermKey, boolean>>

type PermDef = { key: PermKey; label: string; danger?: boolean }
type ModuleDef = { key: string; name: string; permissions: PermDef[] }

type AuditEntry = {
  id: string
  action: string
  role: string
  changedBy: string
  timestamp: string
}

// ─── Modules & Permissions ────────────────────────────────────────────────────

const MODULES: ModuleDef[] = [
  {
    key: 'dashboard',
    name: 'Dashboard & Analytics',
    permissions: [
      { key: 'view_dashboard',      label: 'View Dashboard' },
      { key: 'view_district_stats', label: 'View District Stats' },
      { key: 'export_reports',      label: 'Export Reports' },
    ],
  },
  {
    key: 'leads',
    name: 'Lead Management',
    permissions: [
      { key: 'create_lead',   label: 'Create Lead' },
      { key: 'assign_lead',   label: 'Assign Lead' },
      { key: 'transfer_lead', label: 'Transfer Lead' },
      { key: 'update_status', label: 'Update Status' },
      { key: 'bulk_actions',  label: 'Bulk Actions' },
      { key: 'view_all_leads',label: 'View All Leads' },
    ],
  },
  {
    key: 'documents',
    name: 'Documents',
    permissions: [
      { key: 'upload_document',      label: 'Upload Document' },
      { key: 'verify_document',      label: 'Verify Document' },
      { key: 'download_document',    label: 'Download Document' },
      { key: 'remove_document',      label: 'Remove Document' },
      { key: 'send_document_issue',  label: 'Send Document Issue' },
    ],
  },
  {
    key: 'calling',
    name: 'Calling & Activity',
    permissions: [
      { key: 'log_call',          label: 'Log Call' },
      { key: 'update_call_status',label: 'Update Call Status' },
      { key: 'set_followup',      label: 'Set Follow-up' },
      { key: 'add_notes',         label: 'Add Notes' },
      { key: 'view_timeline',     label: 'View Timeline' },
    ],
  },
  {
    key: 'users',
    name: 'User Management',
    permissions: [
      { key: 'create_user',       label: 'Create User' },
      { key: 'edit_user_role',    label: 'Edit User Role' },
      { key: 'activate_user',     label: 'Activate / Deactivate User' },
      { key: 'assign_unique_code',label: 'Assign Unique Code' },
    ],
  },
  {
    key: 'payout',
    name: 'Payout & Commission',
    permissions: [
      { key: 'view_own_earnings',    label: 'View Own Earnings' },
      { key: 'view_all_commission',  label: 'View All Commission', danger: true },
      { key: 'mark_payout_paid',     label: 'Mark Payout Paid',   danger: true },
      { key: 'export_payout_report', label: 'Export Payout Report' },
    ],
  },
  {
    key: 'notifications',
    name: 'Notifications',
    permissions: [
      { key: 'trigger_sms',                  label: 'Trigger SMS' },
      { key: 'trigger_whatsapp',             label: 'Trigger WhatsApp' },
      { key: 'auto_notify_on_status_change', label: 'Auto-notify on Status Change' },
    ],
  },
  {
    key: 'security',
    name: 'Security & Compliance',
    permissions: [
      { key: 'enable_2fa',          label: 'Enable 2FA' },
      { key: 'mask_sensitive_data', label: 'Mask Sensitive Data' },
      { key: 'show_no_cash_warning',label: 'Show No-Cash Warning' },
    ],
  },
  {
    key: 'system',
    name: 'System Controls',
    permissions: [
      { key: 'configure_loan_types',  label: 'Configure Loan Types' },
      { key: 'set_commission_rules',  label: 'Set Commission Rules',  danger: true },
      { key: 'region_mapping',        label: 'Region Mapping' },
    ],
  },
]

// ─── Role configs ─────────────────────────────────────────────────────────────

type RoleConfig = {
  key: RoleKey
  label: string
  description: string
  userCount: number
  color: string
  badgeColor: string
}

const ROLES: RoleConfig[] = [
  {
    key:        'super_admin',
    label:      'Super Admin',
    description:'Full system access. Critical permissions are protected.',
    userCount:  1,
    color:      'border-brand-500 bg-[#FEF2F2]',
    badgeColor: 'bg-[#FEF2F2] text-brand-700 border-[#FECACA]',
  },
  {
    key:        'admin',
    label:      'Admin',
    description:'Manages operations, users, leads, and payouts.',
    userCount:  3,
    color:      'border-blue-400 bg-[#EFF6FF]',
    badgeColor: 'bg-[#EFF6FF] text-blue-700 border-blue-200',
  },
  {
    key:        'agent',
    label:      'Agent',
    description:'Creates and manages own leads, uploads documents.',
    userCount:  12,
    color:      'border-green-400 bg-[#F0FDF4]',
    badgeColor: 'bg-[#F0FDF4] text-green-700 border-green-200',
  },
  {
    key:        'lead_generator',
    label:      'Lead Generator',
    description:'Can only create and submit leads. No edit access.',
    userCount:  8,
    color:      'border-amber-400 bg-[#FFFBEB]',
    badgeColor: 'bg-[#FFFBEB] text-amber-700 border-amber-200',
  },
  {
    key:        'viewer',
    label:      'Viewer',
    description:'Read-only access across dashboard and leads.',
    userCount:  5,
    color:      'border-gray-300 bg-[#F5F5F5]',
    badgeColor: 'bg-[#F5F5F5] text-gray-600 border-gray-200',
  },
]

// ─── Critical permissions (Super Admin protection) ────────────────────────────

const CRITICAL_PERMISSIONS = new Set([
  'view_dashboard', 'create_lead', 'view_all_leads', 'add_notes', 'view_timeline',
])

const DANGER_PERMISSIONS = new Set([
  'view_all_commission', 'mark_payout_paid', 'set_commission_rules',
])

// ─── Default permission matrix ────────────────────────────────────────────────

function allPerms(val: boolean): Record<PermKey, boolean> {
  return Object.fromEntries(MODULES.flatMap((m) => m.permissions.map((p) => [p.key, val])))
}

const DEFAULT_MATRIX: PermMatrix = {
  super_admin: allPerms(true),
  admin: {
    view_dashboard: true, view_district_stats: true, export_reports: true,
    create_lead: true, assign_lead: true, transfer_lead: true, update_status: true, bulk_actions: true, view_all_leads: true,
    upload_document: true, verify_document: true, download_document: true, remove_document: true, send_document_issue: true,
    log_call: true, update_call_status: true, set_followup: true, add_notes: true, view_timeline: true,
    create_user: true, edit_user_role: true, activate_user: true, assign_unique_code: true,
    view_own_earnings: true, view_all_commission: true, mark_payout_paid: true, export_payout_report: true,
    trigger_sms: true, trigger_whatsapp: true, auto_notify_on_status_change: true,
    enable_2fa: true, mask_sensitive_data: true, show_no_cash_warning: true,
    configure_loan_types: false, set_commission_rules: false, region_mapping: false,
  },
  agent: {
    view_dashboard: true, view_district_stats: false, export_reports: false,
    create_lead: true, assign_lead: false, transfer_lead: false, update_status: true, bulk_actions: false, view_all_leads: false,
    upload_document: true, verify_document: false, download_document: true, remove_document: false, send_document_issue: true,
    log_call: true, update_call_status: true, set_followup: true, add_notes: true, view_timeline: true,
    create_user: false, edit_user_role: false, activate_user: false, assign_unique_code: false,
    view_own_earnings: true, view_all_commission: false, mark_payout_paid: false, export_payout_report: false,
    trigger_sms: false, trigger_whatsapp: false, auto_notify_on_status_change: false,
    enable_2fa: true, mask_sensitive_data: false, show_no_cash_warning: true,
    configure_loan_types: false, set_commission_rules: false, region_mapping: false,
  },
  lead_generator: {
    view_dashboard: true, view_district_stats: false, export_reports: false,
    create_lead: true, assign_lead: false, transfer_lead: false, update_status: false, bulk_actions: false, view_all_leads: false,
    upload_document: true, verify_document: false, download_document: false, remove_document: false, send_document_issue: false,
    log_call: false, update_call_status: false, set_followup: false, add_notes: true, view_timeline: false,
    create_user: false, edit_user_role: false, activate_user: false, assign_unique_code: false,
    view_own_earnings: true, view_all_commission: false, mark_payout_paid: false, export_payout_report: false,
    trigger_sms: false, trigger_whatsapp: false, auto_notify_on_status_change: false,
    enable_2fa: true, mask_sensitive_data: false, show_no_cash_warning: true,
    configure_loan_types: false, set_commission_rules: false, region_mapping: false,
  },
  viewer: {
    view_dashboard: true, view_district_stats: true, export_reports: false,
    create_lead: false, assign_lead: false, transfer_lead: false, update_status: false, bulk_actions: false, view_all_leads: true,
    upload_document: false, verify_document: false, download_document: true, remove_document: false, send_document_issue: false,
    log_call: false, update_call_status: false, set_followup: false, add_notes: false, view_timeline: true,
    create_user: false, edit_user_role: false, activate_user: false, assign_unique_code: false,
    view_own_earnings: true, view_all_commission: false, mark_payout_paid: false, export_payout_report: false,
    trigger_sms: false, trigger_whatsapp: false, auto_notify_on_status_change: false,
    enable_2fa: true, mask_sensitive_data: false, show_no_cash_warning: false,
    configure_loan_types: false, set_commission_rules: false, region_mapping: false,
  },
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Switch({ checked, onChange, disabled }: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-150 focus:outline-none
        ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
        ${checked ? 'bg-brand-500' : 'bg-[#E0E0E0]'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-150 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

// ─── Permission row ───────────────────────────────────────────────────────────

function PermRow({ perm, checked, onChange, disabled, isSuperAdmin }: {
  perm: PermDef
  checked: boolean
  onChange: () => void
  disabled?: boolean
  isSuperAdmin: boolean
}) {
  const isProtected = isSuperAdmin && CRITICAL_PERMISSIONS.has(perm.key)

  return (
    <div className="flex items-center justify-between gap-3 py-2 pl-8 pr-2 border-b border-gray-50 last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-ink truncate">{perm.label}</span>
        {perm.danger && (
          <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-[#FFFBEB] px-1.5 py-0.5 text-[9px] font-bold text-amber-600 flex-shrink-0">
            <TriangleAlert className="h-2.5 w-2.5" /> Sensitive
          </span>
        )}
        {isProtected && (
          <span className="inline-flex items-center gap-0.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-1.5 py-0.5 text-[9px] font-bold text-brand-600 flex-shrink-0">
            <Shield className="h-2.5 w-2.5" /> Protected
          </span>
        )}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled || isProtected} />
    </div>
  )
}

// ─── Module block ─────────────────────────────────────────────────────────────

function ModuleBlock({ mod, perms, onTogglePerm, onToggleMaster, isSuperAdmin }: {
  mod: ModuleDef
  perms: Record<PermKey, boolean>
  onTogglePerm: (key: PermKey) => void
  onToggleMaster: (moduleKey: string, val: boolean) => void
  isSuperAdmin: boolean
}) {
  const allOn  = mod.permissions.every((p) => perms[p.key])
  const anyOn  = mod.permissions.some((p) => perms[p.key])
  const partial = anyOn && !allOn

  return (
    <div className="rounded-lg border border-outline overflow-hidden">
      {/* Module header */}
      <div className="flex items-center justify-between gap-3 bg-[#FAFAFA] px-4 py-3 border-b border-outline">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">{mod.name}</span>
          {partial && (
            <span className="text-[10px] text-subtle font-medium">
              ({mod.permissions.filter((p) => perms[p.key]).length}/{mod.permissions.length})
            </span>
          )}
        </div>
        <Switch
          checked={anyOn}
          onChange={() => onToggleMaster(mod.key, !anyOn)}
          disabled={isSuperAdmin}
        />
      </div>
      {/* Permission rows */}
      <div>
        {mod.permissions.map((perm) => (
          <PermRow
            key={perm.key}
            perm={perm}
            checked={perms[perm.key] ?? false}
            onChange={() => onTogglePerm(perm.key)}
            disabled={!anyOn && !perms[perm.key]}
            isSuperAdmin={isSuperAdmin}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Danger confirm modal ─────────────────────────────────────────────────────

function DangerConfirm({ permLabel, onConfirm, onCancel }: {
  permLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#FECACA] bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#FEF2F2]">
            <AlertTriangle className="h-4 w-4 text-brand-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">Enable sensitive permission?</p>
            <p className="mt-1 text-xs text-muted">
              <strong className="text-ink">{permLabel}</strong> is a sensitive permission. Enabling it gives the role access to financial or privileged data.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 px-3 py-2 text-xs font-bold text-white transition"
          >
            Enable anyway
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-outline bg-white hover:bg-surface px-3 py-2 text-xs font-semibold text-muted transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Audit log ────────────────────────────────────────────────────────────────

const INITIAL_AUDIT: AuditEntry[] = [
  { id: 'a1', action: 'Enabled export_reports',       role: 'Admin',          changedBy: 'Prashant Shinde', timestamp: '22 Apr, 10:42' },
  { id: 'a2', action: 'Disabled bulk_actions',        role: 'Agent',          changedBy: 'Prashant Shinde', timestamp: '22 Apr, 10:38' },
  { id: 'a3', action: 'Enabled view_all_commission',  role: 'Admin',          changedBy: 'Ravi Kumar',      timestamp: '21 Apr, 17:15' },
  { id: 'a4', action: 'Cloned from Admin → Ops',      role: 'Ops Manager',    changedBy: 'Ravi Kumar',      timestamp: '21 Apr, 16:50' },
  { id: 'a5', action: 'Reset to default',             role: 'Lead Generator', changedBy: 'Prashant Shinde', timestamp: '20 Apr, 11:22' },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function AccessControlCenter() {
  const [selectedRole, setSelectedRole] = useState<RoleKey>('admin')
  const [matrix, setMatrix]             = useState<PermMatrix>(DEFAULT_MATRIX)
  const [dirty, setDirty]               = useState(false)
  const [auditLog, setAuditLog]         = useState<AuditEntry[]>(INITIAL_AUDIT)
  const [cloneSource, setCloneSource]   = useState<RoleKey>('super_admin')
  const [danger, setDanger]             = useState<{ key: PermKey; label: string } | null>(null)
  const [saved, setSaved]               = useState(false)

  const role = ROLES.find((r) => r.key === selectedRole)!
  const isSuperAdmin = selectedRole === 'super_admin'
  const currentPerms = matrix[selectedRole]

  function addAudit(action: string) {
    const entry: AuditEntry = {
      id: `a${Date.now()}`,
      action,
      role: role.label,
      changedBy: 'You',
      timestamp: new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    }
    setAuditLog((prev) => [entry, ...prev].slice(0, 10))
  }

  const togglePerm = useCallback((key: PermKey) => {
    if (isSuperAdmin && CRITICAL_PERMISSIONS.has(key)) return
    const current = matrix[selectedRole][key]
    // Going ON and it's a danger permission → show confirm
    if (!current && DANGER_PERMISSIONS.has(key)) {
      const label = MODULES.flatMap((m) => m.permissions).find((p) => p.key === key)?.label ?? key
      setDanger({ key, label })
      return
    }
    applyToggle(key)
  }, [isSuperAdmin, matrix, selectedRole])

  function applyToggle(key: PermKey) {
    setMatrix((prev) => ({
      ...prev,
      [selectedRole]: { ...prev[selectedRole], [key]: !prev[selectedRole][key] },
    }))
    setDirty(true)
    setDanger(null)
  }

  function toggleMaster(moduleKey: string, val: boolean) {
    if (isSuperAdmin) return
    const mod = MODULES.find((m) => m.key === moduleKey)!
    const updates: Record<PermKey, boolean> = {}
    mod.permissions.forEach((p) => {
      if (isSuperAdmin && CRITICAL_PERMISSIONS.has(p.key)) {
        updates[p.key] = true
      } else {
        updates[p.key] = val
      }
    })
    setMatrix((prev) => ({
      ...prev,
      [selectedRole]: { ...prev[selectedRole], ...updates },
    }))
    setDirty(true)
    addAudit(`${val ? 'Enabled' : 'Disabled'} all in ${mod.name}`)
  }

  function handleClone() {
    if (cloneSource === selectedRole) return
    const sourceLabel = ROLES.find((r) => r.key === cloneSource)?.label ?? cloneSource
    setMatrix((prev) => ({
      ...prev,
      [selectedRole]: { ...prev[cloneSource] },
    }))
    setDirty(true)
    addAudit(`Cloned from ${sourceLabel}`)
    toast({ title: `Permissions cloned from ${sourceLabel}` })
  }

  function handleReset() {
    setMatrix((prev) => ({
      ...prev,
      [selectedRole]: { ...DEFAULT_MATRIX[selectedRole] },
    }))
    setDirty(true)
    addAudit('Reset to default')
    toast({ title: 'Permissions reset to default' })
  }

  function handleSave() {
    setDirty(false)
    setSaved(true)
    addAudit('Saved permission changes')
    toast({ title: `${role.label} permissions saved` })
    setTimeout(() => setSaved(false), 2000)
  }

  const enabledCount  = Object.values(currentPerms).filter(Boolean).length
  const totalCount    = Object.values(currentPerms).length

  return (
    <div className="rounded-md border border-black/5 bg-white shadow-sm shadow-black/5 overflow-hidden">

      {/* ── Section header ── */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <Shield className="h-4 w-4 text-brand-500 flex-shrink-0" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">Access Control Center</p>
          <p className="text-xs text-muted mt-0.5">Configure permissions per role using switches</p>
        </div>
      </div>

      <div className="p-5 space-y-6">

        {/* ── Sticky role selector ── */}
        <div className="sticky top-0 z-10 -mx-5 -mt-5 px-5 pt-5 pb-4 bg-white border-b border-outline">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <select
                className="w-full appearance-none rounded-lg border border-outline bg-white px-3 py-2.5 pr-8 text-sm font-bold text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-[#FEF2F2] cursor-pointer"
                value={selectedRole}
                onChange={(e) => { setSelectedRole(e.target.value as RoleKey); setDirty(false) }}
              >
                {ROLES.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
            </div>

            <div className={`flex-1 rounded-lg border px-3 py-2.5 ${role.color}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-ink">{role.description}</p>
                  <p className="text-[10px] text-subtle mt-0.5">{role.userCount} user{role.userCount !== 1 ? 's' : ''} · {enabledCount}/{totalCount} permissions enabled</p>
                </div>
                {isSuperAdmin && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full border border-[#FECACA] bg-white px-2 py-0.5 text-[9px] font-bold text-brand-600">
                    <Shield className="h-2.5 w-2.5" /> Protected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Master controls (clone + reset) ── */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-outline bg-surface px-3 py-2">
            <span className="text-[10px] font-semibold text-subtle">Clone from:</span>
            <select
              className="text-xs font-semibold text-ink bg-transparent outline-none cursor-pointer"
              value={cloneSource}
              onChange={(e) => setCloneSource(e.target.value as RoleKey)}
            >
              {ROLES.filter((r) => r.key !== selectedRole).map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleClone}
              className="flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-700 transition"
            >
              <Copy className="h-3 w-3" /> Apply
            </button>
          </div>
          <button
            type="button"
            onClick={handleReset}
            disabled={isSuperAdmin}
            className="flex items-center gap-1.5 rounded-lg border border-outline bg-surface px-3 py-2 text-xs font-semibold text-muted hover:border-brand-200 hover:text-ink transition disabled:opacity-40"
          >
            <RefreshCw className="h-3 w-3" /> Reset to Default
          </button>
        </div>

        {/* ── Permissions matrix ── */}
        <div className="space-y-3">
          {MODULES.map((mod) => (
            <ModuleBlock
              key={mod.key}
              mod={mod}
              perms={currentPerms}
              onTogglePerm={togglePerm}
              onToggleMaster={toggleMaster}
              isSuperAdmin={isSuperAdmin}
            />
          ))}
        </div>

        {/* ── Audit log ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-3.5 w-3.5 text-subtle" />
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-subtle">Recent Changes</p>
          </div>
          <div className="rounded-lg border border-outline overflow-hidden">
            {auditLog.slice(0, 10).map((entry, i) => (
              <div key={entry.id} className={`flex items-start gap-3 px-4 py-3 text-xs border-b border-gray-50 last:border-b-0 ${i === 0 && dirty === false && saved ? 'bg-[#F0FDF4]' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{entry.action}</p>
                  <p className="text-subtle mt-0.5">{entry.role} · by {entry.changedBy}</p>
                </div>
                <p className="text-[10px] text-subtle flex-shrink-0 mt-0.5">{entry.timestamp}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Sticky save bar ── */}
      {dirty && (
        <div className="sticky bottom-0 border-t border-outline bg-white px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted">Unsaved changes for <strong className="text-ink">{role.label}</strong></p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setMatrix((prev) => ({ ...prev, [selectedRole]: { ...DEFAULT_MATRIX[selectedRole] } })); setDirty(false) }}
              className="rounded-lg border border-outline bg-white px-3 py-2 text-xs font-semibold text-muted hover:bg-surface transition"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2 text-xs font-bold text-white transition"
            >
              {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : <><Save className="h-3.5 w-3.5" /> Save Changes</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Danger confirm modal ── */}
      {danger && (
        <DangerConfirm
          permLabel={danger.label}
          onConfirm={() => applyToggle(danger.key)}
          onCancel={() => setDanger(null)}
        />
      )}

    </div>
  )
}
