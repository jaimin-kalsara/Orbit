import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Reorder, motion, useDragControls } from 'motion/react'
import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, Flame, GripVertical, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useApp } from '../store/context'
import { useEditor } from '../components/tasks/editor-ctx'
import { Page } from '../components/layout/AppShell'
import { ProgressRing, Switch } from '../components/ui/Controls'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { BarChart, ShareBars } from '../components/charts/BarChart'
import { TaskCheckbox } from '../components/tasks/TaskCheckbox'
import { TaskMeta } from '../components/tasks/TaskMeta'
import { addDays, cn, greeting, isOverdue, plural, startOfWeek, toISODate, todayISO } from '../lib/utils'

export const WIDGETS = {
  today: { title: 'Daily goal', description: 'Progress ring towards your daily goal', span: 'lg:col-span-5' },
  summary: { title: 'Overview', description: 'Open, in progress, overdue and completion rate', span: 'lg:col-span-7' },
  focus: { title: 'Up next', description: 'The most pressing open tasks', span: 'lg:col-span-7' },
  weekly: { title: 'This week', description: 'Tasks completed each day this week', span: 'lg:col-span-5' },
  overdue: { half: true, title: 'Overdue', description: 'Open tasks past their due date', span: 'lg:col-span-6' },
  upcoming: { half: true, title: 'Next 7 days', description: 'What’s scheduled this week', span: 'lg:col-span-6' },
  categories: { half: true, title: 'Categories', description: 'Done vs. total per category', span: 'lg:col-span-6' },
  priorities: { half: true, title: 'Open by priority', description: 'Where your open work sits', span: 'lg:col-span-6' },
}

/* ---------- Client-side derived stats (instant, no extra requests) ---------- */
function useDashboardData() {
  const { tasks, isDone, preferences, priorityById, categories, priorities, statusById } = useApp()
  return useMemo(() => {
    const today = todayISO()
    const goal = preferences?.daily_goal ?? 5
    const open = tasks.filter((t) => !isDone(t))
    const doneTasks = tasks.filter((t) => isDone(t))
    const completedOn = (iso) => doneTasks.filter((t) => t.completed_at && toISODate(new Date(t.completed_at)) === iso).length

    const days = new Set(doneTasks.filter((t) => t.completed_at).map((t) => toISODate(new Date(t.completed_at))))
    let streak = 0
    let cursor = days.has(today) ? new Date() : addDays(new Date(), -1)
    while (days.has(toISODate(cursor))) {
      streak++
      cursor = addDays(cursor, -1)
    }

    const ws = startOfWeek(new Date(), preferences?.week_start ?? 1)
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i)
      const iso = toISODate(d)
      return {
        key: iso,
        label: d.toLocaleDateString([], { weekday: 'narrow' }),
        tooltip: d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
        value: completedOn(iso),
        highlight: iso === today,
        future: iso > today,
      }
    })

    const level = (t) => priorityById[t.priority]?.level ?? 0
    const due = (t) => (t.due_date ? `${t.due_date}T${t.due_time || '23:59'}` : '9999')
    const focus = [...open]
      .sort(
        (a, b) =>
          Number(isOverdue(b, false)) - Number(isOverdue(a, false)) ||
          Number(statusById[b.status]?.kind === 'in_progress') - Number(statusById[a.status]?.kind === 'in_progress') ||
          due(a).localeCompare(due(b)) ||
          level(b) - level(a),
      )
      .slice(0, 5)

    const in7 = toISODate(addDays(new Date(), 7))
    return {
      goal,
      completedToday: completedOn(today),
      streak,
      week,
      open: open.length,
      inProgress: open.filter((t) => statusById[t.status]?.kind === 'in_progress').length,
      overdueList: open.filter((t) => isOverdue(t, false)).sort((a, b) => due(a).localeCompare(due(b))),
      upcoming: open.filter((t) => t.due_date && t.due_date > today && t.due_date <= in7).sort((a, b) => due(a).localeCompare(due(b))),
      completionRate: tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0,
      total: tasks.length,
      dueToday: open.filter((t) => t.due_date === today).length,
      focus,
      byCategory: categories
        .map((c) => {
          const list = tasks.filter((t) => t.category === c.id)
          return { key: c.id, label: c.name, color: c.color, total: list.length, done: list.filter(isDone).length }
        })
        .filter((r) => r.total > 0)
        .sort((a, b) => b.total - a.total),
      byPriority: priorities
        .map((p) => {
          const list = tasks.filter((t) => t.priority === p.id)
          return { key: p.id, label: p.name, color: p.color, total: list.length, done: list.filter(isDone).length }
        })
        .filter((r) => r.total > 0)
        .sort((a, b) => b.total - a.total),
    }
  }, [tasks, isDone, preferences, priorityById, categories, priorities, statusById])
}

