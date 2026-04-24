import { formatAmount } from '@/lib/utils'
import type { Lead } from '@/types/lead'

const STATUS_PRIORITY: Record<string, number> = { verified: 4, uploaded: 3, rejected: 2, pending: 1 }

/** Dedup by id → then by normalized name (keep highest-status version). Filters deleted. */
export function dedupChecklist(items: Lead['checklist']): Lead['checklist'] {
  const byId = new Map<string, Lead['checklist'][number]>()
  for (const item of items) {
    if (item.isDeleted) continue
    byId.set(item.id, item)
  }
  const byName = new Map<string, Lead['checklist'][number]>()
  const result: Lead['checklist'] = []
  for (const item of byId.values()) {
    const key = item.name.toLowerCase().trim()
    const existing = byName.get(key)
    if (!existing) {
      byName.set(key, item)
      result.push(item)
    } else if ((STATUS_PRIORITY[item.status] ?? 0) > (STATUS_PRIORITY[existing.status] ?? 0)) {
      const idx = result.indexOf(existing)
      result[idx] = item
      byName.set(key, item)
    }
  }
  return result
}

export function getChecklistStats(lead: Pick<Lead, 'checklist'>) {
  const items    = dedupChecklist(lead.checklist)
  const verified = items.filter((item) => item.status === 'verified').length
  const pending  = items.filter((item) => item.status === 'pending').length
  const rejected = items.filter((item) => item.status === 'rejected').length
  const uploaded = items.filter((item) => item.status === 'uploaded').length
  const total    = items.length
  const percent  = total === 0 ? 0 : Math.round((verified / total) * 100)

  return { verified, pending, rejected, uploaded, total, percent }
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
