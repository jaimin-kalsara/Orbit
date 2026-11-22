import { useEffect, useMemo, useRef, useState } from 'react'
import { Flag, Trash2 } from 'lucide-react'
import { useApp } from '../../store/context'
import { addDays, cn, dueDateTime, relativeTime, toISODate } from '../../lib/utils'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FieldError, Label, Select, Textarea } from '../ui/Field'
import { Kbd } from '../ui/Controls'
import { DatePicker, TimePicker } from '../ui/DateTimePickers'

const REMINDER_OPTIONS = [
  { value: 'none', label: 'No reminder' },
  { value: '0', label: 'At due time' },
  { value: '5', label: '5 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
  { value: 'default', label: 'My default' },
  { value: 'custom', label: 'Custom…' },
]

const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function emptyForm(defaults, openStatus) {
  return {
    title: '',
    description: '',
    status: openStatus?.id ?? '',
    priority: '',
    category: '',
    project: '',
    due_date: '',
    due_time: '',
    reminder: 'none',
    reminder_custom: '',
    ...defaults,
  }
}

export function TaskEditor({ open, onClose, task, defaults }) {
  const app = useApp()
  const { statuses, priorities, categories, projects, openStatus, preferences } = app
  const [form, setForm] = useState(() => emptyForm(defaults, openStatus))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const titleRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority ?? '',
        category: task.category ?? '',
        project: task.project ?? '',
        due_date: task.due_date || '',
        due_time: task.due_time ? task.due_time.slice(0, 5) : '',
        reminder: task.reminder_at ? 'custom' : 'none',
        reminder_custom: toLocalInput(task.reminder_at),
      })
    } else {
      setForm(emptyForm(defaults, openStatus))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task])

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e
    setForm((f) => {
      const next = { ...f, [key]: value }
      // Picking a project pulls in its category when none is set.
      if (key === 'project' && value && !f.category) {
        const p = projects.find((x) => String(x.id) === String(value))
        if (p?.category) next.category = p.category
      }
      return next
    })
  }

  const visibleProjects = useMemo(() => projects.filter((p) => !p.is_archived || p.id === form.project), [projects, form.project])

  function computeReminder() {
    const { reminder, reminder_custom } = form
    if (reminder === 'none') return null
    if (reminder === 'custom') return reminder_custom ? new Date(reminder_custom).toISOString() : null
    const due = dueDateTime({ due_date: form.due_date, due_time: form.due_time })
    if (!due) return undefined // invalid: needs a due date
    const minutes = reminder === 'default' ? preferences.default_reminder_minutes : Number(reminder)
    return new Date(due.getTime() - minutes * 60000).toISOString()
  }

  async function submit(e) {
    e?.preventDefault()
    const errs = {}
    if (!form.title.trim()) errs.title = 'Give the task a title.'
    if (form.due_time && !form.due_date) errs.due_time = 'Pick a date first.'
    const reminder_at = computeReminder()
    if (reminder_at === undefined) errs.reminder = 'Set a due date to use a relative reminder.'
    if (form.reminder === 'custom' && !form.reminder_custom) errs.reminder = 'Pick a reminder time.'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status ? Number(form.status) : undefined,
      priority: form.priority ? Number(form.priority) : null,
      category: form.category ? Number(form.category) : null,
      project: form.project ? Number(form.project) : null,
      due_date: form.due_date || null,
      due_time: form.due_time || null,
    }
    const prevReminder = task?.reminder_at ? new Date(task.reminder_at).toISOString() : null
    if (!task || reminder_at !== prevReminder) payload.reminder_at = reminder_at

    setSaving(true)
    try {
      if (task) await app.updateTask(task.id, payload, { silent: true })
      else await app.createTask(payload)
      onClose()
    } catch (err) {
      const data = err.data || {}
      const fieldErrs = {}
      for (const [k, v] of Object.entries(data)) fieldErrs[k === 'reminder_at' ? 'reminder' : k] = Array.isArray(v) ? v[0] : String(v)
      setErrors(Object.keys(fieldErrs).length ? fieldErrs : { form: err.message })
    } finally {
      setSaving(false)
    }
  }

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(e)
  }

  const quickDates = [
    { label: 'Today', value: toISODate(new Date()) },
    { label: 'Tomorrow', value: toISODate(addDays(new Date(), 1)) },
    { label: 'Next week', value: toISODate(addDays(new Date(), 7)) },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      description={task ? `Created ${relativeTime(task.created_at)}` : undefined}
      size="lg"
      initialFocus={titleRef}
      footer={
        <>
          {task && (
            <Button
              variant="ghost"
              className="mr-auto text-danger! hover:text-danger!"
              onClick={() => {
                app.deleteTask(task)
                onClose()
              }}
            >
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
          <span className="mr-2 hidden items-center gap-1 text-[12px] text-ink-3 md:inline-flex">
            <Kbd>Ctrl</Kbd>
            <Kbd>↵</Kbd>
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={saving}>
            {task ? 'Save changes' : 'Create task'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} onKeyDown={onKeyDown} className="space-y-5" noValidate>
        <div>
          <input
            ref={titleRef}
            value={form.title}
            onChange={set('title')}
            maxLength={200}
            placeholder="What needs doing?"
            aria-label="Task title"
            className="w-full bg-transparent text-[19px] font-semibold tracking-[-0.015em] text-ink outline-none placeholder:text-ink-3 placeholder:font-medium"
          />
          <FieldError>{errors.title}</FieldError>
        </div>

        <Textarea
          value={form.description}
          onChange={set('description')}
          maxLength={5000}
          placeholder="Add notes, links or context…"
          aria-label="Description"
          className="min-h-20"
        />

        <div>
          <Label>Priority</Label>
          <div className="flex flex-wrap gap-1.5">
            {[{ id: '', name: 'None', color: 'var(--ink-3)' }, ...priorities].map((p) => {
              const active = String(form.priority) === String(p.id)
              return (
                <button
                  type="button"
                  key={p.id || 'none'}
                  onClick={() => set('priority')(p.id)}
                  className={cn(
                    'pressable inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium ring-1 ring-inset',
                    active ? 'bg-surface-3 text-ink ring-line-strong' : 'text-ink-2 ring-line hover:bg-surface-2',
                  )}
                  style={active && p.id ? { boxShadow: `inset 0 0 0 1px ${p.color}` } : undefined}
                >
                  <Flag className="size-3.5" style={{ color: p.color }} />
                  {p.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="te-status">Status</Label>
            <Select id="te-status" value={form.status} onChange={set('status')}>
              {statuses.map((s) => (
                <option key={s.id} value={s.id} data-color={s.color}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="te-cat">Category</Label>
            <Select id="te-cat" value={form.category} onChange={set('category')}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} data-color={c.color}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="te-proj">Project</Label>
            <Select id="te-proj" value={form.project} onChange={set('project')}>
              <option value="">None</option>
              {visibleProjects.map((p) => (
                <option key={p.id} value={p.id} data-color={p.color}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="te-date" hint={form.due_date ? undefined : 'Optional'}>
            Due
          </Label>
          <div className="grid grid-cols-[1fr_minmax(0,0.8fr)] gap-2 sm:grid-cols-[1fr_150px]">
            <DatePicker
              id="te-date"
              value={form.due_date}
              weekStart={preferences?.week_start ?? 1}
              quickPicks={false}
              onChange={(iso) =>
                setForm((f) =>
                  iso
                    ? { ...f, due_date: iso }
                    : { ...f, due_date: '', due_time: '', reminder: f.reminder === 'custom' ? 'custom' : 'none' },
                )
              }
            />
            <TimePicker
              value={form.due_time}
              onChange={set('due_time')}
              aria-label="Due time"
              placeholder={form.due_date ? 'Add time' : 'No time'}
              disabled={!form.due_date}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quickDates.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => set('due_date')(q.value)}
                className={cn(
                  'pressable h-7 rounded-md px-2 text-[12px] font-medium ring-1 ring-inset',
                  form.due_date === q.value ? 'bg-accent/15 text-accent-ink ring-accent/40' : 'text-ink-2 ring-line hover:bg-surface-2',
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
          <FieldError>{errors.due_time || errors.due_date}</FieldError>
        </div>

        <div>
          <Label htmlFor="te-rem">Reminder</Label>
          <Select id="te-rem" value={form.reminder} onChange={set('reminder')}>
            {REMINDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value === 'default' ? `My default (${preferences?.default_reminder_minutes ?? 30} min before)` : o.label}
              </option>
            ))}
          </Select>
          {form.reminder === 'custom' && (
            <div className="mt-2 grid grid-cols-[1fr_minmax(0,0.8fr)] gap-2 sm:grid-cols-[1fr_150px]">
              <DatePicker
                value={form.reminder_custom.slice(0, 10)}
                weekStart={preferences?.week_start ?? 1}
                aria-label="Reminder date"
                placeholder="Pick a day"
                clearable={false}
                onChange={(iso) =>
                  setForm((f) => ({ ...f, reminder_custom: `${iso}T${f.reminder_custom.slice(11, 16) || '09:00'}` }))
                }
              />
              <TimePicker
                value={form.reminder_custom.slice(11, 16)}
                aria-label="Reminder time"
                placeholder="Pick a time"
                clearable={false}
                onChange={(t) =>
                  setForm((f) => ({ ...f, reminder_custom: `${f.reminder_custom.slice(0, 10) || toISODate(new Date())}T${t}` }))
                }
              />
            </div>
          )}
          {!preferences?.reminders_enabled && form.reminder !== 'none' && (
            <p className="mt-1.5 text-[12px] text-warning">Reminders are turned off in Settings → Notifications.</p>
          )}
          <FieldError>{errors.reminder}</FieldError>
        </div>
        <FieldError>{errors.form || errors.non_field_errors || errors.detail}</FieldError>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
