import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:border disabled:border-outline disabled:bg-surface disabled:text-[#aaaaaa]',
        variant === 'default' && 'bg-brand-500 text-white hover:bg-brand-700',
        variant === 'outline' && 'border border-line bg-white text-ink hover:bg-surface',
        className
      )}
      {...props}
    />
  )
)

Button.displayName = 'Button'

export { Button }
