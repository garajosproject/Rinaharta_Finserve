'use client'

import { useState } from 'react'
import { Download, FileText, Loader2, X } from 'lucide-react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { cn } from '@/lib/utils'
import Badge from '@/components/common/Badge'
import { formatFileSize } from '@/lib/lead-detail'
import { toast } from '@/components/ui/use-toast'
import type { ChecklistItem, Lead } from '@/types/lead'

// ── Doc grouping ───────────────────────────────────────────────────────────────

const KYC_KEYWORDS      = ['aadhaar', 'aadhar', 'pan', 'passport', 'voter', 'driving', 'licence', 'license', 'kyc', 'id proof', 'identity', 'registration']
const FINANCIAL_KEYWORDS = ['bank statement', 'itr', 'salary slip', 'salary', 'income', 'gst', 'turnover', 'profit', 'revenue', 'financial', 'balance sheet', 'p&l', 'pnl', 'audit', 'member']
const PROPERTY_KEYWORDS  = ['property', 'land', '7/12', '712', 'title deed', 'sale deed', 'noc', 'encumbrance', 'mutation', 'land document']

type DocGroup = { label: string; docs: ChecklistItem[] }

function groupDocs(docs: ChecklistItem[]): DocGroup[] {
  const kyc: ChecklistItem[]       = []
  const financial: ChecklistItem[] = []
  const property: ChecklistItem[]  = []
  const other: ChecklistItem[]     = []

  for (const doc of docs) {
    const key = doc.name.toLowerCase()
    if      (KYC_KEYWORDS.some((k) => key.includes(k)))      kyc.push(doc)
    else if (FINANCIAL_KEYWORDS.some((k) => key.includes(k))) financial.push(doc)
    else if (PROPERTY_KEYWORDS.some((k) => key.includes(k)))  property.push(doc)
    else                                                       other.push(doc)
  }

  const groups: DocGroup[] = []
  if (kyc.length)       groups.push({ label: 'KYC Documents',       docs: kyc })
  if (financial.length) groups.push({ label: 'Financial Documents',  docs: financial })
  if (property.length)  groups.push({ label: 'Property Documents',   docs: property })
  if (other.length)     groups.push({ label: 'Other Documents',      docs: other })
  return groups
}

// ── ZIP download ───────────────────────────────────────────────────────────────

