'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileText, Loader2, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Badge from '@/components/common/Badge'
import { useUpdateChecklistItem } from '@/hooks/useLead'
import { toast } from '@/components/ui/use-toast'
import { formatFileSize } from '@/lib/lead-detail'
import { getAuthUser } from '@/store/auth.store'
import type { ChecklistItem, UserRole } from '@/types/lead'

// ── data URL → blob URL (needed for iframe — browsers block data: iframes) ────

function dataUrlToBlobUrl(dataUrl: string): string {
  try {
    const [header, base64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream'
    const binary = atob(base64)
    const bytes  = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return URL.createObjectURL(new Blob([bytes], { type: mime }))
  } catch {
    return dataUrl // fallback
  }
}

// ── Download ───────────────────────────────────────────────────────────────────

function downloadFile(item: ChecklistItem) {
  if (!item.fileData) return
  const ext  = item.fileType ? `.${item.fileType.split('/')[1] ?? 'bin'}` : ''
  const name = item.name.includes('.') ? item.name : `${item.name}${ext}`
  const a    = document.createElement('a')
  a.href     = item.fileData
  a.download = name
  a.click()
}

// ── Preview area ───────────────────────────────────────────────────────────────

function PreviewArea({ item }: { item: ChecklistItem }) {
  const blobUrlRef = useRef<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  const hasFile = !!item.fileData
  const isPdf   = item.fileType === 'application/pdf'
              || (!item.fileType && item.name.toLowerCase().endsWith('.pdf'))
  const isImage = item.fileType?.startsWith('image/')
              ?? /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(item.name)

  // Convert PDF data URL → blob URL (safe for iframe)
  useEffect(() => {
    if (hasFile && isPdf && item.fileData) {
      const url = dataUrlToBlobUrl(item.fileData)
      blobUrlRef.current = url
      setBlobUrl(url)
      return () => {
        URL.revokeObjectURL(url)
        blobUrlRef.current = null
      }
    }
  }, [item.fileData, hasFile, isPdf])

  if (!hasFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface border border-outline">
          <FileText className="h-6 w-6 text-subtle" />
        </div>
        <p className="text-sm font-semibold text-ink">No file uploaded</p>
        <p className="text-xs text-subtle">Upload the document to preview it here.</p>
      </div>
    )
  }

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.fileData!}
        alt={item.name}
        className="max-h-full max-w-full object-contain p-3"
      />
    )
  }

  if (isPdf) {
    if (!blobUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
          <Loader2 className="h-6 w-6 animate-spin text-subtle" />
          <p className="text-xs text-subtle">Loading PDF…</p>
        </div>
      )
    }
    return (
      <iframe
        src={blobUrl}
        title={item.name}
        className="w-full h-full border-0 min-h-[420px]"
      />
    )
  }

  // Unsupported type but file exists
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF2F2] border border-[#FECACA]">
        <FileText className="h-6 w-6 text-brand-600" />
      </div>
      <p className="text-sm font-semibold text-ink">{item.name}</p>
      <p className="text-xs text-subtle">Preview not available for this file type.</p>
      <p className="text-[10px] text-subtle">Use Download to save the file.</p>
      {item.fileSize && <p className="text-[10px] text-subtle">{formatFileSize(item.fileSize)}</p>}
    </div>
  )
}

// ── Delete confirmation ────────────────────────────────────────────────────────

function DeleteConfirm({
  onConfirm,
  onCancel,
  busy,
}: {
  onConfirm: () => void
  onCancel: () => void
  busy: boolean
}) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-4 mt-3">
      <p className="text-sm font-semibold text-brand-700">Delete this document?</p>
      <p className="text-xs text-muted mt-0.5">Removed from checklist. Action logged for audit.</p>
      <div className="flex gap-2 mt-3">
        <button
          type="button" onClick={onCancel} disabled={busy}
          className="flex-1 rounded-md border border-outline bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-surface transition disabled:opacity-50"
        >Cancel</button>
        <button
          type="button" onClick={onConfirm} disabled={busy}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs font-bold text-brand-700 hover:bg-[#fee2e2] transition disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          {busy ? 'Deleting…' : 'Yes, delete'}
        </button>
      </div>
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function DocViewerModal({
  item,
  leadId,
  role,
  onClose,
  onDeleted,
}: {
  item: ChecklistItem
  leadId: string
  role: UserRole
  onClose: () => void
  onDeleted?: () => void
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { mutate: updateItem, isPending } = useUpdateChecklistItem(leadId)
  const user = getAuthUser()

  const hasFile     = !!item.fileData
  const canDownload = (role === 'admin' || role === 'agent' || role === 'lead_generator') && hasFile
  const canDelete   = role === 'admin'

  function handleDelete() {
    updateItem(
      {
        docId: item.id,
        payload: {
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: user?.name ?? 'Admin',
        },
      },
      {
        onSuccess: () => {
          toast({ title: `${item.name} deleted` })
          onDeleted?.()
          onClose()
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-2xl rounded-lg border border-black/5 bg-white shadow-xl flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#FEF2F2]">
              <FileText className="h-3.5 w-3.5 text-brand-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink truncate">{item.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge value={item.status} />
                {item.uploadedAt && <span className="text-[10px] text-subtle">· {item.uploadedAt}</span>}
                {item.fileSize   && <span className="text-[10px] text-subtle">· {formatFileSize(item.fileSize)}</span>}
                {!hasFile        && <span className="text-[10px] text-amber-600 font-semibold">· No file yet</span>}
              </div>
            </div>
          </div>
          <button
            type="button" onClick={onClose}
            className="flex-shrink-0 rounded-md p-1.5 text-subtle hover:bg-surface transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview */}
        <div className={cn(
          'flex-1 overflow-hidden bg-[#f8f8f8] border-b border-outline',
          'flex items-center justify-center',
          'min-h-[280px]'
        )}>
          <PreviewArea item={item} />
        </div>

        {/* Actions */}
        <div className="px-5 py-4 flex-shrink-0">
          {showDeleteConfirm ? (
            <DeleteConfirm
              onConfirm={handleDelete}
              onCancel={() => setShowDeleteConfirm(false)}
              busy={isPending}
            />
          ) : (
            <div className="flex gap-2 flex-wrap">
              {canDownload && (
                <button
                  type="button" onClick={() => downloadFile(item)}
                  className="flex items-center gap-1.5 rounded-md bg-brand-500 hover:bg-brand-700 px-4 py-2 text-xs font-bold text-white transition"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={!hasFile}
                  className="flex items-center gap-1.5 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-xs font-bold text-brand-700 hover:bg-[#fee2e2] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              )}
              <button
                type="button" onClick={onClose}
                className="ml-auto flex items-center gap-1.5 rounded-md border border-outline bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-[#ececec] transition"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
