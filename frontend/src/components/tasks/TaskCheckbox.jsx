import { motion, useReducedMotion } from 'motion/react'
import { cn } from '../../lib/utils'

/** Round completion toggle. Ring tinted by priority; fills + draws a check on complete. */
export function TaskCheckbox({ checked, onToggle, color, size = 20, label }) {
  const reduce = useReducedMotion()
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label || (checked ? 'Mark as not done' : 'Mark as done')}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className="group/check pressable relative -m-2 grid shrink-0 place-items-center p-2"
    >
      <motion.span
        className={cn(
          'relative grid place-items-center rounded-full border-[1.5px] transition-colors duration-150',
          checked ? 'border-accent bg-accent' : 'bg-transparent',
        )}
        style={{
          width: size,
          height: size,
          borderColor: checked ? undefined : color ? `color-mix(in oklab, ${color} 75%, transparent)` : 'var(--line-strong)',
        }}
        animate={reduce ? undefined : { scale: checked ? [1, 1.14, 1] : 1 }}
        transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      >
        {!checked && (
          <span
            className="absolute inset-[3px] rounded-full opacity-0 transition-opacity duration-150 [@media(hover:hover)]:group-hover/check:opacity-100"
            style={{ background: color ? `color-mix(in oklab, ${color} 22%, transparent)` : 'var(--surface-3)' }}
          />
        )}
        <svg viewBox="0 0 16 16" className="relative" style={{ width: size * 0.62, height: size * 0.62 }}>
          <motion.path
            d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
            fill="none"
            stroke="var(--accent-fg)"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: [0.23, 1, 0.32, 1], delay: checked && !reduce ? 0.04 : 0 }}
          />
        </svg>
      </motion.span>
    </button>
  )
}
