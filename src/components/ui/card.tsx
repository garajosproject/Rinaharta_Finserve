import * as React from 'react'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-outline bg-white shadow-none',
        className
      )}
      {...props}
    />
  )
}