async function downloadAsZip(lead: Lead, items: ChecklistItem[]) {
  const zip = new JSZip()

  // Track names to avoid collisions
  const usedNames = new Map<string, number>()

  for (const doc of items) {
    if (!doc.fileData) continue

    // Extract base64 payload after "data:<mime>;base64,"
    const commaIdx = doc.fileData.indexOf(',')
    if (commaIdx === -1) continue
    const base64 = doc.fileData.slice(commaIdx + 1)

    // Ensure file has extension
    const ext  = doc.fileType ? `.${doc.fileType.split('/')[1] ?? 'bin'}` : ''
    let name   = doc.name.includes('.') ? doc.name : `${doc.name}${ext}`

    // Deduplicate names
    const existing = usedNames.get(name) ?? 0
    if (existing > 0) {
      const [base, ...rest] = name.split('.')
      name = rest.length ? `${base}_${existing}.${rest.join('.')}` : `${name}_${existing}`
    }
    usedNames.set(name, existing + 1)

    zip.file(name, base64, { base64: true })
  }

  const hasFiles = Object.keys(zip.files).length > 0

  if (!hasFiles) {
    // No files have fileData yet — generate manifest as fallback
    const manifest = [
      `FinServe OS — Document Manifest`,
      `Lead: ${lead.name} (${lead.id})`,
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      '',
      ...items.map((d, i) => `${i + 1}. ${d.name} — ${d.status.toUpperCase()}`),
    ].join('\n')
    zip.file('document_manifest.txt', manifest)
    toast({ title: 'No files uploaded yet — downloading manifest instead' })
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  saveAs(blob, `Lead_${lead.id}_Documents.zip`)
}

// ── Doc row ────────────────────────────────────────────────────────────────────

function DocRow({
  doc,
  checked,
  onToggle,
}: {
  doc: ChecklistItem
  checked: boolean
  onToggle: () => void
}) {
  const hasFile = !!doc.fileData

  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition',
        checked
          ? 'border-brand-100 bg-[#FEF2F2]'
          : 'border-outline bg-white hover:bg-surface'
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        <div className={cn(
          'flex h-4 w-4 items-center justify-center rounded border-2 transition',
          checked ? 'border-brand-500 bg-brand-500' : 'border-outline'
        )}>
          {checked && (
            <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-current text-white">
              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn('text-xs font-semibold', checked ? 'text-brand-700' : 'text-ink')}>
            {doc.name}
          </p>
          <Badge value={doc.status} />
          {!hasFile && (
            <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-1.5 py-0.5">
              No file
            </span>
          )}
        </div>
        <p className="text-[10px] text-subtle mt-0.5">
          {doc.uploadedAt ? `Uploaded ${doc.uploadedAt}` : 'Not uploaded'}
          {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ''}
        </p>
      </div>
    </label>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function DocSelectModal({
  lead,
  onClose,
}: {
  lead: Lead
  onClose: () => void
}) {
  const all    = lead.checklist.filter((c) => !c.isDeleted)
  const groups = groupDocs(all)

  const [selected, setSelected]   = useState<string[]>([])
  const [generating, setGenerating] = useState(false)

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleGroup(docs: ChecklistItem[]) {
    const groupIds = docs.map((d) => d.id)
    const allIn    = groupIds.every((id) => selected.includes(id))
    setSelected((prev) =>
      allIn
        ? prev.filter((id) => !groupIds.includes(id))
        : [...new Set([...prev, ...groupIds])]
    )
  }

  function selectAll() { setSelected(all.map((c) => c.id)) }
  function clearAll()  { setSelected([]) }

  async function handleDownload() {
    if (!selected.length) return
    const items = all.filter((c) => selected.includes(c.id))
    setGenerating(true)
    try {
      await downloadAsZip(lead, items)
    } finally {
      setGenerating(false)
      onClose()
    }
  }

  const selectedCount = selected.length
  const totalCount    = all.length
  const withFiles     = all.filter((c) => !!c.fileData).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-black/5 bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FEF2F2]">
              <Download className="h-3.5 w-3.5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Download Documents</p>
              <p className="text-[10px] text-subtle">{lead.name} · {lead.id} · {withFiles}/{totalCount} files uploaded</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-subtle hover:bg-surface transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Doc list */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-subtle">
              Select Documents ({selectedCount}/{totalCount})
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={selectAll} className="text-[10px] font-semibold text-brand-600 hover:underline">All</button>
              <span className="text-subtle text-[10px]">·</span>
              <button type="button" onClick={clearAll}  className="text-[10px] font-semibold text-subtle hover:text-ink">None</button>
            </div>
          </div>

          {all.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface mb-3">
                <FileText className="h-5 w-5 text-subtle" />
              </div>
              <p className="text-sm font-semibold text-ink">No documents available</p>
              <p className="mt-0.5 text-xs text-subtle">Checklist is empty for this lead.</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto pr-1 space-y-4">
              {groups.map((group) => {
                const groupIds = group.docs.map((d) => d.id)
                const allIn    = groupIds.every((id) => selected.includes(id))

                return (
                  <div key={group.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-subtle">{group.label}</p>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.docs)}
                        className={cn(
                          'text-[10px] font-semibold transition',
                          allIn ? 'text-brand-600 hover:text-brand-700' : 'text-subtle hover:text-ink'
                        )}
                      >
                        {allIn ? 'Deselect' : 'Select all'}
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {group.docs.map((doc) => (
                        <DocRow
                          key={doc.id}
                          doc={doc}
                          checked={selected.includes(doc.id)}
                          onToggle={() => toggle(doc.id)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-outline px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="flex-1 rounded-lg border border-outline bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-[#ececec] transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!selectedCount || generating}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-700 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
          >
            {generating
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Download className="h-3.5 w-3.5" />}
            {generating ? 'Zipping…' : `Download${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
          </button>
        </div>

        <p className="px-5 pb-3 text-[10px] text-subtle text-center">
          Downloads a real ZIP file · items without files show &quot;No file&quot; badge
        </p>
      </div>
    </div>
  )
}
