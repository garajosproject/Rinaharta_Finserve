'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import Badge from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import { ISSUE_TYPES } from '@/data/mockData'
import { useAddIssue } from '@/hooks/useLead'
import type { LeadIssue } from '@/types/lead'

export default function IssueTracker({
  leadId,
  issues,
}: {
  leadId: string
  issues: LeadIssue[]
}) {
  const { mutate, isPending } = useAddIssue(leadId)
  const [formOpen, setFormOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [type, setType] = useState(ISSUE_TYPES[0])
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Issue Tracker</h3>
          <p className="text-xs text-gray-400">{issues.filter((item) => item.status !== 'resolved').length} open · {issues.filter((item) => item.status === 'resolved').length} resolved</p>
        </div>
        <button
          onClick={() => setFormOpen((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> Raise Issue
        </button>
      </div>

      {formOpen && (
        <div className="space-y-3 rounded-md border border-brand-100 bg-brand-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
              {ISSUE_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select value={priority} onChange={(event) => setPriority(event.target.value as 'high' | 'medium' | 'low')} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the issue"
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              disabled={!description.trim() || isPending}
              onClick={() => {
                mutate(
                  {
                    type,
                    priority,
                    assignedTo: 'Agent',
                    description,
                  },
                  {
                    onSuccess: () => {
                      setDescription('')
                      setFormOpen(false)
                    },
                  }
                )
              }}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Raise Issue
            </button>
            <button onClick={() => setFormOpen(false)} className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {issues.length === 0 ? (
        <EmptyState icon="✅" title="No issues" description="This lead is clean — no blockers flagged." />
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div key={issue.id} className="rounded-md border border-black/5 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-800">{issue.type}</p>
                <Badge value={issue.priority} />
                <Badge value={issue.status} />
              </div>
              <p className="mt-2 text-sm text-gray-600">{issue.description}</p>
              <p className="mt-2 text-xs text-gray-400">Assigned to {issue.assignedTo} · Raised by {issue.raisedBy} · {issue.raisedAt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
