import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

const MenuCtx = createContext(null)

/**
 * Lightweight dropdown. `trigger` is a render fn receiving props for the button.
 * Scales from the corner nearest its trigger (origin-aware).
 */
export function Menu({ trigger, children, align = 'end', side = 'bottom', className, width = 'w-56' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const rootRef = useRef(null)
  const listRef = useRef(null)

  // Fixed-position portal: never clipped by scroll containers, boards or dialogs.
  const place = useCallback(() => {
    const r = rootRef.current?.getBoundingClientRect()
    if (!r) return
    const below = window.innerHeight - r.bottom - 8
    const above = r.top - 8
    const up = side === 'top' ? above > 180 || above > below : below < 260 && above > below
    setPos({
      up,
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
      left: align === 'end' ? undefined : Math.max(8, r.left),
      right: align === 'end' ? Math.max(8, window.innerWidth - r.right) : undefined,
      maxHeight: Math.min(420, (up ? above : below) - 6),
    })
  }, [align, side])

  useLayoutEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        rootRef.current?.querySelector('[aria-haspopup]')?.focus()
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const items = [...(listRef.current?.querySelectorAll('[role^="menuitem"]') || [])]
        const i = items.indexOf(document.activeElement)
        const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length
        items[next]?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  const origin = pos ? `${pos.up ? 'bottom' : 'top'} ${align === 'end' ? 'right' : 'left'}` : 'top right'

  return (
    <MenuCtx.Provider value={{ close: () => setOpen(false) }}>
      <div ref={rootRef} className="relative inline-flex">
        {trigger({
          'aria-haspopup': 'menu',
          'aria-expanded': open,
          onClick: (e) => {
            e.stopPropagation()
            if (!open) place()
            setOpen((o) => !o)
          },
        })}
      </div>
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={listRef}
              role="menu"
              initial={{ opacity: 0, transform: 'scale(0.96)' }}
              animate={{ opacity: 1, transform: 'scale(1)' }}
              exit={{ opacity: 0, transform: 'scale(0.98)', transition: { duration: 0.1 } }}
              transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
              style={{
                position: 'fixed',
                top: pos.top,
                bottom: pos.bottom,
                left: pos.left,
                right: pos.right,
                maxHeight: pos.maxHeight,
                transformOrigin: origin,
              }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'z-[90] max-w-[calc(100vw-16px)] overflow-y-auto overscroll-contain rounded-xl bg-surface-2 p-1 shadow-pop',
                width,
                className,
              )}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </MenuCtx.Provider>
  )
}

export function MenuItem({ icon: Icon, children, onSelect, danger, checked, shortcut, keepOpen }) {
  const { close } = useContext(MenuCtx)
  return (
    <button
      role={checked !== undefined ? 'menuitemradio' : 'menuitem'}
      aria-checked={checked}
      onClick={() => {
        onSelect?.()
        if (!keepOpen) close()
      }}
      className={cn(
        'flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13px] outline-none transition-colors duration-100',
        'hover:bg-surface-3 focus-visible:bg-surface-3 focus-visible:outline-none',
        danger ? 'text-danger' : 'text-ink',
      )}
    >
      {Icon && <Icon className={cn('size-4 shrink-0', danger ? 'text-danger' : 'text-ink-3')} />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {checked && <Check className="size-3.5 text-accent-ink" strokeWidth={2.5} />}
      {shortcut && <span className="font-mono text-[11px] text-ink-3">{shortcut}</span>}
    </button>
  )
}

export function MenuLabel({ children }) {
  return <div className="px-2 pt-2 pb-1 text-[11px] font-medium text-ink-3">{children}</div>
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-line" />
}
