import type { LeadActivity } from '@/types/lead'

export default function ActivityTimeline({
  activity,
}: {
  activity: LeadActivity[]
}) {
  return (
    <div>
      <h3 className="mb-5 font-semibold text-gray-800">Lead Lifecycle</h3>
      <ol className="relative ml-4">
        <div className="absolute bottom-3 left-0 top-3 w-px bg-gray-200" />
        <div className="space-y-7">
          {activity.map((item, index) => (
            <li key={item.id} className="relative pl-8">
              <span className="absolute -left-3 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                {item.status === 'done' ? '✓' : index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.event}</p>
                {item.detail && <p className="mt-0.5 text-xs text-gray-500">{item.detail}</p>}
                {item.date && <p className="mt-0.5 text-xs text-gray-400">{item.date}{item.by ? ` · ${item.by}` : ''}</p>}
              </div>
            </li>
          ))}
        </div>
      </ol>
    </div>
  )
}
