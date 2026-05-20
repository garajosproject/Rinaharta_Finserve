'use client'

import { useState } from 'react'
import { Copy, Download, FileText, Loader2, MessageCircle, Share2, X } from 'lucide-react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { cn, formatAmount } from '@/lib/utils'
import Badge from '@/components/common/Badge'
import { dedupChecklist, formatFileSize } from '@/lib/lead-detail'
import { printLeadReport, type ReportField } from '@/lib/report-utils'
import { toast } from '@/components/ui/use-toast'
import type { Lead } from '@/types/lead'

// ── Section config ─────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'basic_info',       label: 'Basic Info',       desc: 'Name, phone, loan type, amount' },
  { id: 'lead_status',      label: 'Lead Status',      desc: 'Status, stage, CIBIL' },
  { id: 'checklist',        label: 'Checklist',        desc: 'Documents with status' },
  { id: 'workflow_summary', label: 'Workflow Steps',   desc: 'All 6 steps with status' },
  { id: 'activity_summary', label: 'Activity Log',     desc: 'Recent activity timeline' },
  { id: 'notes',            label: 'Notes',            desc: 'Latest 5 agent notes' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

// ── Doc grouping ───────────────────────────────────────────────────────────────

const KYC_KW      = ['aadhaar', 'aadhar', 'pan', 'passport', 'voter', 'driving', 'licence', 'license', 'kyc', 'id proof', 'identity', 'registration']
const FINANCIAL_KW = ['bank statement', 'itr', 'salary slip', 'salary', 'income', 'gst', 'turnover', 'profit', 'revenue', 'financial', 'balance sheet', 'audit', 'member']
const PROPERTY_KW  = ['property', 'land', '7/12', '712', 'title deed', 'sale deed', 'noc', 'encumbrance', 'mutation']

function groupDocs(docs: Lead['checklist']) {
  const kyc: Lead['checklist'] = [], financial: Lead['checklist'] = [], property: Lead['checklist'] = [], other: Lead['checklist'] = []
  for (const doc of docs) {
    const k = doc.name.toLowerCase()
    if      (KYC_KW.some(kw => k.includes(kw)))      kyc.push(doc)
    else if (FINANCIAL_KW.some(kw => k.includes(kw))) financial.push(doc)
    else if (PROPERTY_KW.some(kw => k.includes(kw)))  property.push(doc)
    else                                               other.push(doc)
  }
  return [
    ...(kyc.length       ? [{ label: 'KYC',       docs: kyc }]       : []),
    ...(financial.length ? [{ label: 'Financial', docs: financial }]  : []),
    ...(property.length  ? [{ label: 'Property',  docs: property }]   : []),
    ...(other.length     ? [{ label: 'Other',     docs: other }]      : []),
  ]
}

// ── ZIP download ───────────────────────────────────────────────────────────────

async function downloadAsZip(lead: Lead, items: Lead['checklist']) {
  const zip = new JSZip()
  const usedNames = new Map<string, number>()
  for (const doc of items) {
    if (!doc.fileData) continue
    const commaIdx = doc.fileData.indexOf(',')
    if (commaIdx === -1) continue
    const base64 = doc.fileData.slice(commaIdx + 1)
    const ext = doc.fileType ? `.${doc.fileType.split('/')[1] ?? 'bin'}` : ''
    let name = doc.name.includes('.') ? doc.name : `${doc.name}${ext}`
    const existing = usedNames.get(name) ?? 0
    if (existing > 0) {
      const parts = name.split('.')
      name = parts.length > 1
        ? `${parts.slice(0, -1).join('.')}_${existing}.${parts[parts.length - 1]}`
        : `${name}_${existing}`
    }
    usedNames.set(name, existing + 1)
    zip.file(name, base64, { base64: true })
  }
  if (Object.keys(zip.files).length === 0) {
    toast({ title: 'No uploaded files selected' })
    return
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  saveAs(blob, `Lead_${lead.id}_Documents.zip`)
  toast({ title: 'Documents downloaded' })
}

// ── Plain-text summary ─────────────────────────────────────────────────────────

function buildTextSummary(lead: Lead, sections: SectionId[]): string {
  const lines: string[] = [
    'FinServe OS — Lead Summary',
    `Lead: ${lead.name} (${lead.id})${lead.leadCode ? ' · ' + lead.leadCode : ''}`,
    `Generated: ${new Date().toLocaleString('en-IN')}`,
    '',
  ]
  if (sections.includes('basic_info')) {
    lines.push('BASIC INFO', `Loan Type: ${lead.loanType}`, `Amount: ${formatAmount(lead.amount)}`, `Phone: ${lead.phone}`, `District: ${lead.district ?? '—'}`, '')
  }
  if (sections.includes('lead_status')) {
    lines.push('STATUS', `Lead Status: ${lead.status}`, `Current Step: ${lead.currentStep}`, ...(lead.cibilScore ? [`CIBIL: ${lead.cibilScore}`] : []), `Assigned: ${lead.assignedUser ?? 'Unassigned'}`, '')
  }
  if (sections.includes('checklist')) {
    lines.push('DOCUMENTS')
    for (const item of dedupChecklist(lead.checklist)) {
      lines.push(`  • ${item.name} — ${item.status.toUpperCase()}`)
    }
    lines.push('')
  }
  if (sections.includes('activity_summary')) {
    lines.push('RECENT ACTIVITY')
    for (const a of lead.activity.slice(-5)) lines.push(`  ${a.date} · ${a.event} — ${a.detail}`)
    lines.push('')
  }
  return lines.join('\n')
}

// ── Checkbox toggle item ───────────────────────────────────────────────────────

function CheckItem({
  checked, onClick, label, desc,
}: {
  checked: boolean; onClick: () => void; label: string; desc?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition',
        checked ? 'border-brand-100 bg-[#FEF2F2]' : 'border-outline bg-white hover:bg-surface',
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        <div className={cn('flex h-4 w-4 items-center justify-center rounded border-2 transition', checked ? 'border-brand-500 bg-brand-500' : 'border-outline')}>
          {checked && (
            <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-current text-white">
              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <p className={cn('text-xs font-semibold', checked ? 'text-brand-700' : 'text-ink')}>{label}</p>
        {desc && <p className="mt-0.5 text-[10px] text-subtle">{desc}</p>}
      </div>
    </button>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function ShareLeadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const allDocs   = dedupChecklist(lead.checklist)
  const docGroups = groupDocs(allDocs)

  const [selectedSections, setSelectedSections] = useState<SectionId[]>(SECTIONS.map(s => s.id))
  const [selectedDocIds, setSelectedDocIds]     = useState<string[]>(allDocs.filter(d => !!d.fileData).map(d => d.id))
  const [generating, setGenerating]             = useState(false)

  function toggleSection(id: SectionId) {
    setSelectedSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }
  function toggleDoc(id: string) {
    setSelectedDocIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
  }
  function toggleDocGroup(docs: Lead['checklist']) {
    const ids = docs.map(d => d.id)
    const allIn = ids.every(id => selectedDocIds.includes(id))
    setSelectedDocIds(prev => allIn ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])])
  }

  // ── Output actions ─────────────────────────────────────────────────────────

  async function handleGeneratePDF() {
    const fieldMap: Partial<Record<SectionId, ReportField[]>> = {
      basic_info:       ['customer_info', 'loan_details'],
      lead_status:      ['lead_status', 'cibil', 'assigned_agent'],
      checklist:        ['documents_summary'],
      workflow_summary: ['workflow_summary'],
      notes:            ['notes'],
    }
    const fields = [...new Set(selectedSections.flatMap(s => fieldMap[s] ?? []))] as ReportField[]
    if (!fields.length) { toast({ title: 'Select at least one section' }); return }
    setGenerating(true)
    setTimeout(() => { printLeadReport(lead, fields); setGenerating(false) }, 100)
  }

  async function handleDownloadDocs() {
    if (!selectedDocIds.length) { toast({ title: 'Select at least one document' }); return }
    const items = allDocs.filter(d => selectedDocIds.includes(d.id))
    setGenerating(true)
    try { await downloadAsZip(lead, items) } finally { setGenerating(false) }
  }

  function handleWhatsApp() {
    const text = buildTextSummary(lead, selectedSections)
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  function handleCopy() {
    const text = buildTextSummary(lead, selectedSections)
    navigator.clipboard.writeText(text).then(() => toast({ title: 'Summary copied to clipboard' }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center px-0 sm:px-4">
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-xl border border-black/5 bg-white shadow-xl sm:max-w-lg sm:rounded-xl">

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-outline px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#FEF2F2]">
              <Share2 className="h-4 w-4 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Share Lead</p>
              <p className="text-[10px] text-subtle">{lead.name} · {lead.id}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-subtle hover:bg-surface transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">

          {/* ── 1. Sections ── */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-subtle">
                1 · Include Sections <span className="font-normal text-muted">({selectedSections.length}/{SECTIONS.length})</span>
              </p>
              <div className="flex gap-2 text-[10px]">
                <button type="button" onClick={() => setSelectedSections(SECTIONS.map(s => s.id))} className="font-semibold text-brand-600 hover:underline">All</button>
                <span className="text-subtle">·</span>
                <button type="button" onClick={() => setSelectedSections([])} className="font-semibold text-subtle hover:text-ink">None</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {SECTIONS.map(s => (
                <CheckItem key={s.id} checked={selectedSections.includes(s.id)} onClick={() => toggleSection(s.id)} label={s.label} desc={s.desc} />
              ))}
            </div>
          </div>

          {/* ── 2. Documents ── */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-subtle">
                2 · Select Documents <span className="font-normal text-muted">({selectedDocIds.length}/{allDocs.length})</span>
              </p>
              <div className="flex gap-2 text-[10px]">
                <button type="button" onClick={() => setSelectedDocIds(allDocs.map(d => d.id))} className="font-semibold text-brand-600 hover:underline">All</button>
                <span className="text-subtle">·</span>
                <button type="button" onClick={() => setSelectedDocIds([])} className="font-semibold text-subtle hover:text-ink">None</button>
              </div>
            </div>

            {allDocs.length === 0 ? (
              <p className="py-2 text-xs italic text-subtle">No documents in checklist yet.</p>
            ) : (
              <div className="space-y-3">
                {docGroups.map(group => {
                  const allIn = group.docs.every(d => selectedDocIds.includes(d.id))
                  return (
                    <div key={group.label}>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-subtle">{group.label}</p>
                        <button type="button" onClick={() => toggleDocGroup(group.docs)}
                          className={cn('text-[10px] font-semibold transition', allIn ? 'text-brand-600' : 'text-subtle hover:text-ink')}
                        >
                          {allIn ? 'Deselect' : 'Select all'}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {group.docs.map(doc => {
                          const sel = selectedDocIds.includes(doc.id)
                          return (
                            <button key={doc.id} type="button" onClick={() => toggleDoc(doc.id)}
                              className={cn('flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition',
                                sel ? 'border-brand-100 bg-[#FEF2F2]' : 'border-outline bg-white hover:bg-surface',
                              )}
                            >
                              <div className={cn('flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition', sel ? 'border-brand-500 bg-brand-500' : 'border-outline')}>
                                {sel && (
                                  <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-current text-white">
                                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={cn('text-xs font-semibold', sel ? 'text-brand-700' : 'text-ink')}>{doc.name}</span>
                                  <Badge value={doc.status} />
                                  {!doc.fileData && (
                                    <span className="rounded-full border border-amber-100 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">No file</span>
                                  )}
                                </div>
                                {doc.fileSize && <p className="text-[10px] text-subtle">{formatFileSize(doc.fileSize)}</p>}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── 3. Output options ── */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-subtle">3 · Share Options</p>

            <div className="grid grid-cols-3 gap-2">
              {/* Generate PDF */}
              <button type="button" onClick={handleGeneratePDF} disabled={generating || !selectedSections.length}
                className="flex flex-col items-center gap-2 rounded-lg border border-outline bg-white px-2 py-4 text-center transition hover:border-brand-200 hover:bg-[#FEF2F2] disabled:opacity-40"
              >
                {generating ? <Loader2 className="h-5 w-5 animate-spin text-brand-500" /> : <FileText className="h-5 w-5 text-brand-600" />}
                <div>
                  <p className="text-xs font-bold text-ink">Generate PDF</p>
                  <p className="mt-0.5 text-[10px] text-subtle">Print / save PDF</p>
                </div>
              </button>

              {/* WhatsApp */}
              <button type="button" onClick={handleWhatsApp} disabled={!selectedSections.length}
                className="flex flex-col items-center gap-2 rounded-lg border border-outline bg-white px-2 py-4 text-center transition hover:border-green-200 hover:bg-green-50 disabled:opacity-40"
              >
                <MessageCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs font-bold text-ink">WhatsApp</p>
                  <p className="mt-0.5 text-[10px] text-subtle">Share via chat</p>
                </div>
              </button>

              {/* Copy Summary */}
              <button type="button" onClick={handleCopy} disabled={!selectedSections.length}
                className="flex flex-col items-center gap-2 rounded-lg border border-outline bg-white px-2 py-4 text-center transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40"
              >
                <Copy className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs font-bold text-ink">Copy Text</p>
                  <p className="mt-0.5 text-[10px] text-subtle">Clipboard</p>
                </div>
              </button>
            </div>

            {/* Download documents ZIP */}
            {allDocs.length > 0 && (
              <button type="button" onClick={handleDownloadDocs} disabled={!selectedDocIds.length || generating}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-semibold text-ink transition hover:bg-surface disabled:opacity-40"
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {generating ? 'Preparing…' : `Download Documents${selectedDocIds.length > 0 ? ` (${selectedDocIds.length})` : ''}`}
              </button>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-outline px-5 py-3">
          <button type="button" onClick={onClose}
            className="w-full rounded-lg border border-outline bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:bg-[#ececec]"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