/* ---------- Widget frame ---------- */
function Card({ title, action, children, className, index = 0, flush = false }) {
  return (
    <motion.section
      initial={{ opacity: 0, transform: 'translateY(8px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
      className={cn('flex h-full flex-col rounded-2xl bg-surface shadow-card ring-1 ring-line', flush ? 'overflow-hidden' : 'p-4 sm:p-5', className)}
    >
      {title && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </motion.section>
  )
}

const SeeAll = ({ to, label = 'View all' }) => (
  <Link to={to} className="group inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-3 hover:text-ink">
    {label}
    <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
  </Link>
)

function MiniTaskList({ tasks, empty }) {
  const { toggleComplete, isDone, priorityById } = useApp()
  const { openEditor } = useEditor()
  if (!tasks.length) return empty
  return (
    <ul className="-mx-2 flex flex-col">
      {tasks.map((t) => (
        <li
          key={t.id}
          onClick={() => openEditor(t)}
          className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors duration-150 [@media(hover:hover)]:hover:bg-surface-2"
        >
          <TaskCheckbox checked={isDone(t)} onToggle={() => toggleComplete(t)} color={priorityById[t.priority]?.color} size={18} />
          <div className="min-w-0 flex-1">
            <p className={cn('truncate text-[13.5px]', isDone(t) ? 'text-ink-3 line-through' : 'text-ink')}>{t.title}</p>
            <TaskMeta task={t} done={isDone(t)} className="mt-1" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ---------- Widgets ---------- */
function TodayWidget({ d, index }) {
  const pct = d.goal ? d.completedToday / d.goal : 0
  const hit = d.completedToday >= d.goal
  return (
    <Card index={index}>
      <div className="flex items-center gap-5">
        <ProgressRing value={pct} size={96} stroke={8}>
          <div className="text-center">
            <div className="text-[22px] leading-none font-semibold tracking-tight text-ink tabular">{d.completedToday}</div>
            <div className="mt-1 font-mono text-[10.5px] text-ink-3">of {d.goal}</div>
          </div>
        </ProgressRing>
        <div className="min-w-0">
          <h2 className="text-[13.5px] font-semibold text-ink">Daily goal</h2>
          <p className="mt-1 text-[13px] text-ink-2">
            {hit ? 'Goal reached. Anything else is a bonus.' : `${plural(d.goal - d.completedToday, 'task')} to go today.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-surface-2 px-2 text-[12px] font-medium text-ink-2 ring-1 ring-inset ring-line">
              <Flame className={cn('size-3.5', d.streak > 0 ? 'text-warning' : 'text-ink-3')} />
              {plural(d.streak, 'day')} streak
            </span>
            <Link to="/tasks/today" className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-ink-3 hover:text-ink">
              {plural(d.dueToday, 'task')} due today <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}

function SummaryWidget({ d, index }) {
  const stats = [
    { label: 'Open', value: d.open, to: '/tasks' },
    { label: 'In progress', value: d.inProgress, to: '/tasks' },
    { label: 'Overdue', value: d.overdueList.length, to: '/tasks/today', tone: d.overdueList.length ? 'text-danger' : '' },
    { label: 'Completion', value: `${d.completionRate}%`, to: '/insights', sub: `${d.total} total` },
  ]
  return (
    <Card index={index} flush>
      <div className="grid h-full grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="flex flex-col justify-between gap-6 bg-surface p-4 transition-colors duration-150 hover:bg-surface-2 sm:p-5"
          >
            <span className="text-[12.5px] font-medium text-ink-3">{s.label}</span>
            <span className={cn('text-[28px] leading-none font-semibold tracking-[-0.03em] text-ink tabular', s.tone)}>{s.value}</span>
          </Link>
        ))}
      </div>
    </Card>
  )
}

function FocusWidget({ d, index }) {
  const { openEditor } = useEditor()
  return (
    <Card index={index} title="Up next" action={<SeeAll to="/tasks" />}>
      <MiniTaskList
        tasks={d.focus}
        empty={
          <EmptyState
            compact
            icon={Sparkles}
            title="Nothing queued"
            description="Add a task and it’ll show up here."
            action={<Button size="sm" variant="primary" onClick={() => openEditor()}>Add task</Button>}
          />
        }
      />
    </Card>
  )
}

function WeeklyWidget({ d, index }) {
  const total = d.week.reduce((a, b) => a + b.value, 0)
  return (
    <Card index={index} title="This week" action={<span className="font-mono text-[12px] text-ink-3 tabular">{plural(total, 'done', 'done')}</span>}>
      <BarChart data={d.week} goal={d.goal} height={150} />
    </Card>
  )
}

function OverdueWidget({ d, index }) {
  return (
    <Card
      index={index}
      title={
        <span className="flex items-center gap-2">
          Overdue
          {d.overdueList.length > 0 && <span className="rounded bg-danger/12 px-1.5 font-mono text-[11px] text-danger">{d.overdueList.length}</span>}
        </span>
      }
      action={d.overdueList.length > 0 && <SeeAll to="/tasks/today" label="Review" />}
    >
      <MiniTaskList
        tasks={d.overdueList.slice(0, 5)}
        empty={<EmptyState compact icon={CheckCircle2} title="You’re all caught up" description="No overdue tasks." />}
      />
    </Card>
  )
}

function UpcomingWidget({ d, index }) {
  return (
    <Card index={index} title="Next 7 days" action={<SeeAll to="/tasks/upcoming" />}>
      <MiniTaskList
        tasks={d.upcoming.slice(0, 5)}
        empty={<EmptyState compact icon={CalendarClock} title="Nothing scheduled" description="Tasks with due dates this week land here." />}
      />
    </Card>
  )
}

function CategoriesWidget({ d, index }) {
  return (
    <Card index={index} title="Categories" action={<SeeAll to="/settings/categories" label="Manage" />}>
      <ShareBars rows={d.byCategory} emptyLabel="Assign categories to tasks to see the split." />
    </Card>
  )
}

function PrioritiesWidget({ d, index }) {
  return (
    <Card index={index} title="By priority">
      <ShareBars rows={d.byPriority} emptyLabel="No prioritized tasks yet." />
    </Card>
  )
}

const RENDER = {
  today: TodayWidget,
  summary: SummaryWidget,
  focus: FocusWidget,
  weekly: WeeklyWidget,
  overdue: OverdueWidget,
  upcoming: UpcomingWidget,
  categories: CategoriesWidget,
  priorities: PrioritiesWidget,
}

/* ---------- Customize dialog ---------- */
function WidgetRow({ item, onToggle }) {
  const controls = useDragControls()
  const meta = WIDGETS[item.id]
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="relative flex items-center gap-3 rounded-xl bg-surface px-2 ring-1 ring-line"
      whileDrag={{ boxShadow: 'var(--shadow-pop)', zIndex: 10 }}
    >
      <button
        aria-label={`Drag ${meta.title}`}
        onPointerDown={(e) => controls.start(e)}
        className="grid h-10 w-6 cursor-grab touch-none place-items-center text-ink-3 active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex-1">
        <Switch checked={item.visible} onChange={onToggle} label={meta.title} description={meta.description} />
      </div>
    </Reorder.Item>
  )
}

function CustomizeDialog({ open, onClose }) {
  const { preferences, updatePreferences } = useApp()
  const [items, setItems] = useState(preferences.dashboard_widgets)
  const [saving, setSaving] = useState(false)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Customize dashboard"
      description="Drag to reorder. Toggle to show or hide."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={saving}
            onClick={async () => {
              setSaving(true)
              try {
                await updatePreferences({ dashboard_widgets: items })
                onClose()
              } finally {
                setSaving(false)
              }
            }}
          >
            Save layout
          </Button>
        </>
      }
    >
      <Reorder.Group axis="y" values={items} onReorder={setItems} className="flex flex-col gap-2">
        {items.map((item) => (
          <WidgetRow
            key={item.id}
            item={item}
            onToggle={(v) => setItems((list) => list.map((x) => (x.id === item.id ? { ...x, visible: v } : x)))}
          />
        ))}
      </Reorder.Group>
    </Modal>
  )
}

export default function Dashboard() {
  const { user, preferences } = useApp()
  const d = useDashboardData()
  const [customizing, setCustomizing] = useState(false)
  const widgets = (preferences?.dashboard_widgets || []).filter((w) => w.visible && RENDER[w.id])
  const firstName = (user?.name || '').split(' ')[0]

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-ink-3">
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-ink sm:text-[28px]">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-3">
            {d.overdueList.length > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <CircleAlert className="size-3.5 text-danger" />
                {plural(d.overdueList.length, 'task')} overdue · {plural(d.dueToday, 'task')} due today
              </span>
            ) : d.dueToday > 0 ? (
              `${plural(d.dueToday, 'task')} due today.`
            ) : (
              'Nothing due today. Plan ahead or pick something from your list.'
            )}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setCustomizing(true)}>
          <SlidersHorizontal className="size-4 text-ink-3" /> Customize
        </Button>
      </div>

      {widgets.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="Your dashboard is empty"
          description="All widgets are hidden. Turn some back on to see your day at a glance."
          action={<Button variant="primary" onClick={() => setCustomizing(true)}>Choose widgets</Button>}
        />
      ) : (
        <div className="grid grid-flow-row-dense grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
          {widgets.map((w, i) => {
            const Comp = RENDER[w.id]
            return (
              <div key={w.id} className={cn('min-w-0', WIDGETS[w.id].half ? 'md:col-span-1' : 'md:col-span-2', WIDGETS[w.id].span)}>
                <Comp d={d} index={i} />
              </div>
            )
          })}
        </div>
      )}

      {customizing && <CustomizeDialog open={customizing} onClose={() => setCustomizing(false)} />}
    </Page>
  )
}
