import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-0',
        className
      )}
      {...props}
    />
  )
)

Input.displayName = 'Input'

export { Input }
