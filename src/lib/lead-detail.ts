import { formatAmount } from '@/lib/utils'
import type { Lead } from '@/types/lead'

export function getChecklistStats(lead: Pick<Lead, 'checklist'>) {
  const verified = lead.checklist.filter((item) => item.status === 'verified').length
  const pending = lead.checklist.filter((item) => item.status === 'pending').length
  const rejected = lead.checklist.filter((item) => item.status === 'rejected').length
  const uploaded = lead.checklist.filter((item) => item.status === 'uploaded').length
  const total = lead.checklist.length
  const percent = total === 0 ? 0 : Math.round((verified / total) * 100)

  return {
    verified,
    pending,
    rejected,
    uploaded,
    total,
    percent,
  }
}

export function getLeadValidation(lead: Pick<Lead, 'checklist' | 'cibilVerified'>) {
  const stats = getChecklistStats(lead)
  const docsVerified = stats.total > 0 && stats.verified === stats.total
  const ready = docsVerified && lead.cibilVerified

  return {
    ready,
    docsVerified,
    cibilVerified: lead.cibilVerified,
    blockedReasons: [
      !docsVerified ? 'Required documents are not fully verified.' : null,
      !lead.cibilVerified ? 'CIBIL is not verified yet.' : null,
    ].filter(Boolean) as string[],
    stats,
  }
}

export function getCibilLabel(score: number | null) {
  if (score === null) return 'Not available'
  if (score >= 750) return 'Strong'
  if (score >= 680) return 'Stable'
  if (score >= 620) return 'Watch'
  return 'Risk'
}

export function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`
  if (size >= 1024) return `${Math.round(size / 1024)} KB`
  return `${size} B`
}

export function buildCibilSummary(lead: Pick<Lead, 'cibilScore' | 'cibilSource' | 'cibilVerified' | 'cibilUpdatedAt'>) {
  const scoreText = lead.cibilScore === null ? 'Pending' : String(lead.cibilScore)
  const sourceText = lead.cibilSource ? lead.cibilSource.toUpperCase() : 'UNSET'
  const verifiedText = lead.cibilVerified ? 'Verified' : 'Unverified'

  return `${scoreText} · ${sourceText} · ${verifiedText}${lead.cibilUpdatedAt ? ` · ${lead.cibilUpdatedAt}` : ''}`
}

export function getDocumentSummary(lead: Pick<Lead, 'docs'>) {
  const total = lead.docs.length
  return total === 0 ? 'No uploaded files' : `${total} file${total > 1 ? 's' : ''} uploaded`
}

export function formatLoanReadiness(lead: Pick<Lead, 'amount' | 'cibilScore' | 'cibilVerified' | 'checklist'>) {
  const validation = getLeadValidation(lead)
  const cibilPart = lead.cibilScore ? `CIBIL ${lead.cibilScore}` : 'CIBIL pending'
  return `${formatAmount(lead.amount)} · ${cibilPart} · ${validation.stats.verified}/${validation.stats.total} docs verified`
}
