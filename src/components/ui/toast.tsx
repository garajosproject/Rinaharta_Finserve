'use client'

import { CheckCircle2, CircleAlert } from 'lucide-react'
import { useToastStore } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

export function Toaster() {
  const { toasts } = useToastStore()

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={cn(
            'pointer-events-auto rounded-md border border-black/5 bg-white p-4 shadow-xl shadow-black/10 animate-slide-in',
            item.variant === 'destructive' && 'border-red-200 bg-red-50'
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'mt-0.5 text-brand-600',
                item.variant === 'destructive' && 'text-red-600'
              )}
            >
              {item.variant === 'destructive' ? (
                <CircleAlert className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              {item.description && (
                <p className="mt-1 text-sm text-gray-500">{item.description}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
