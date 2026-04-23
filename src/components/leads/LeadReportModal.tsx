'use client'

import { useState } from 'react'
import { FileText, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { printLeadReport, REPORT_FIELDS, type ReportField } from '@/lib/report-utils'
import type { Lead } from '@/types/lead'

const ALL_FIELD_IDS = REPORT_FIELDS.map((f) => f.id)

export default function LeadReportModal({
  lead,
  onClose,
}: {
  lead: Lead
  onClose: () => void
}) {
  const [selected, setSelected] = useState<ReportField[]>(ALL_FIELD_IDS)
  const [generating, setGenerating] = useState(false)

  function toggle(id: ReportField) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  function selectAll() { setSelected(ALL_FIELD_IDS) }
  function clearAll()  { setSelected([]) }

  function handleGenerate() {
    if (!selected.length) return
    setGenerating(true)
    // slight delay so spinner shows before new window blocks
    setTimeout(() => {
      printLeadReport(lead, selected)
      setGenerating(false)
    }, 100)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-black/5 bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FEF2F2]">
              <FileText className="h-3.5 w-3.5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Generate Lead Report</p>
              <p className="text-[10px] text-subtle">{lead.name} · {lead.id}</p>
            </div>
          </div>
          <button
            type="button" onClick={onClose}
            className="rounded-md p-1.5 text-subtle hover:bg-surface transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Field selection */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-subtle">
              Select Sections ({selected.length}/{REPORT_FIELDS.length})
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={selectAll} className="text-[10px] font-semibold text-brand-600 hover:underline">All</button>
              <span className="text-subtle text-[10px]">·</span>
              <button type="button" onClick={clearAll} className="text-[10px] font-semibold text-subtle hover:text-ink">None</button>
            </div>
          </div>

          <div className="space-y-1.5">
            {REPORT_FIELDS.map(({ id, label, description }) => {
              const checked = selected.includes(id)
              return (
                <label
                  key={id}
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
                        <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 text-white fill-current">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(id)} />
                  <div className="min-w-0">
                    <p className={cn('text-xs font-semibold', checked ? 'text-brand-700' : 'text-ink')}>{label}</p>
                    <p className="text-[10px] text-subtle mt-0.5">{description}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-outline px-5 py-4">
          <button
            type="button" onClick={onClose}
            className="flex-1 rounded-lg border border-outline bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-[#ececec] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!selected.length || generating}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-700 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
          >
            {generating
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <FileText className="h-3.5 w-3.5" />}
            {generating ? 'Opening…' : 'Generate PDF'}
          </button>
        </div>

        <p className="px-5 pb-3 text-[10px] text-subtle text-center">
          Opens print dialog — choose "Save as PDF" to download
        </p>
      </div>
    </div>
  )
}
