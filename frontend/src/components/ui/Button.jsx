import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const VARIANTS = {
  primary:
    'bg-accent text-accent-fg font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_1px_2px_rgb(0_0_0/0.2)] hover:brightness-[1.06]',
  secondary: 'bg-surface-2 text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-3',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger/12 text-danger ring-1 ring-inset ring-danger/25 hover:bg-danger/18',
  outline: 'text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-2',
}

const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-[13.5px] gap-2 rounded-[10px]',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
  icon: 'size-9 rounded-[10px] justify-center',
  'icon-sm': 'size-8 rounded-lg justify-center',
}

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', loading = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'pressable shrink-0 items-center whitespace-nowrap font-medium outline-none disabled:pointer-events-none disabled:opacity-50',
        !/(^|\s)hidden(\s|$)/.test(className || '') && 'inline-flex',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
})
