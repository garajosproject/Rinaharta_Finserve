'use client'

import { useState } from 'react'
import { Download, Mail, Phone, Share2 } from 'lucide-react'
import Badge from '@/components/common/Badge'
import Modal from '@/components/common/Modal'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { formatAmount } from '@/lib/utils'
import type { Lead } from '@/types/lead'

export default function LeadHeader({ lead }: { lead: Lead }) {
  const [shareOpen, setShareOpen] = useState(false)

  return (
    <>
      <div className="rounded-md border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white">
              {lead.initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-gray-900">{lead.name}</h1>
                <Badge value={lead.status} />
              </div>
              <p className="mt-1 text-sm text-gray-500">{lead.id} - {lead.loanType} · {formatAmount(lead.amount)} · {lead.bank}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 hover:text-brand-600"><Phone className="h-3 w-3" /> {lead.phone}</a>
                <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 hover:text-brand-600"><Mail className="h-3 w-3" /> {lead.email}</a>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShareOpen(true)}>
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
            <Button
              className="bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              onClick={() => toast({ title: 'PDF export is queued for backend integration.' })}
            >
              <Download className="mr-1.5 h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">CIBIL: {lead.cibil}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">Agent: {lead.agent}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">TL: {lead.teamLeader}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">Created: {lead.createdAt}</span>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs text-gray-500">
            <span>Overall Progress</span>
            <span className="font-medium text-brand-600">{lead.progress}% Complete</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-[#f95e61]" style={{ width: `${lead.progress}%` }} />
          </div>
        </div>
      </div>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share Checklist" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Share the pending checklist with {lead.name} through your CRM or WhatsApp workflow.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              setShareOpen(false)
              toast({ title: 'Sharing flow will connect to WhatsApp integration next.' })
            }}
          >
            Continue
          </Button>
        </div>
      </Modal>
    </>
  )
}
