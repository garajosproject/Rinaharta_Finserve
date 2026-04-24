'use client'

import { useRef, useState } from 'react'
import { CheckCircle, Eye, Upload, XCircle } from 'lucide-react'
import Badge from '@/components/common/Badge'
import DocViewerModal from '@/components/leads/DocViewerModal'
import { useUpdateChecklistItem } from '@/hooks/useLead'
import { useAuthStore } from '@/store/auth.store'
import { dedupChecklist, formatFileSize, getLeadValidation } from '@/lib/lead-detail'
import { toast } from '@/components/ui/use-toast'
import type { ChecklistItem, Lead } from '@/types/lead'

// ── File → base64 helper ──────────────────────────────────────────────────────

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// ── Per-item upload button ────────────────────────────────────────────────────

function UploadButton({ leadId, item }: { leadId: string; item: ChecklistItem }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const { mutate: updateItem } = useUpdateChecklistItem(leadId)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (inputRef.current) inputRef.current.value = ''
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 4 MB per document.' })
      return
    }
    setBusy(true)
    try {
      const fileData = await readFileAsBase64(file)
      updateItem(
        {
          docId: item.id,
          payload: {
            status: 'uploaded',
            uploadedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            rejectedReason: null,
            fileSize: file.size,
            fileData,
            fileType: file.type,
          },
        },
        {
          onSuccess: () => { toast({ title: `${item.name} uploaded` }); setBusy(false) },
          onError:   () => { toast({ title: 'Upload failed' });          setBusy(false) },
        }
      )
    } catch {
      toast({ title: 'Failed to read file' })
      setBusy(false)
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1 rounded-md bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-[#fee2e2] transition disabled:opacity-50"
      >
        <Upload className="h-3 w-3" />
        {busy ? 'Uploading…' : item.status === 'rejected' ? 'Re-upload' : 'Upload'}
      </button>
    </>
  )
}

// ── Row background by status ──────────────────────────────────────────────────

function rowCls(status: ChecklistItem['status']): string {
  if (status === 'verified') return 'border-green-100 bg-green-50/40'
  if (status === 'uploaded') return 'border-blue-100 bg-blue-50/30'
  if (status === 'rejected') return 'border-red-200 bg-red-50/50'
  return 'border-outline bg-surface'
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChecklistTab({ lead }: { lead: Lead }) {
  const { mutate, isPending } = useUpdateChecklistItem(lead.id)
  const role                  = useAuthStore((s) => s.role)

  // Always resolve live item from lead prop — prevents stale snapshot
  const [viewingId, setViewingId]   = useState<string | null>(null)
  const viewingItem                  = viewingId
    ? (lead.checklist.find((c) => c.id === viewingId) ?? null)
    : null

  // Dedup: unique by id + normalized name, deleted filtered out
  const checklist     = dedupChecklist(lead.checklist)
  const total         = checklist.length
  const verifiedCount = checklist.filter((c) => c.status === 'verified').length
  const uploadedCount = checklist.filter((c) => c.status === 'uploaded').length
  const pendingCount  = checklist.filter((c) => c.status === 'pending' || c.status === 'rejected').length
  const percent       = total === 0 ? 0 : Math.round((verifiedCount / total) * 100)

  const validation = getLeadValidation(lead)

  const canUpload = role === 'admin' || role === 'agent' || role === 'lead_generator'
  const canVerify = role === 'admin' || role === 'ops_manager'

  function update(docId: string, payload: Partial<ChecklistItem>, message: string) {
    mutate({ docId, payload }, { onSuccess: () => toast({ title: message }) })
  }

  return (
    <div className="space-y-5">

      {/* ── Progress card ── */}
      <div className="rounded-lg border border-outline bg-white p-4 shadow-sm shadow-black/5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-ink">Document Progress</span>
          <span className="text-sm font-bold text-brand-600">{percent}% · {verifiedCount}/{total} verified</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          <span className="flex items-center gap-1.5 text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
            {verifiedCount} Verified
          </span>
          <span className="flex items-center gap-1.5 text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />
            {uploadedCount} Uploaded
          </span>
          <span className="flex items-center gap-1.5 text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
            {pendingCount} Pending / Rejected
          </span>
        </div>

        {!validation.ready && total > 0 && (
          <p className="mt-3 text-xs text-amber-700 border-t border-outline pt-2.5">
            Submission blocked — all docs must be verified.
          </p>
        )}
      </div>

      {/* ── Single flat document list ── */}
      {checklist.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <p className="text-sm font-semibold text-ink">No documents required</p>
          <p className="mt-0.5 text-xs text-muted">Checklist appears after lead submission.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${rowCls(item.status)}`}
            >
              {/* Left */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-ink">{item.name}</p>
                  <Badge value={item.status} />
                </div>

                {item.status === 'rejected' && item.rejectedReason && (
                  <p className="mt-0.5 text-[10px] text-brand-600">{item.rejectedReason}</p>
                )}

                {(item.status === 'uploaded' || item.status === 'verified') && item.uploadedAt && (
                  <p className="mt-0.5 text-[10px] text-muted">
                    {item.status === 'verified' ? 'Verified' : 'Uploaded'} {item.uploadedAt}
                    {item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ''}
                  </p>
                )}
              </div>

              {/* Right: actions */}
              <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
                {/* View — only when file exists */}
                {(item.status === 'uploaded' || item.status === 'verified') && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-outline bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface transition"
                    onClick={() => setViewingId(item.id)}
                  >
                    <Eye className="h-3 w-3" /> View
                  </button>
                )}

                {/* Verify / Reject — admin/ops on uploaded docs only */}
                {canVerify && item.status === 'uploaded' && (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition disabled:opacity-40"
                      onClick={() => update(
                        item.id,
                        { status: 'verified', uploadedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
                        `${item.name} verified`
                      )}
                    >
                      <CheckCircle className="h-3 w-3" /> Verify
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      className="inline-flex items-center gap-1 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-[#fee2e2] transition disabled:opacity-40"
                      onClick={() => update(
                        item.id,
                        { status: 'rejected', rejectedReason: 'Document rejected during review' },
                        `${item.name} rejected`
                      )}
                    >
                      <XCircle className="h-3 w-3" /> Reject
                    </button>
                  </>
                )}

                {/* Upload / Re-upload */}
                {canUpload && (
                  <UploadButton leadId={lead.id} item={item} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document viewer modal */}
      {viewingItem && role && (
        <DocViewerModal
          item={viewingItem}
          leadId={lead.id}
          role={role}
          onClose={() => setViewingId(null)}
          onDeleted={() => setViewingId(null)}
        />
      )}

    </div>
  )
}
