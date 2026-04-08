import { cn } from '@/lib/utils'

const variants = {
  New: 'bg-surface text-muted',
  'In Progress': 'bg-blue-50 text-blue-700',
  Submitted: 'bg-fuchsia-50 text-fuchsia-700',
  Approved: 'bg-green-50 text-green-800',
  Rejected: 'bg-brand-50 text-brand-700',
  verified: 'bg-green-50 text-green-800',
  uploaded: 'bg-blue-50 text-blue-700',
  pending: 'bg-amber-50 text-amber-800',
  rejected: 'bg-brand-50 text-brand-700',
  received: 'bg-green-50 text-green-800',
  issue: 'bg-brand-50 text-brand-700',
  open: 'bg-brand-50 text-brand-700',
  in_progress: 'bg-blue-50 text-blue-700',
  resolved: 'bg-green-50 text-green-800',
  high: 'bg-brand-50 text-brand-700',
  medium: 'bg-amber-50 text-amber-800',
  low: 'bg-green-50 text-green-800',
} as const

const labels: Record<string, string> = {
  verified: 'Verified',
  uploaded: 'Uploaded',
  pending: 'Pending',
  rejected: 'Rejected',
  received: 'Received',
  issue: 'Issue',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export default function Badge({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[value as keyof typeof variants] ?? 'bg-gray-100 text-gray-600',
        className
      )}
    >
      {labels[value] ?? value}
    </span>
  )
}
