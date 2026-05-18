'use client'

import { useState } from 'react'
import { Activity, ClipboardList, FolderOpen } from 'lucide-react'
import ChecklistTab from '@/components/checklist/ChecklistTab'
import ActivityTimeline from '@/components/activity/ActivityTimeline'
import DocumentUpload from '@/components/leads/DocumentUpload'
import { cn } from '@/lib/utils'
import type { Lead } from '@/types/lead'

const tabs = [
  { id: 'checklist', label: 'Checklist', icon: ClipboardList },
  { id: 'documents', label: 'Documents', icon: FolderOpen    },
  { id: 'activity',  label: 'Activity',  icon: Activity      },
] as const

export default function LeadTabs({ lead }: { lead: Lead }) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('checklist')

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
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeTab === 'checklist' && <ChecklistTab lead={lead} />}
        {activeTab === 'documents' && <DocumentUpload leadId={lead.id} />}
        {activeTab === 'activity'  && <ActivityTimeline activity={lead.activity} />}
      </div>
    </div>
  )
}
