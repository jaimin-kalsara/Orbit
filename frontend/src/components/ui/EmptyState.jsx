import { motion } from 'motion/react'
import { cn } from '../../lib/utils'

/** Quiet empty state: a small orbit illustration, one line of copy, one action. */
export function EmptyState({ icon: Icon, title, description, action, className, compact }) {
  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateY(6px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className={cn('flex flex-col items-center text-center', compact ? 'py-8' : 'py-16', className)}
    >
      <div className={cn('relative grid place-items-center', compact ? 'mb-3 size-14' : 'mb-5 size-20')}>
        <div className="absolute inset-0 rounded-full border border-dashed border-line-strong" />
        <div className="absolute inset-[22%] rounded-full bg-surface-2 ring-1 ring-line" />
        <span className="absolute top-[6%] right-[10%] size-2 rounded-full bg-accent" />
        {Icon && <Icon className={cn('relative text-ink-2', compact ? 'size-4' : 'size-5')} strokeWidth={1.75} />}
      </div>
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-[280px] text-[13px] text-ink-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}
