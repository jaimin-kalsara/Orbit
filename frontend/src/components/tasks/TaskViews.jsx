import { useEffect, useState } from 'react'
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react'
import { ChevronRight, Plus } from 'lucide-react'
import { useApp } from '../../store/context'
import { cn } from '../../lib/utils'
import { DragHandle, TaskCard, TaskRow } from './TaskItems'
import { Dot } from '../ui/Controls'
import { useEditor } from './editor-ctx'

/* ---------- List ---------- */
function ReorderRow({ task, onOpen, onCommit, index }) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      as="div"
      value={task}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onCommit}
      className="relative rounded-xl"
      whileDrag={{ zIndex: 10, boxShadow: 'var(--shadow-pop)', backgroundColor: 'var(--surface-2)' }}
    >
      <TaskRow
        task={task}
        onOpen={onOpen}
        index={index}
        inReorder
        dragHandle={<DragHandle onPointerDown={(e) => controls.start(e)} />}
      />
    </Reorder.Item>
  )
}

export function ListView({ open, done, onOpen, reorderable, groups }) {
  const { reorderTasks } = useApp()
  const [order, setOrder] = useState(open)
  useEffect(() => setOrder(open), [open])

  return (
    <div>
      {groups ? (
        groups.map((g) => (
          <section key={g.key} className="mb-5">
            <GroupHeader title={g.title} count={g.tasks.length} tone={g.tone} />
            <AnimatePresence initial={false}>
              {g.tasks.map((t, i) => (
                <TaskRow key={t.id} task={t} onOpen={onOpen} index={i} />
              ))}
            </AnimatePresence>
          </section>
        ))
      ) : reorderable ? (
        <Reorder.Group as="div" axis="y" values={order} onReorder={setOrder} className="flex flex-col">
          {order.map((t, i) => (
            <ReorderRow key={t.id} task={t} onOpen={onOpen} index={i} onCommit={() => reorderTasks(order.map((x) => x.id))} />
          ))}
        </Reorder.Group>
      ) : (
        <AnimatePresence initial={false}>
          {open.map((t, i) => (
            <TaskRow key={t.id} task={t} onOpen={onOpen} index={i} />
          ))}
        </AnimatePresence>
      )}
      {done.length > 0 && <CompletedSection tasks={done} onOpen={onOpen} />}
    </div>
  )
}

function GroupHeader({ title, count, tone }) {
  return (
    <div className="sticky top-0 z-[1] mb-1 flex items-center gap-2 bg-bg/90 px-3 py-2 backdrop-blur-sm">
      <h3 className={cn('text-[12.5px] font-semibold', tone === 'danger' ? 'text-danger' : 'text-ink-2')}>{title}</h3>
      <span className="font-mono text-[11px] text-ink-3 tabular">{count}</span>
    </div>
  )
}

function CompletedSection({ tasks, onOpen }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <section className="mt-4">
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="pressable flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium text-ink-3 hover:text-ink-2"
      >
        <ChevronRight className={cn('size-3.5 transition-transform duration-200', expanded && 'rotate-90')} />
        Completed
        <span className="font-mono text-[11px] tabular">{tasks.length}</span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <AnimatePresence initial={false}>
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} onOpen={onOpen} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ---------- Grid ---------- */
export function GridView({ tasks, onOpen }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence initial={false}>
        {tasks.map((t, i) => (
          <TaskCard key={t.id} task={t} onOpen={onOpen} index={i} />
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ---------- Kanban ---------- */
export function KanbanView({ tasks, onOpen, defaults }) {
  const { statuses, updateTask } = useApp()
  const { openEditor } = useEditor()
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)

  const onDrop = (statusId) => {
    const task = tasks.find((t) => t.id === dragId)
    setOverCol(null)
    setDragId(null)
    if (task && task.status !== statusId) updateTask(task.id, { status: statusId })
  }

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:snap-none lg:px-0">
      {statuses.map((status) => {
        const colTasks = tasks.filter((t) => t.status === status.id)
        const isOver = overCol === status.id
        return (
          <section
            key={status.id}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (overCol !== status.id) setOverCol(status.id)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setOverCol(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              onDrop(status.id)
            }}
            className={cn(
              'flex w-[82vw] max-w-[320px] shrink-0 snap-start flex-col rounded-2xl bg-surface-2/60 p-2 ring-1 ring-inset transition-[box-shadow,background-color] duration-150 sm:w-[300px]',
              isOver ? 'bg-surface-2 ring-accent/50' : 'ring-line',
            )}
          >
            <header className="flex items-center gap-2 px-2 pt-1 pb-2.5">
              <Dot color={status.color} />
              <h3 className="text-[13px] font-semibold text-ink">{status.name}</h3>
              <span className="font-mono text-[11px] text-ink-3 tabular">{colTasks.length}</span>
              <button
                aria-label={`Add task to ${status.name}`}
                onClick={() => openEditor(null, { ...defaults, status: status.id })}
                className="pressable ml-auto grid size-7 place-items-center rounded-lg text-ink-3 hover:bg-surface-3 hover:text-ink"
              >
                <Plus className="size-4" />
              </button>
            </header>
            <div className="flex min-h-24 flex-col gap-2">
              <AnimatePresence initial={false}>
                {colTasks.map((t, i) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', String(t.id))
                      setDragId(t.id)
                    }}
                    onDragEnd={() => {
                      setDragId(null)
                      setOverCol(null)
                    }}
                    className={cn('transition-opacity duration-150', dragId === t.id && 'opacity-40')}
                  >
                    <TaskCard task={t} onOpen={onOpen} index={i} hideStatus />
                  </div>
                ))}
              </AnimatePresence>
              {colTasks.length === 0 && (
                <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-line-strong py-8 text-[12px] text-ink-3">
                  {isOver ? 'Drop here' : 'Nothing here'}
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
