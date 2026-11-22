import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '../../lib/utils'

/**
 * Minimal column chart. Bars grow from the baseline; today is solid accent,
 * other days a muted accent; a dashed line marks the daily goal.
 */
export function BarChart({ data, goal, height = 160, sparseLabels = false }) {
  const reduce = useReducedMotion()
  const [hover, setHover] = useState(null)
  const max = Math.max(goal || 0, ...data.map((d) => d.value), 1)
  const top = Math.ceil(max * 1.2)

  return (
    <div className="select-none">
      <div className="relative" style={{ height }}>
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${f * 100}%` }} />
        ))}
        {goal > 0 && (
          <div className="pointer-events-none absolute inset-x-0 z-[1] flex items-center" style={{ bottom: `${(goal / top) * 100}%` }}>
            <div className="h-0 flex-1 border-t border-dashed" style={{ borderColor: 'color-mix(in oklab, var(--accent) 75%, transparent)' }} />
            <span className="ml-1.5 translate-y-[-1px] font-mono text-[10px] text-accent-ink">{goal}</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-end gap-[5%] pr-6 sm:gap-[3.5%]">
          {data.map((d, i) => {
            const pct = (d.value / top) * 100
            return (
              <div
                key={d.key ?? i}
                className="relative flex h-full flex-1 items-end justify-center"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              >
                {hover === i && (
                  <div
                    className="absolute z-10 -translate-y-[calc(100%+6px)] rounded-md bg-ink px-2 py-1 font-mono text-[11px] whitespace-nowrap text-bg shadow-pop"
                    style={{ bottom: `${Math.max(pct, 2)}%` }}
                  >
                    {d.value} · {d.tooltip || d.label}
                  </div>
                )}
                <motion.div
                  className={cn('w-full max-w-[34px] rounded-t-[6px] rounded-b-[2px]', d.future && 'opacity-40')}
                  style={{
                    height: `${d.value > 0 ? Math.max(pct, 3) : 1.5}%`,
                    transformOrigin: 'bottom',
                    background: d.highlight
                      ? 'var(--accent)'
                      : d.value > 0
                        ? 'color-mix(in oklab, var(--accent) 40%, var(--surface-3))'
                        : 'var(--surface-3)',
                  }}
                  initial={reduce ? false : { transform: 'scaleY(0)' }}
                  animate={{ transform: 'scaleY(1)' }}
                  transition={{ duration: 0.6, delay: reduce ? 0 : 0.05 + Math.min(i, 20) * 0.025, ease: [0.23, 1, 0.32, 1] }}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-[5%] pr-6 sm:gap-[3.5%]">
        {data.map((d, i) => (
          <span
            key={d.key ?? i}
            className={cn(
              'flex-1 text-center font-mono text-[10.5px]',
              d.highlight ? 'font-semibold text-ink' : 'text-ink-3',
              sparseLabels && i % 5 !== 0 && !d.highlight && 'invisible',
            )}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Horizontal share bars for breakdowns (categories, priorities). */
export function ShareBars({ rows, emptyLabel = 'No data yet' }) {
  const total = Math.max(1, ...rows.map((r) => r.total))
  if (!rows.length) return <p className="py-6 text-center text-[13px] text-ink-3">{emptyLabel}</p>
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 text-ink">
              <span className="size-2 shrink-0 rounded-full" style={{ background: r.color }} />
              <span className="truncate">{r.label}</span>
            </span>
            <span className="shrink-0 font-mono text-[11.5px] text-ink-3 tabular">
              {r.done}/{r.total}
            </span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-3">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full opacity-35"
              style={{ background: r.color, width: `${(r.total / total) * 100}%`, transformOrigin: 'left' }}
              initial={{ transform: 'scaleX(0)' }}
              animate={{ transform: 'scaleX(1)' }}
              transition={{ duration: 0.6, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
            />
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: r.color, width: `${(r.done / total) * 100}%`, transformOrigin: 'left' }}
              initial={{ transform: 'scaleX(0)' }}
              animate={{ transform: 'scaleX(1)' }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.04, ease: [0.23, 1, 0.32, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
