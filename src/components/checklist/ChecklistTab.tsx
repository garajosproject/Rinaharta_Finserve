'use client'

import { useRef, useState } from 'react'
import { CheckCircle, Eye, Upload, XCircle } from 'lucide-react'
import Badge from '@/components/common/Badge'
import DocViewerModal from '@/components/leads/DocViewerModal'
import { useUpdateChecklistItem } from '@/hooks/useLead'
import { useAuthStore } from '@/store/auth.store'
import { formatFileSize, getChecklistStats, getLeadValidation } from '@/lib/lead-detail'
import { toast } from '@/components/ui/use-toast'
import type { ChecklistItem, Lead } from '@/types/lead'

// ── File → base64 helper ──────────────────────────────────────────────────────

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string) // data URL: "data:<mime>;base64,<data>"
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// ── Per-item upload button ────────────────────────────────────────────────────

function UploadButton({
  leadId,
  item,
}: {
  leadId: string
  item: ChecklistItem
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const { mutate: updateItem } = useUpdateChecklistItem(leadId)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (inputRef.current) inputRef.current.value = ''

    // Guard: warn on very large files (localStorage ~5MB limit)
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 4 MB per document for local storage.' })
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
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1 rounded-md bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-[#fee2e2] transition disabled:opacity-50"
      >
        <Upload className="h-3 w-3" />
        {busy ? 'Uploading…' : item.status === 'rejected' ? 'Re-upload' : 'Upload'}
      </button>
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ChecklistTab({ lead }: { lead: Lead }) {
  const { mutate, isPending }         = useUpdateChecklistItem(lead.id)
  const role                          = useAuthStore((s) => s.role)
  // Store ID only — always look up live item from current lead prop (prevents stale fileData)
  const [viewingId, setViewingId]     = useState<string | null>(null)
  const viewingItem                   = viewingId
    ? (lead.checklist.find((c) => c.id === viewingId) ?? null)
    : null

  // Filter out soft-deleted docs
  const checklist = lead.checklist.filter((c) => !c.isDeleted)
  const stats     = getChecklistStats(lead)
  const validation = getLeadValidation(lead)

  const canUpload  = role === 'admin' || role === 'agent' || role === 'lead_generator'
  const canVerify  = role === 'admin' || role === 'ops_manager'

  const pending  = checklist.filter((c) => c.status === 'pending' || c.status === 'rejected')
  const uploaded = checklist.filter((c) => c.status === 'uploaded')
  const verified = checklist.filter((c) => c.status === 'verified')

  const update = (docId: string, payload: Partial<ChecklistItem>, message: string) => {
    mutate({ docId, payload }, { onSuccess: () => toast({ title: message }) })
  }

  return (
    <div className="space-y-5">

      {/* Progress */}
      <div className="rounded-md border border-black/5 bg-[#faf7f7] p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-800">Checklist progress</span>
          <span className="text-brand-600">{stats.percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200">
          <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${stats.percent}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="rounded-full bg-white px-3 py-1">Verified: {stats.verified}</span>
          <span className="rounded-full bg-white px-3 py-1">Uploaded: {stats.uploaded}</span>
          <span className="rounded-full bg-white px-3 py-1">Pending: {stats.pending}</span>
          <span className="rounded-full bg-white px-3 py-1">Rejected: {stats.rejected}</span>
        </div>
        {!validation.ready && (
          <p className="mt-3 text-xs text-amber-700">Submission blocked until all documents and CIBIL are verified.</p>
        )}
      </div>

      {/* ── Pending / Rejected — upload CTAs ── */}
      {pending.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-subtle">
            Pending ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                  item.status === 'rejected' ? 'border-red-200 bg-red-50/60' : 'border-outline bg-surface'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-ink">{item.name}</p>
                    <Badge value={item.status} />
                  </div>
                  {item.rejectedReason && (
                    <p className="mt-0.5 text-[10px] text-brand-600">{item.rejectedReason}</p>
                  )}
                </div>
                {canUpload && (
                  <div className="flex-shrink-0">
                    <UploadButton leadId={lead.id} item={item} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Uploaded — awaiting review ── */}
      {uploaded.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-subtle">
            Uploaded — Awaiting Review ({uploaded.length})
          </p>
          <div className="space-y-2">
            {uploaded.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/40 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-ink">{item.name}</p>
                    <Badge value={item.status} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {item.uploadedAt ? `Uploaded ${item.uploadedAt}` : 'Uploaded'}
                    {item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ''}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    className="inline-flex items-center gap-1 rounded-md bg-surface border border-outline px-3 py-2 text-xs font-medium text-ink hover:bg-[#ececec] transition"
                    onClick={() => setViewingId(item.id)}
                  >
                    <Eye className="h-3 w-3" /> View
                  </button>
                  {canVerify && (
                    <>
                      <button
                        className="inline-flex items-center gap-1 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 transition"
                        disabled={isPending}
                        onClick={() => update(item.id, { status: 'verified', uploadedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }, `${item.name} verified`)}
                      >
                        <CheckCircle className="h-3 w-3" /> Verify
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-md bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-[#fee2e2] transition"
                        disabled={isPending}
                        onClick={() => update(item.id, { status: 'rejected', rejectedReason: 'Document rejected during review' }, `${item.name} rejected`)}
                      >
                        <XCircle className="h-3 w-3" /> Reject
                      </button>
                    </>
                  )}
                  {canUpload && (
                    <UploadButton leadId={lead.id} item={item} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Verified ── */}
      {verified.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-subtle">
            Verified ({verified.length})
          </p>
          <div className="space-y-2">
            {verified.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-green-100 bg-green-50/40 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-ink">{item.name}</p>
                    <Badge value={item.status} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {item.uploadedAt ? `Verified ${item.uploadedAt}` : 'Verified'}
                    {item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ''}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    className="inline-flex items-center gap-1 rounded-md bg-surface border border-outline px-3 py-2 text-xs font-medium text-ink hover:bg-[#ececec] transition"
                    onClick={() => setViewingId(item.id)}
                  >
                    <Eye className="h-3 w-3" /> View
                  </button>
                  {canUpload && (
                    <UploadButton leadId={lead.id} item={item} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {checklist.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <p className="text-sm font-semibold text-ink">No documents required</p>
          <p className="mt-0.5 text-xs text-muted">Checklist will appear after lead submission.</p>
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
