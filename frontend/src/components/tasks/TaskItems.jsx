import { forwardRef } from 'react'
import { motion } from 'motion/react'
import { GripVertical } from 'lucide-react'
import { useApp } from '../../store/context'
import { cn } from '../../lib/utils'
import { TaskCheckbox } from './TaskCheckbox'
import { TaskActions, TaskMeta } from './TaskMeta'

export const itemMotion = {
  layout: 'position',
  initial: { opacity: 0, transform: 'translateY(6px)' },
  animate: { opacity: 1, transform: 'translateY(0px)' },
  exit: { opacity: 0, transform: 'scale(0.98)', transition: { duration: 0.14 } },
  transition: { duration: 0.24, ease: [0.23, 1, 0.32, 1] },
}

/** Row used by the list view. */
export const TaskRow = forwardRef(function TaskRow({ task, onOpen, dragHandle, index = 0, inReorder = false }, ref) {
  const { isDone, toggleComplete, priorityById, preferences } = useApp()
  const done = isDone(task)
  const compact = preferences?.density === 'compact'
  const priority = priorityById[task.priority]

  return (
    <motion.div
      ref={ref}
      {...itemMotion}
      layout={inReorder ? false : itemMotion.layout}
      transition={{ ...itemMotion.transition, delay: Math.min(index, 10) * 0.025 }}
      onClick={() => onOpen(task)}
      className={cn(
        'group relative flex cursor-pointer items-start gap-3 rounded-xl px-3 transition-colors duration-150',
        compact ? 'py-2' : 'py-3',
        '[@media(hover:hover)]:hover:bg-surface-2',
      )}
    >
      {dragHandle}
      <div className={cn(compact ? 'pt-px' : 'pt-0.5')}>
        <TaskCheckbox checked={done} onToggle={() => toggleComplete(task)} color={priority?.color} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-[14px] leading-snug [overflow-wrap:anywhere] transition-colors duration-200',
            done ? 'text-ink-3 line-through decoration-ink-3/60' : 'text-ink',
          )}
        >
          {task.title}
        </p>
        {!compact && task.description && !done && (
          <p className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-3 [overflow-wrap:anywhere]">{task.description}</p>
        )}
        <TaskMeta task={task} done={done} showStatus className={compact ? 'mt-0.5' : 'mt-1.5'} />
      </div>
      <div onClick={(e) => e.stopPropagation()} className="opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">
        <TaskActions task={task} onEdit={() => onOpen(task)} />
      </div>
    </motion.div>
  )
})

export function DragHandle({ onPointerDown }) {
  return (
    <button
      aria-label="Drag to reorder"
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      className="-ml-2 mt-0.5 hidden h-6 w-4 shrink-0 cursor-grab touch-none place-items-center text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing sm:grid"
    >
      <GripVertical className="size-3.5" />
    </button>
  )
}

/** Card used by grid and kanban views. */
export function TaskCard({ task, onOpen, index = 0, hideStatus }) {
  const { isDone, toggleComplete, priorityById } = useApp()
  const done = isDone(task)
  const priority = priorityById[task.priority]
  return (
    <motion.div
      {...itemMotion}
      transition={{ ...itemMotion.transition, delay: Math.min(index, 12) * 0.03 }}
      onClick={() => onOpen(task)}
      className="group relative flex cursor-pointer flex-col rounded-xl bg-surface p-3.5 shadow-card ring-1 ring-line transition-[box-shadow,background-color] duration-150 [@media(hover:hover)]:hover:ring-line-strong"
    >
      <div className="flex items-start gap-3">
        <TaskCheckbox checked={done} onToggle={() => toggleComplete(task)} color={priority?.color} size={18} />
        <p
          className={cn(
            'min-w-0 flex-1 text-[13.5px] font-medium leading-snug [overflow-wrap:anywhere]',
            done ? 'text-ink-3 line-through decoration-ink-3/60' : 'text-ink',
          )}
        >
          {task.title}
        </p>
        <div onClick={(e) => e.stopPropagation()} className="-mt-1.5 -mr-1.5">
          <TaskActions task={task} onEdit={() => onOpen(task)} className="size-7" />
        </div>
      </div>
      {task.description && !done && <p className="mt-2 line-clamp-2 pl-[30px] text-[12.5px] text-ink-3 [overflow-wrap:anywhere]">{task.description}</p>}
      <TaskMeta task={task} done={done} showStatus={!hideStatus} className="mt-3 pl-[30px]" />
    </motion.div>
  )
}
