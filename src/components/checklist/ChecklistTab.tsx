'use client'

import { CheckCircle, Eye, RefreshCw, XCircle } from 'lucide-react'
import Badge from '@/components/common/Badge'
import DocumentUpload from '@/components/leads/DocumentUpload'
import { useUpdateChecklistItem } from '@/hooks/useLead'
import { toast } from '@/components/ui/use-toast'
import type { ChecklistItem } from '@/types/lead'

export default function ChecklistTab({
  leadId,
  checklist,
}: {
  leadId: string
  checklist: ChecklistItem[]
}) {
  const { mutate, isPending } = useUpdateChecklistItem(leadId)
  const completed = checklist.filter((item) => item.status === 'verified').length
  const percent = checklist.length ? (completed / checklist.length) * 100 : 0

  const update = (docId: string, payload: Partial<ChecklistItem>, message: string) => {
    mutate(
      { docId, payload },
      {
        onSuccess: () => toast({ title: message }),
      }
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-black/5 bg-[#faf7f7] p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-800">Checklist progress</span>
          <span className="text-brand-600">{Math.round(percent)}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200">
          <div className="h-2 rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <DocumentUpload leadId={leadId} />

      <div className="space-y-3">
        {checklist.map((item) => (
          <div key={item.id} className="rounded-md border border-black/5 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <Badge value={item.status} />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {item.rejectedReason
                    ? item.rejectedReason
                    : item.uploadedAt
                      ? `Updated ${item.uploadedAt}`
                      : 'Waiting for upload'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.status === 'uploaded' && (
                  <>
                    <button
                      className="inline-flex items-center gap-1 rounded-md bg-green-100 px-3 py-2 text-xs font-medium text-green-700"
                      disabled={isPending}
                      onClick={() =>
                        update(item.id, { status: 'verified', uploadedAt: 'Just now' }, `${item.name} marked as verified`)
                      }
                    >
                      <CheckCircle className="h-3 w-3" /> Verify
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-md bg-red-100 px-3 py-2 text-xs font-medium text-red-600"
                      disabled={isPending}
                      onClick={() =>
                        update(item.id, { status: 'rejected', rejectedReason: 'Document rejected during review' }, `${item.name} rejected`)
                      }
                    >
                      <XCircle className="h-3 w-3" /> Reject
                    </button>
                  </>
                )}
                {item.status === 'rejected' && (
                  <button
                    className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-3 py-2 text-xs font-medium text-orange-600"
                    disabled={isPending}
                    onClick={() =>
                      update(item.id, { status: 'pending', rejectedReason: null, uploadedAt: null }, `Re-upload requested for ${item.name}`)
                    }
                  >
                    <RefreshCw className="h-3 w-3" /> Re-upload
                  </button>
                )}
                {item.status === 'verified' && (
                  <button className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600">
                    <Eye className="h-3 w-3" /> View
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
