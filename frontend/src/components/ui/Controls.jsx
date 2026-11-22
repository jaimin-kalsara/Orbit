import { useId } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { cn, SWATCHES } from '../../lib/utils'

/* ---------- Switch ---------- */
export function Switch({ checked, onChange, label, description, disabled }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[13.5px] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[12.5px] text-ink-3">{description}</span>}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50',
          checked ? 'bg-accent' : 'bg-surface-3 ring-1 ring-inset ring-line-strong',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] left-[3px] size-4 rounded-full shadow-sm transition-transform duration-200 ease-out',
            checked ? 'translate-x-4 bg-accent-fg' : 'bg-ink-2',
          )}
          style={{ transitionTimingFunction: 'var(--ease-out)' }}
        />
      </button>
    </div>
  )
}

/* ---------- Segmented control with a sliding indicator ---------- */
export function Segmented({ value, onChange, options, size = 'md', className, layoutId }) {
  const lid = useId()
  return (
    <div
      role="radiogroup"
      className={cn('inline-flex rounded-[10px] bg-surface-2 p-0.5 ring-1 ring-inset ring-line', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors duration-150',
              size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-8 px-3 text-[13px]',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId || lid}
                className="absolute inset-0 rounded-lg bg-surface shadow-card ring-1 ring-line-strong"
                transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {Icon && <Icon className="size-3.5" />}
              {!opt.iconOnly && opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Color swatches ---------- */
export function ColorPicker({ value, onChange, colors = SWATCHES }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {colors.map((c) => {
        const active = c.toLowerCase() === value?.toLowerCase()
        return (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            onClick={() => onChange(c)}
            className="pressable grid size-7 place-items-center rounded-full"
          >
            <span
              className={cn('grid size-5 place-items-center rounded-full transition-shadow', active && 'ring-2 ring-offset-2 ring-offset-surface')}
              style={{ background: c, '--tw-ring-color': c }}
            >
              {active && <Check className="size-3" strokeWidth={3} style={{ color: '#0008' }} />}
            </span>
          </button>
        )
      })}
      <label className="pressable relative grid size-7 cursor-pointer place-items-center rounded-full" title="Custom color">
        <span
          className="size-5 rounded-full ring-1 ring-line-strong"
          style={{ background: 'conic-gradient(#f43f5e, #f59e0b, #a3e635, #14b8a6, #3b82f6, #a855f7, #f43f5e)' }}
        />
        <input
          type="color"
          value={value || '#888888'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}

/* ---------- Small pieces ---------- */
export function Dot({ color, className }) {
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', className)} style={{ background: color }} />
}

export function Pill({ color, children, className }) {
  return (
    <span
      className={cn('inline-flex h-[22px] items-center gap-1.5 rounded-md px-1.5 text-[12px] font-medium', className)}
      style={{
        color: `color-mix(in oklab, ${color} 78%, var(--ink))`,
        background: `color-mix(in oklab, ${color} 13%, transparent)`,
      }}
    >
      {children}
    </span>
  )
}

export function Kbd({ children }) {
  return (
    <kbd className="inline-grid h-5 min-w-5 place-items-center rounded-[5px] bg-surface-3 px-1 font-mono text-[10.5px] text-ink-3 ring-1 ring-inset ring-line-strong">
      {children}
    </kbd>
  )
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />
}

export function ProgressRing({ value, size = 64, stroke = 6, children, trackClass = 'stroke-surface-3' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClass} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="var(--accent)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}
