'use client'

import { useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import Modal from '@/components/common/Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFetchCibil, useUpdateLeadCibil, useVerifyLeadCibil } from '@/hooks/useLead'
import { buildCibilSummary, formatFileSize, getCibilLabel } from '@/lib/lead-detail'
import { toast } from '@/components/ui/use-toast'
import type { Lead } from '@/types/lead'

export default function CibilPanel({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false)
  const [fetchForm, setFetchForm] = useState({
    pan: '',
    name: lead.name,
    dob: '',
    mobile: lead.phone.replace(/\D/g, '').slice(-10),
  })
  const [manualScore, setManualScore] = useState(lead.cibilScore?.toString() ?? '')
  const fetchCibil = useFetchCibil(lead.id)
  const updateCibil = useUpdateLeadCibil(lead.id)
  const verifyCibil = useVerifyLeadCibil(lead.id)

  const handleManualSave = () => {
    const score = Number(manualScore)

    if (!Number.isFinite(score) || score < 300 || score > 900) {
      toast({ title: 'Manual CIBIL must be between 300 and 900', variant: 'destructive' })
      return
    }

    updateCibil.mutate({ cibilScore: score, cibilSource: 'manual', cibilVerified: false })
  }

  return (
    <>
      <div className="rounded-md border border-black/5 bg-[#faf7f7] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">CIBIL Verification</p>
            <h3 className="mt-1 text-sm font-semibold text-gray-900">
              {lead.cibilScore ?? 'Pending'} · {getCibilLabel(lead.cibilScore)}
            </h3>
            <p className="mt-1 text-xs text-gray-500">{buildCibilSummary(lead)}</p>
            {lead.cibilDocument && (
              <p className="mt-2 text-xs text-gray-500">
                Report: {lead.cibilDocument.name} · {formatFileSize(lead.cibilDocument.size)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setOpen(true)}>
              Manage CIBIL
            </Button>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                lead.cibilVerified ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              {lead.cibilVerified ? 'Verified' : 'Verification required'}
            </span>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Manage CIBIL" size="xl">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-md border border-black/5 bg-[#faf7f7] p-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Fetch via API</p>
              <p className="mt-1 text-xs text-gray-500">Collect PAN, Name, DOB, and Mobile to auto-fetch and verify the score.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="PAN" value={fetchForm.pan} onChange={(event) => setFetchForm((current) => ({ ...current, pan: event.target.value.toUpperCase() }))} />
              <Input placeholder="Full Name" value={fetchForm.name} onChange={(event) => setFetchForm((current) => ({ ...current, name: event.target.value }))} />
              <Input type="date" value={fetchForm.dob} onChange={(event) => setFetchForm((current) => ({ ...current, dob: event.target.value }))} />
              <Input placeholder="Mobile" value={fetchForm.mobile} onChange={(event) => setFetchForm((current) => ({ ...current, mobile: event.target.value.replace(/\D/g, '').slice(0, 10) }))} />
            </div>
            <Button
              className="w-full"
              disabled={!fetchForm.pan || !fetchForm.name || !fetchForm.dob || fetchForm.mobile.length !== 10 || fetchCibil.isPending}
              onClick={() => fetchCibil.mutate(fetchForm)}
            >
              {fetchCibil.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Fetch CIBIL
            </Button>
          </div>

          <div className="space-y-4 rounded-md border border-black/5 bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Manual entry</p>
              <p className="mt-1 text-xs text-gray-500">Manual scores stay unverified until a CIBIL report is uploaded and approved.</p>
            </div>
            <Input
              type="number"
              min={300}
              max={900}
              placeholder="Enter score between 300 and 900"
              value={manualScore}
              onChange={(event) => setManualScore(event.target.value)}
            />
            <Button className="w-full" disabled={updateCibil.isPending} onClick={handleManualSave}>
              Save Manual Score
            </Button>

            <div className="rounded-md border border-dashed border-brand-200 bg-brand-50/40 p-4">
              <p className="text-sm font-semibold text-gray-900">Verify with report</p>
              <p className="mt-1 text-xs text-gray-500">Upload the CIBIL report and mark the lead as verified.</p>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="mt-3 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-600"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  verifyCibil.mutate(file)
                }}
              />
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
