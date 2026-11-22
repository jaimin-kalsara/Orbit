import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { addDays, cn, formatTime, parseISODate, startOfWeek, toISODate } from '../../lib/utils'
import { Popover } from './Popover'

const triggerBase =
  'flex h-10 w-full cursor-pointer items-center gap-2 rounded-[10px] bg-surface-2 pr-2 pl-3 text-left text-ink ring-1 ring-inset ring-line outline-none transition-[box-shadow,background-color] duration-150 select-none hover:ring-line-strong focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-accent/70 disabled:cursor-not-allowed disabled:opacity-50'

function ClearButton({ onClear, label }) {
  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onClear()
      }}
      className="grid size-6 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-surface-3 hover:text-ink"
    >
      <X className="size-3.5" />
    </span>
  )
}

/* =====================================================================
   Date picker
   ===================================================================== */
export function DatePicker({
  id,
  value,
  onChange,
  weekStart = 1,
  placeholder = 'No date',
  clearable = true,
  quickPicks = true,
  disabled,
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const gridRef = useRef(null)
  const today = toISODate(new Date())
  const [focusDay, setFocusDay] = useState(value || today)
  const [view, setView] = useState(() => parseISODate(value || today))

  const close = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) anchorRef.current?.focus({ preventScroll: true })
  }, [])

  const openPicker = () => {
    if (disabled) return
    const start = value || today
    setFocusDay(start)
    setView(parseISODate(start))
    setOpen(true)
  }

  // Move keyboard focus to the active day whenever it changes while open.
  useLayoutEffect(() => {
    if (!open) return
    const focus = () => gridRef.current?.querySelector(`[data-day="${focusDay}"]`)?.focus({ preventScroll: true })
    // Synchronous while navigating (so a fast Enter hits the right day);
    // deferred once on open, while the popover is still mounting.
    if (gridRef.current) return void focus()
    const t = setTimeout(focus, 20)
    return () => clearTimeout(t)
  }, [open, focusDay, view])

  const pick = (iso) => {
    onChange(iso)
    close()
  }

  const moveFocus = (iso) => {
    setFocusDay(iso)
    const d = parseISODate(iso)
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) setView(d)
  }

  const shiftMonth = (delta) => {
    const next = new Date(view.getFullYear(), view.getMonth() + delta, 1)
    setView(next)
    const fd = parseISODate(focusDay)
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    setFocusDay(toISODate(new Date(next.getFullYear(), next.getMonth(), Math.min(fd.getDate(), lastDay))))
  }

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1)
    const start = startOfWeek(first, weekStart)
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [view, weekStart])

  const weekdayLabels = useMemo(
    () => days.slice(0, 7).map((d) => d.toLocaleDateString([], { weekday: 'narrow' })),
    [days],
  )

  const onGridKey = (e) => {
    const d = parseISODate(focusDay)
    const map = {
      ArrowLeft: () => moveFocus(toISODate(addDays(d, -1))),
      ArrowRight: () => moveFocus(toISODate(addDays(d, 1))),
      ArrowUp: () => moveFocus(toISODate(addDays(d, -7))),
      ArrowDown: () => moveFocus(toISODate(addDays(d, 7))),
      Home: () => moveFocus(toISODate(startOfWeek(d, weekStart))),
      End: () => moveFocus(toISODate(addDays(startOfWeek(d, weekStart), 6))),
      PageUp: () => shiftMonth(e.shiftKey ? -12 : -1),
      PageDown: () => shiftMonth(e.shiftKey ? 12 : 1),
    }
    if (map[e.key]) {
      e.preventDefault()
      map[e.key]()
    }
  }

  const label = value
    ? parseISODate(value).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        ...(parseISODate(value).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
      })
    : placeholder

  const quick = [
    { label: 'Today', iso: today },
    { label: 'Tomorrow', iso: toISODate(addDays(new Date(), 1)) },
    { label: 'Next week', iso: toISODate(addDays(startOfWeek(new Date(), weekStart), 7)) },
  ]

  return (
    <>
      <button
        ref={anchorRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel || (value ? `Date: ${label}` : 'Choose date')}
        onClick={() => (open ? close() : openPicker())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            openPicker()
          }
        }}
        className={cn(triggerBase, open && 'bg-surface ring-2 ring-accent/70')}
      >
        <CalendarDays className={cn('size-4 shrink-0', value ? 'text-ink-2' : 'text-ink-3')} />
        <span className={cn('min-w-0 flex-1 truncate', !value && 'text-ink-3')}>{label}</span>
        {clearable && value && !disabled && <ClearButton label="Clear date" onClear={() => onChange('')} />}
      </button>

      <Popover open={open} onClose={close} anchorRef={anchorRef} width={300} label="Choose a date">
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <span className="pl-1 text-[13.5px] font-semibold text-ink" aria-live="polite">
            {view.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </span>
          <div className="flex gap-0.5">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
              className="pressable grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-3 hover:text-ink"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
              className="pressable grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-3 hover:text-ink"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="px-3" role="grid" aria-label={view.toLocaleDateString([], { month: 'long', year: 'numeric' })}>
          <div className="mb-1 grid grid-cols-7" role="row">
            {weekdayLabels.map((w, i) => (
              <span key={i} role="columnheader" className="grid h-7 place-items-center font-mono text-[10.5px] text-ink-3">
                {w}
              </span>
            ))}
          </div>
          <div ref={gridRef} className="grid grid-cols-7 gap-y-0.5" onKeyDown={onGridKey}>
            {days.map((d) => {
              const iso = toISODate(d)
              const inMonth = d.getMonth() === view.getMonth()
              const selected = iso === value
              const isToday = iso === today
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  data-day={iso}
                  tabIndex={iso === focusDay ? 0 : -1}
                  aria-selected={selected}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  onClick={() => pick(iso)}
                  className={cn(
                    'relative mx-auto grid size-9 place-items-center rounded-[10px] text-[13px] tabular transition-colors duration-100 outline-none',
                    selected
                      ? 'bg-accent font-semibold text-accent-fg'
                      : cn(inMonth ? 'text-ink' : 'text-ink-3/60', 'hover:bg-surface-3 focus-visible:bg-surface-3'),
                    'focus-visible:ring-2 focus-visible:ring-accent/70',
                    isToday && !selected && 'font-semibold text-accent-ink',
                  )}
                >
                  {d.getDate()}
                  {isToday && (
                    <span
                      className={cn('absolute bottom-1 size-1 rounded-full', selected ? 'bg-accent-fg' : 'bg-accent')}
                      aria-hidden="true"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {(quickPicks || (clearable && value)) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line p-2.5">
            {quickPicks &&
              quick.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => pick(q.iso)}
                  className={cn(
                    'pressable h-7 rounded-md px-2 text-[12px] font-medium ring-1 ring-inset',
                    value === q.iso ? 'bg-accent/15 text-accent-ink ring-accent/40' : 'text-ink-2 ring-line hover:bg-surface-3 hover:text-ink',
                  )}
                >
                  {q.label}
                </button>
              ))}
            {clearable && value && (
              <button
                type="button"
                onClick={() => pick('')}
                className="pressable ml-auto h-7 rounded-md px-2 text-[12px] font-medium text-ink-3 hover:bg-surface-3 hover:text-danger"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </Popover>
    </>
  )
}

/* =====================================================================
   Time picker
   ===================================================================== */
const pad = (n) => String(n).padStart(2, '0')
const SLOTS = Array.from({ length: 96 }, (_, i) => `${pad(Math.floor(i / 4))}:${pad((i % 4) * 15)}`)

/** Parses "9", "930", "9:30", "9.30pm", "21:15", "9 am" → "HH:MM" (or null). */
export function parseTime(input) {
  const s = input.trim().toLowerCase().replace(/\s+/g, '')
  const m = s.match(/^(\d{1,2})(?:[:.]?(\d{2}))?(a|am|p|pm)?$/)
  if (!m) return null
  let h = Number(m[1])
  const min = m[2] ? Number(m[2]) : 0
  const mer = m[3]
  if (min > 59) return null
  if (mer) {
    if (h < 1 || h > 12) return null
    if (mer.startsWith('p') && h !== 12) h += 12
    if (mer.startsWith('a') && h === 12) h = 0
  } else if (h > 23) return null
  return `${pad(h)}:${pad(min)}`
}

export function TimePicker({ id, value, onChange, placeholder = 'Add time', clearable = true, disabled, 'aria-label': ariaLabel }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState(false)
  const anchorRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const current = value ? value.slice(0, 5) : ''

  const close = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) anchorRef.current?.focus({ preventScroll: true })
  }, [])

  const openPicker = () => {
    if (disabled) return
    setText('')
    setError(false)
    setOpen(true)
  }

  // Centre the selected slot (or the next slot from now) in the list.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      const now = new Date()
      const nextSlot = SLOTS[Math.min(95, Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15))]
      const target = listRef.current?.querySelector(`[data-time="${current || nextSlot}"]`)
      target?.scrollIntoView({ block: 'center' })
      inputRef.current?.focus({ preventScroll: true })
    }, 20)
    return () => clearTimeout(t)
  }, [open, current])

  const pick = (t) => {
    onChange(t)
    close()
  }

  const focusItem = (dir) => {
    const items = [...(listRef.current?.querySelectorAll('[data-time]') || [])]
    const i = items.indexOf(document.activeElement)
    let next
    if (i === -1) {
      next = items.findIndex((el) => el.dataset.time === current)
      if (next === -1) next = items.findIndex((el) => el.dataset.time >= `${pad(new Date().getHours())}:00`)
    } else next = i + dir
    if (next < 0) return inputRef.current?.focus()
    items[Math.min(items.length - 1, Math.max(0, next))]?.focus()
  }

  return (
    <>
      <button
        ref={anchorRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel || (current ? `Time: ${formatTime(current)}` : 'Choose time')}
        onClick={() => (open ? close() : openPicker())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            openPicker()
          }
        }}
        className={cn(triggerBase, open && 'bg-surface ring-2 ring-accent/70')}
      >
        <Clock className={cn('size-4 shrink-0', current ? 'text-ink-2' : 'text-ink-3')} />
        <span className={cn('min-w-0 flex-1 truncate tabular', !current && 'text-ink-3')}>
          {current ? formatTime(current) : placeholder}
        </span>
        {clearable && current && !disabled && <ClearButton label="Clear time" onClear={() => onChange('')} />}
      </button>

      <Popover open={open} onClose={close} anchorRef={anchorRef} width={216} align="end" label="Choose a time">
        <div className="border-b border-line p-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (!text.trim()) return
                const t = parseTime(text)
                if (t) pick(t)
                else setError(true)
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                focusItem(1)
              }
            }}
            placeholder="Type a time, e.g. 9:45pm"
            aria-label="Type a time"
            aria-invalid={error || undefined}
            inputMode="text"
            enterKeyHint="done"
            className={cn(
              'h-9 w-full rounded-lg bg-surface px-2.5 text-ink ring-1 ring-inset outline-none placeholder:text-ink-3 focus:ring-2',
              error ? 'ring-danger/60 focus:ring-danger/60' : 'ring-line focus:ring-accent/60',
            )}
          />
          {error && <p className="mt-1 px-0.5 text-[11.5px] text-danger">Try formats like 9, 9:30 or 9:30pm</p>}
        </div>
        <div
          ref={listRef}
          role="listbox"
          aria-label="Times"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
          style={{ maxHeight: 264 }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              focusItem(e.key === 'ArrowDown' ? 1 : -1)
            }
          }}
        >
          {SLOTS.map((t) => {
            const selected = t === current
            return (
              <button
                key={t}
                type="button"
                role="option"
                aria-selected={selected}
                data-time={t}
                tabIndex={-1}
                onClick={() => pick(t)}
                className={cn(
                  'flex h-8 w-full items-center rounded-lg px-2.5 text-left text-[13px] tabular outline-none transition-colors duration-100',
                  selected
                    ? 'bg-accent font-semibold text-accent-fg'
                    : 'text-ink-2 hover:bg-surface-3 hover:text-ink focus-visible:bg-surface-3 focus-visible:text-ink',
                )}
              >
                {formatTime(t)}
              </button>
            )
          })}
        </div>
        {clearable && current && (
          <div className="border-t border-line p-1.5">
            <button
              type="button"
              onClick={() => pick('')}
              className="pressable h-8 w-full rounded-lg text-[12.5px] font-medium text-ink-3 hover:bg-surface-3 hover:text-danger"
            >
              Clear time
            </button>
          </div>
        )}
      </Popover>
    </>
  )
}
