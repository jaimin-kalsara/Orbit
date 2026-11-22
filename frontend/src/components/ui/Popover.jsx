import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../../lib/utils'

/**
 * Fixed-position popover anchored to `anchorRef`. Rendered in a portal so it is
 * never clipped by dialogs or scroll containers; flips above the anchor when
 * there isn't room below. Escape and outside-press close it.
 */
export function Popover({ open, onClose, anchorRef, children, width = 296, align = 'start', className, label }) {
  const [pos, setPos] = useState(null)
  const panelRef = useRef(null)

  const place = useCallback(() => {
    const r = anchorRef.current?.getBoundingClientRect()
    if (!r) return
    const w = Math.min(width, window.innerWidth - 16)
    const below = window.innerHeight - r.bottom - 8
    const above = r.top - 8
    const up = below < 340 && above > below
    let left = align === 'end' ? r.right - w : r.left
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
    setPos({
      up,
      left,
      width: w,
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
      maxHeight: Math.max(200, (up ? above : below) - 6),
    })
  }, [anchorRef, width, align])

  useLayoutEffect(() => {
    if (!open) return
    place()
    const onDown = (e) => {
      if (!anchorRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) onClose(false)
    }
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation() // don't also close a surrounding dialog
      onClose(true)
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
  }, [open, place, onClose, anchorRef])

  return createPortal(
    <AnimatePresence>
      {open && pos && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          initial={{ opacity: 0, transform: 'scale(0.97)' }}
          animate={{ opacity: 1, transform: 'scale(1)' }}
          exit={{ opacity: 0, transform: 'scale(0.98)', transition: { duration: 0.1 } }}
          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          style={{
            position: 'fixed',
            left: pos.left,
            width: pos.width,
            top: pos.top,
            bottom: pos.bottom,
            maxHeight: pos.maxHeight,
            transformOrigin: `${pos.up ? 'bottom' : 'top'} ${align === 'end' ? 'right' : 'left'}`,
          }}
          className={cn('z-[90] flex flex-col overflow-hidden rounded-2xl bg-surface-2 shadow-pop', className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
