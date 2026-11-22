import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

function useIsMobile() {
  const query = '(max-width: 639px)'
  const [mobile, setMobile] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const fn = () => setMobile(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return mobile
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Centered dialog on desktop, drag-to-dismiss bottom sheet on phones.
 * Handles Escape, focus trapping, focus restore and scroll lock.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', initialFocus }) {
  const mobile = useIsMobile()
  const reduce = useReducedMotion()
  const panelRef = useRef(null)
  const restoreRef = useRef(null)
  const dragControls = useDragControls()

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      const target = initialFocus?.current || panelRef.current?.querySelector('[data-autofocus]') || panelRef.current
      target?.focus({ preventScroll: true })
    }, 30)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)]
        if (!nodes.length) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
      restoreRef.current?.focus?.({ preventScroll: true })
    }
  }, [open, onClose, initialFocus])

  const width = { sm: 'sm:max-w-[400px]', md: 'sm:max-w-[520px]', lg: 'sm:max-w-[640px]' }[size]

  const panelMotion = mobile
    ? {
        initial: { y: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 },
        animate: { y: 0, opacity: 1 },
        exit: { y: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 },
        transition: { duration: 0.42, ease: [0.32, 0.72, 0, 1] },
      }
    : {
        initial: { opacity: 0, transform: reduce ? 'scale(1)' : 'scale(0.96) translateY(6px)' },
        animate: { opacity: 1, transform: 'scale(1) translateY(0px)' },
        exit: { opacity: 0, transform: reduce ? 'scale(1)' : 'scale(0.97) translateY(4px)', transition: { duration: 0.14 } },
        transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] },
      }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            tabIndex={-1}
            {...panelMotion}
            drag={mobile && !reduce ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.7 }}
            dragListener={false}
            dragControls={dragControls}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 450) onClose()
            }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface shadow-pop outline-none',
              'rounded-t-[20px] sm:rounded-2xl',
              width,
            )}
          >
            {mobile && <SheetHandle onStart={(e) => !reduce && dragControls.start(e)} />}
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-1 sm:px-6 sm:pt-5">
                <div className="min-w-0">
                  {title && <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>}
                  {description && <p className="mt-1 text-[13px] text-ink-3">{description}</p>}
                </div>
                <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose} className="-mr-2 hidden sm:inline-flex">
                  <X className="size-4" />
                </Button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-line bg-surface px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Grab handle: the only drag surface, so content inside the sheet still scrolls normally. */
function SheetHandle({ onStart }) {
  return (
    <div className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center" onPointerDown={onStart}>
      <span className="h-1 w-10 rounded-full bg-line-strong" />
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Delete', loading, children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
