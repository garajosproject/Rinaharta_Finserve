import type { AdminLeadStatus, Lead, LeadDocumentAsset, LeadSourceType, UserRole } from '@/types/lead'

export const ADMIN_STATUS_OPTIONS: AdminLeadStatus[] = [
  'L1: New Lead',
  'L2: Documentation',
  'L3: Bank Login',
  'L4: Sanctioned',
  'L5: Disbursed',
]

export const ADMIN_ALLOWED_ROLES: UserRole[] = ['super_admin', 'admin', 'ops_manager']

const LEGACY_STATUS_BY_ADMIN_STATUS: Record<AdminLeadStatus, Lead['status']> = {
  'L1: New Lead': 'New',
  'L2: Documentation': 'Docs Pending',
  'L3: Bank Login': 'In Progress',
  'L4: Sanctioned': 'Approved',
  'L5: Disbursed': 'Approved',
}

const STAGE_BY_ADMIN_STATUS: Record<AdminLeadStatus, string> = {
  'L1: New Lead': 'New lead',
  'L2: Documentation': 'Documentation',
  'L3: Bank Login': 'Bank login',
  'L4: Sanctioned': 'Sanctioned',
  'L5: Disbursed': 'Disbursed',
}

const PROGRESS_BY_ADMIN_STATUS: Record<AdminLeadStatus, number> = {
  'L1: New Lead': 20,
  'L2: Documentation': 40,
  'L3: Bank Login': 60,
  'L4: Sanctioned': 80,
  'L5: Disbursed': 100,
}

export function calculateLeadCommission(loanAmount: number, commissionRate: number) {
  return Math.round((loanAmount * commissionRate) / 100)
}

export function isCommissionPayable(status: AdminLeadStatus) {
  return status === 'L5: Disbursed'
}

export function getPayableCommission(lead: Pick<Lead, 'amount' | 'commissionRate' | 'adminStatus'>) {
  return isCommissionPayable(lead.adminStatus)
    ? calculateLeadCommission(lead.amount, lead.commissionRate)
    : 0
}

export function getDisplayCommission(lead: Pick<Lead, 'amount' | 'commissionRate'>) {
  return calculateLeadCommission(lead.amount, lead.commissionRate)
}

export function syncLeadProgressFromAdminStatus(adminStatus: AdminLeadStatus) {
  return {
    adminStatus,
    status: LEGACY_STATUS_BY_ADMIN_STATUS[adminStatus],
    stage: STAGE_BY_ADMIN_STATUS[adminStatus],
    progress: PROGRESS_BY_ADMIN_STATUS[adminStatus],
  }
}

export function getSourceLabel(source: LeadSourceType) {
  return source === 'agent' ? 'Agent' : 'Connector'
}

export function createDocumentDownloadUrl(leadId: string, name: string) {
  const content = `Mock document for ${leadId}\n${name}\nGenerated for local admin dashboard preview.`
  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`
}

export function buildDocsFromChecklist(lead: Pick<Lead, 'id' | 'checklist'>): LeadDocumentAsset[] {
  return lead.checklist
    .filter((item) => item.uploadedAt)
    .map((item, index) => ({
      id: `${lead.id}-doc-${index + 1}`,
      name: item.name,
      fileType: 'application/pdf',
      size: 180000 + index * 25000,
      uploadedAt: item.uploadedAt,
      downloadUrl: createDocumentDownloadUrl(lead.id, item.name),
    }))
}
