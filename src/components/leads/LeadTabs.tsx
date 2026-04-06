'use client'

import { useState } from 'react'
import { Activity, AlertCircle, ClipboardList, MessageSquare } from 'lucide-react'
import ChecklistTab from '@/components/checklist/ChecklistTab'
import ActivityTimeline from '@/components/activity/ActivityTimeline'
import IssueTracker from '@/components/issues/IssueTracker'
import NotesTab from '@/components/notes/NotesTab'
import { cn } from '@/lib/utils'
import type { Lead } from '@/types/lead'

const tabs = [
  { id: 'checklist', label: 'Checklist', icon: ClipboardList },
  { id: 'issues', label: 'Issues', icon: AlertCircle },
  { id: 'notes', label: 'Notes', icon: MessageSquare },
  { id: 'activity', label: 'Activity', icon: Activity },
] as const

export default function LeadTabs({ lead }: { lead: Lead }) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('checklist')
  const openIssues = lead.issues.filter((issue) => issue.status !== 'resolved').length

  return (
    <div className="overflow-hidden rounded-md border border-black/5 bg-white shadow-sm shadow-black/5">
      <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-hide">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex flex-shrink-0 items-center gap-1.5 px-5 py-3.5 text-sm transition',
              activeTab === id
                ? 'border-b-2 border-brand-500 font-semibold text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === 'issues' && openIssues > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-600">
                {openIssues}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className={cn('p-5', activeTab === 'notes' && 'p-0')}>
        {activeTab === 'checklist' && <ChecklistTab leadId={lead.id} checklist={lead.checklist} />}
        {activeTab === 'issues' && <IssueTracker leadId={lead.id} issues={lead.issues} />}
        {activeTab === 'notes' && <NotesTab leadId={lead.id} notes={lead.notes} />}
        {activeTab === 'activity' && <ActivityTimeline activity={lead.activity} />}
      </div>
    </div>
  )
}
