import type { Lead } from '@/types/lead'

const WORKFLOW_STAGES = ['Inquiry', 'KYC', 'Login', 'Verification', 'Sanction', 'Disbursement'] as const

function getCurrentStageIndex(lead: Lead) {
  if (lead.status === 'Rejected') return 3
  if (lead.status === 'Approved') return 4
  if (lead.progress >= 90) return 5
  if (lead.progress >= 75) return 4
  if (lead.progress >= 55) return 3
  if (lead.progress >= 35) return 2
  if (lead.progress >= 15) return 1
  return 0
}

export default function LeadWorkflowTimeline({ lead }: { lead: Lead }) {
  const currentStageIndex = getCurrentStageIndex(lead)

  return (
    <div className="rounded-md border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">Workflow</p>
        <h2 className="mt-1 text-base font-extrabold text-gray-900">Status timeline</h2>
        <p className="mt-1 text-xs text-muted">Each lead moves through the LMS workflow stage by stage.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {WORKFLOW_STAGES.map((stage, index) => {
          const isDone = index < currentStageIndex
          const isCurrent = index === currentStageIndex

          return (
            <div
              key={stage}
              className={`rounded-md border px-4 py-3 ${isCurrent ? 'border-brand-200 bg-brand-50' : isDone ? 'border-green-100 bg-green-50' : 'border-black/5 bg-[#faf7f7]'}`}
            >
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isCurrent ? 'bg-brand-500 text-white' : isDone ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {isDone ? '✓' : index + 1}
                </span>
                <p className="text-sm font-semibold text-gray-800">{stage}</p>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {isCurrent ? 'Current stage' : isDone ? 'Completed' : 'Pending'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
