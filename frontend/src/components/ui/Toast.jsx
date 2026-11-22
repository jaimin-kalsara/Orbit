import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Bell, Check, X } from 'lucide-react'
import { cn } from '../../lib/utils'

/* A tiny Sonner-style store: call toast() from anywhere, mount <Toaster /> once. */
let toasts = []
let seq = 0
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())

export function toast(message, opts = {}) {
  const id = opts.id ?? ++seq
  const item = { id, message, type: 'default', duration: 4000, ...opts }
  toasts = [...toasts.filter((t) => t.id !== id), item].slice(-4)
  emit()
  return id
}
toast.success = (m, o) => toast(m, { ...o, type: 'success' })
toast.error = (m, o) => toast(m, { ...o, type: 'error', duration: 6000 })
toast.reminder = (m, o) => toast(m, { ...o, type: 'reminder', duration: 12000 })
toast.dismiss = (id) => {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

const ICONS = {
  success: <Check className="size-3.5" strokeWidth={2.5} />,
  error: <AlertCircle className="size-3.5" strokeWidth={2.25} />,
  reminder: <Bell className="size-3.5" strokeWidth={2.25} />,
}

function ToastItem({ t, paused }) {
  const remaining = useRef(t.duration)
  const started = useRef(Date.now())

  useEffect(() => {
    if (t.duration === Infinity) return
    if (paused) {
      remaining.current -= Date.now() - started.current
      return
    }
    started.current = Date.now()
    const timer = setTimeout(() => toast.dismiss(t.id), Math.max(remaining.current, 600))
    return () => clearTimeout(timer)
  }, [paused, t.id, t.duration])

  return (
    <motion.li
      layout
      initial={{ opacity: 0, transform: 'translateY(16px) scale(0.97)' }}
      animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
      exit={{ opacity: 0, transform: 'translateY(12px) scale(0.97)', transition: { duration: 0.16 } }}
      transition={{ type: 'spring', duration: 0.38, bounce: 0.12 }}
      role={t.type === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-line-strong bg-surface-3/95 py-2.5 pl-3 pr-2 text-[13px] text-ink shadow-pop backdrop-blur-md sm:w-[360px]"
    >
      {ICONS[t.type] && (
        <span
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full',
            t.type === 'success' && 'bg-success/15 text-success',
            t.type === 'error' && 'bg-danger/15 text-danger',
            t.type === 'reminder' && 'bg-accent text-accent-fg',
          )}
        >
          {ICONS[t.type]}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{t.message}</p>
        {t.description && <p className="truncate text-ink-3">{t.description}</p>}
      </div>
      {t.action && (
        <button
          className="pressable shrink-0 rounded-md bg-surface px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line-strong hover:bg-surface-2"
          onClick={() => {
            t.action.onClick()
            toast.dismiss(t.id)
          }}
        >
          {t.action.label}
        </button>
      )}
      <button
        aria-label="Dismiss"
        className="pressable grid size-7 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
        onClick={() => toast.dismiss(t.id)}
      >
        <X className="size-3.5" />
      </button>
    </motion.li>
  )
}

export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts)
  const [hovered, setHovered] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onVis = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  return (
    <ol
      aria-live="polite"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="pointer-events-none fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-[80] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end lg:bottom-6"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <ToastItem key={t.id} t={t} paused={hovered || hidden} />
        ))}
      </AnimatePresence>
    </ol>
  )
}
