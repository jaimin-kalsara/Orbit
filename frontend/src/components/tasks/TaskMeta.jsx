import { AlarmClock, CalendarDays, MoreHorizontal, Pencil, Trash2, Sunrise, CalendarClock, Flag, CircleDashed } from 'lucide-react'
import { useApp } from '../../store/context'
import { addDays, cn, formatDue, isOverdue, toISODate } from '../../lib/utils'
import { iconFor } from '../../lib/icons'
import { Dot, Pill } from '../ui/Controls'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../ui/Menu'

/** Due date, priority, category & project chips shown under a task title. */
export function TaskMeta({ task, done, showStatus = false, className }) {
  const { priorityById, categoryById, projectById, statusById } = useApp()
  const priority = priorityById[task.priority]
  const category = categoryById[task.category]
  const project = projectById[task.project]
  const status = statusById[task.status]
  const overdue = isOverdue(task, done)
  const CatIcon = category ? iconFor(category.icon) : null

  const items = []
  if (task.due_date)
    items.push(
      <span
        key="due"
        className={cn(
          'inline-flex items-center gap-1 tabular',
          overdue ? 'font-medium text-danger' : task.due_date === toISODate(new Date()) && !done ? 'text-accent-ink' : '',
        )}
      >
        <CalendarDays className="size-3" />
        {formatDue(task.due_date, task.due_time)}
      </span>,
    )
  if (task.reminder_at && !task.reminder_sent && !done)
    items.push(
      <span key="rem" className="inline-flex items-center" title={`Reminder ${new Date(task.reminder_at).toLocaleString()}`}>
        <AlarmClock className="size-3" />
      </span>,
    )
  if (showStatus && status && status.kind !== 'done')
    items.push(
      <span key="st" className="inline-flex items-center gap-1.5">
        <Dot color={status.color} className="size-1.5" />
        {status.name}
      </span>,
    )
  if (category)
    items.push(
      <span key="cat" className="inline-flex min-w-0 items-center gap-1">
        <CatIcon className="size-3 shrink-0" style={{ color: category.color }} />
        <span className="truncate">{category.name}</span>
      </span>,
    )
  if (project)
    items.push(
      <span key="proj" className="inline-flex min-w-0 items-center gap-1">
        <span className="size-2 shrink-0 rounded-[3px]" style={{ background: project.color }} />
        <span className="truncate">{project.name}</span>
      </span>,
    )

  if (!items.length && !priority) return null
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3', className)}>
      {priority && priority.level >= 2 && (
        <Pill color={priority.color} className="h-[19px] px-1.5 text-[11px]">
          <Flag className="size-2.5" strokeWidth={2.5} />
          {priority.name}
        </Pill>
      )}
      {items}
    </div>
  )
}

/** The "…" quick-actions menu shared by rows, cards and kanban cards. */
export function TaskActions({ task, onEdit, className }) {
  const { statuses, priorities, updateTask, deleteTask } = useApp()
  const today = toISODate(new Date())
  return (
    <Menu
      width="w-60"
      trigger={(props) => (
        <button
          {...props}
          aria-label="Task actions"
          className={cn(
            'pressable grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-surface-3 hover:text-ink',
            className,
          )}
        >
          <MoreHorizontal className="size-4" />
        </button>
      )}
    >
      <MenuItem icon={Pencil} onSelect={onEdit}>
        Edit task
      </MenuItem>
      <MenuItem icon={Sunrise} onSelect={() => updateTask(task.id, { due_date: today })}>
        Due today
      </MenuItem>
      <MenuItem icon={CalendarClock} onSelect={() => updateTask(task.id, { due_date: toISODate(addDays(new Date(), 1)) })}>
        Due tomorrow
      </MenuItem>
      <MenuSeparator />
      <MenuLabel>Status</MenuLabel>
      {statuses.map((s) => (
        <MenuItem key={s.id} checked={task.status === s.id} onSelect={() => updateTask(task.id, { status: s.id })}>
          <span className="inline-flex items-center gap-2">
            <Dot color={s.color} />
            {s.name}
          </span>
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuLabel>Priority</MenuLabel>
      {priorities.map((p) => (
        <MenuItem key={p.id} checked={task.priority === p.id} onSelect={() => updateTask(task.id, { priority: p.id })}>
          <span className="inline-flex items-center gap-2">
            <Flag className="size-3.5" style={{ color: p.color }} />
            {p.name}
          </span>
        </MenuItem>
      ))}
      <MenuItem checked={task.priority === null} icon={task.priority === null ? undefined : CircleDashed} onSelect={() => updateTask(task.id, { priority: null })}>
        No priority
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Trash2} danger onSelect={() => deleteTask(task)}>
        Delete
      </MenuItem>
    </Menu>
  )
}
