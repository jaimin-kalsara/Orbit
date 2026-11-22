import {
  Children, Fragment, forwardRef, isValidElement, useCallback, useEffect, useId, useImperativeHandle,
  useLayoutEffect, useRef, useState,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

const base =
  'w-full rounded-[10px] bg-surface-2 text-ink placeholder:text-ink-3 ring-1 ring-inset ring-line transition-[box-shadow,background-color] duration-150 outline-none hover:ring-line-strong focus:bg-surface focus:ring-2 focus:ring-accent/70 disabled:opacity-60'

export function Label({ children, hint, htmlFor, className }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 flex items-baseline justify-between gap-2', className)}>
      <span className="text-[12.5px] font-medium text-ink-2">{children}</span>
      {hint && <span className="text-[11.5px] text-ink-3">{hint}</span>}
    </label>
  )
}

export function FieldError({ children }) {
  if (!children) return null
  return <p className="mt-1.5 text-[12.5px] text-danger">{children}</p>
}

export const Input = forwardRef(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(base, 'h-10 px-3', invalid && 'ring-danger/60', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
})

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(base, 'min-h-24 resize-y px-3 py-2.5 leading-relaxed', className)} {...props} />
})

/** Reads <option value data-color>label</option> children into plain objects. */
function readOptions(children) {
  const out = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === Fragment) return out.push(...readOptions(child.props.children))
    const text = Children.toArray(child.props.children).join('')
    out.push({ value: String(child.props.value ?? text), label: text, color: child.props['data-color'], disabled: child.props.disabled })
  })
  return out
}

/**
 * Themed replacement for <select>. Same API as a native select
 * (value, onChange(e) with e.target.value, <option> children), but the list is
 * drawn by us so it always follows the app's theme instead of the OS.
 */
export const Select = forwardRef(function Select(
  { className, children, value, onChange, disabled, id, 'aria-label': ariaLabel, placeholder = 'Select…' },
  ref,
) {
  const options = readOptions(children)
  const current = String(value ?? '')
  const selectedIndex = options.findIndex((o) => o.value === current)
  const selected = options[selectedIndex]
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [pos, setPos] = useState(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const typeahead = useRef({ text: '', timer: null })
  const listId = useId()
  useImperativeHandle(ref, () => buttonRef.current)

  const place = useCallback(() => {
    const r = buttonRef.current?.getBoundingClientRect()
    if (!r) return
    const below = window.innerHeight - r.bottom - 8
    const above = r.top - 8
    const up = below < 220 && above > below
    setPos({
      left: Math.min(r.left, window.innerWidth - Math.max(r.width, 180) - 8),
      width: Math.max(r.width, 180),
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
      maxHeight: Math.min(300, (up ? above : below) - 6),
      up,
    })
  }, [])

  const openList = () => {
    if (disabled) return
    place()
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }
  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus({ preventScroll: true })
  }
  const choose = (opt) => {
    if (!opt || opt.disabled) return
    if (opt.value !== current) onChange?.({ target: { value: opt.value, id } })
    close()
  }

  useLayoutEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!buttonRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) close(false)
    }
    const onMove = () => place()
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, place])

  useEffect(() => {
    if (open && active >= 0) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const step = (from, dir) => {
    for (let i = 1; i <= options.length; i++) {
      const n = (from + dir * i + options.length) % options.length
      if (!options[n].disabled) return n
    }
    return from
  }

  const onKeyDown = (e) => {
    const k = e.key
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) {
        e.preventDefault()
        openList()
      }
      return
    }
    if (k === 'Escape' || k === 'Tab') {
      if (k === 'Escape') {
        e.preventDefault()
        e.stopPropagation() // don't also close a surrounding modal
      }
      close(k === 'Escape')
    } else if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => step(a, k === 'ArrowDown' ? 1 : -1))
    } else if (k === 'Home' || k === 'End') {
      e.preventDefault()
      setActive(k === 'Home' ? step(-1, 1) : step(options.length, -1))
    } else if (k === 'Enter' || k === ' ') {
      e.preventDefault()
      choose(options[active])
    } else if (k.length === 1) {
      const t = typeahead.current
      clearTimeout(t.timer)
      t.text += k.toLowerCase()
      t.timer = setTimeout(() => (t.text = ''), 500)
      const hit = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(t.text))
      if (hit >= 0) setActive(hit)
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          base,
          'flex h-10 cursor-pointer items-center gap-2 pr-2.5 pl-3 text-left select-none',
          open && 'bg-surface ring-2 ring-accent/70',
          className,
        )}
      >
        {selected?.color && <span className="size-2 shrink-0 rounded-full" style={{ background: selected.color }} />}
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-ink-3')}>{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-ink-3 transition-transform duration-200', open && 'rotate-180')}
          style={{ transitionTimingFunction: 'var(--ease-out)' }}
        />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-labelledby={id}
              initial={{ opacity: 0, transform: 'scale(0.97)' }}
              animate={{ opacity: 1, transform: 'scale(1)' }}
              exit={{ opacity: 0, transform: 'scale(0.98)', transition: { duration: 0.1 } }}
              transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
              onPointerDown={(e) => e.preventDefault() /* keep focus on the trigger */}
              style={{
                position: 'fixed',
                left: pos.left,
                width: pos.width,
                top: pos.top,
                bottom: pos.bottom,
                maxHeight: pos.maxHeight,
                transformOrigin: pos.up ? 'bottom' : 'top',
              }}
              className="z-[90] overflow-y-auto overscroll-contain rounded-xl bg-surface-2 p-1 shadow-pop"
            >
              {options.map((o, i) => {
                const isSelected = o.value === current
                return (
                  <li
                    key={`${o.value}-${i}`}
                    id={`${listId}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={o.disabled || undefined}
                    onPointerEnter={() => !o.disabled && setActive(i)}
                    onClick={() => choose(o)}
                    className={cn(
                      'flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] select-none',
                      i === active ? 'bg-surface-3 text-ink' : 'text-ink-2',
                      isSelected && 'font-medium text-ink',
                      o.disabled && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    {o.color && <span className="size-2 shrink-0 rounded-full" style={{ background: o.color }} />}
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {isSelected && <Check className="size-3.5 shrink-0 text-accent-ink" strokeWidth={2.5} />}
                  </li>
                )
              })}
              {options.length === 0 && <li className="px-2.5 py-2 text-[13px] text-ink-3">No options</li>}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
})
