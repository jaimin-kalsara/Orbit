import { useMemo, useRef, useState } from 'react'
import { Link, NavLink, useParams } from 'react-router'
import {
  ArrowUpDown, CalendarClock, CheckCircle2, Columns3, Eye, EyeOff, Filter, Inbox, LayoutGrid, List, Plus,
  Search, Sunrise, Trash2, X,
} from 'lucide-react'
import { useApp } from '../store/context'
import { useEditor } from '../components/tasks/editor-ctx'
import { GridView, KanbanView, ListView } from '../components/tasks/TaskViews'
import { Page, PageHeader } from '../components/layout/AppShell'
import { Segmented, Dot } from '../components/ui/Controls'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../components/ui/Menu'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/Modal'
import { toast } from '../components/ui/Toast'
import { addDays, cn, dayDiff, isOverdue, parseISODate, plural, toISODate, todayISO } from '../lib/utils'
import { iconFor } from '../lib/icons'

const SORTS = [
  { value: 'manual', label: 'Manual' },
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Newest' },
  { value: 'title', label: 'A → Z' },
]

function QuickAdd({ defaults, placeholder }) {
  const { createTask } = useApp()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  async function submit(e) {
    e.preventDefault()
    const title = value.trim()
    if (!title || busy) return
    setBusy(true)
    try {
      await createTask({ title, ...defaults })
      setValue('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
      ref.current?.focus()
    }
  }

  return (
    <form
      onSubmit={submit}
      className="group mb-4 flex h-11 items-center gap-3 rounded-xl bg-surface px-3.5 shadow-card ring-1 ring-line transition-shadow duration-150 focus-within:ring-2 focus-within:ring-accent/60"
    >
      <Plus className="size-4 text-ink-3 group-focus-within:text-accent-ink" strokeWidth={2.25} />
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={200}
        placeholder={placeholder}
        aria-label="Quick add task"
        enterKeyHint="done"
        className="h-full min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
      />
      {value && (
        <span className="hidden text-[11.5px] text-ink-3 sm:block">
          Press <span className="font-mono">Enter</span>
        </span>
      )}
    </form>
  )
}

export default function TasksPage({ scope = 'all' }) {
  const params = useParams()
  const app = useApp()
  const { tasks, preferences, priorityById, categoryById, projectById, isDone, updatePreferences, clearCompleted } = app
  const { openEditor } = useEditor()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('manual')
  const [filters, setFilters] = useState({ priority: null, category: null, status: null })
  const [confirmClear, setConfirmClear] = useState(false)
  const view = preferences?.default_view || 'list'
  const showCompleted = preferences?.show_completed ?? true
  const today = todayISO()

  // ---- Scope ----
  let title = 'All tasks'
  let subtitle
  let defaults = {}
  let scopeFilter = () => true
  let icon = Inbox
  let accentColor
  if (scope === 'today') {
    title = 'Today'
    subtitle = parseISODate(today).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    defaults = { due_date: today }
    scopeFilter = (t) => t.due_date === today || isOverdue(t, isDone(t))
    icon = Sunrise
  } else if (scope === 'upcoming') {
    title = 'Upcoming'
    subtitle = 'Everything scheduled after today'
    defaults = { due_date: toISODate(addDays(new Date(), 1)) }
    scopeFilter = (t) => t.due_date && t.due_date > today
    icon = CalendarClock
  } else if (scope === 'category') {
    const cat = categoryById[Number(params.id)]
    title = cat?.name ?? 'Category'
    defaults = { category: cat?.id }
    scopeFilter = (t) => t.category === cat?.id
    icon = cat ? iconFor(cat.icon) : Inbox
    accentColor = cat?.color
  } else if (scope === 'project') {
    const proj = projectById[Number(params.id)]
    title = proj?.name ?? 'Project'
    subtitle = proj?.description || undefined
    defaults = { project: proj?.id, ...(proj?.category ? { category: proj.category } : {}) }
    scopeFilter = (t) => t.project === proj?.id
    accentColor = proj?.color
  }

  const scoped = useMemo(() => tasks.filter(scopeFilter), [tasks, scope, params.id, isDone]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return scoped.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false
      if (filters.priority !== null && t.priority !== filters.priority) return false
      if (filters.category !== null && t.category !== filters.category) return false
      if (filters.status !== null && t.status !== filters.status) return false
      return true
    })
  }, [scoped, search, filters])

  const sorted = useMemo(() => {
    const list = [...filtered]
    const level = (t) => priorityById[t.priority]?.level ?? 0
    const due = (t) => (t.due_date ? `${t.due_date}T${t.due_time || '99:99'}` : '9999')
    const cmp = {
      manual: (a, b) => a.position - b.position || b.created_at.localeCompare(a.created_at),
      due: (a, b) => due(a).localeCompare(due(b)) || level(b) - level(a),
      priority: (a, b) => level(b) - level(a) || due(a).localeCompare(due(b)),
      created: (a, b) => b.created_at.localeCompare(a.created_at),
      title: (a, b) => a.title.localeCompare(b.title),
    }[sort]
    return list.sort(cmp)
  }, [filtered, sort, priorityById])

  const open = sorted.filter((t) => !isDone(t))
  const done = sorted.filter((t) => isDone(t))
  const visibleForBoard = showCompleted ? sorted : open
  const activeFilters = Object.values(filters).filter((v) => v !== null).length

  // Day groups for "Upcoming" and overdue split for "Today".
  const groups = useMemo(() => {
    if (sort !== 'manual' && sort !== 'due') return null
    if (scope === 'today') {
      const late = open.filter((t) => isOverdue(t, false) && t.due_date < today)
      const rest = open.filter((t) => !late.includes(t))
      if (!late.length) return null
      return [
        { key: 'overdue', title: 'Overdue', tasks: late, tone: 'danger' },
        { key: 'today', title: 'Today', tasks: rest },
      ].filter((g) => g.tasks.length)
    }
    if (scope === 'upcoming') {
      const map = new Map()
      for (const t of [...open].sort((a, b) => a.due_date.localeCompare(b.due_date))) {
        if (!map.has(t.due_date)) map.set(t.due_date, [])
        map.get(t.due_date).push(t)
      }
      return [...map.entries()].map(([date, list]) => {
        const diff = dayDiff(date, today)
        const d = parseISODate(date)
        const label =
          diff === 1
            ? `Tomorrow · ${d.toLocaleDateString([], { weekday: 'long' })}`
            : d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
        return { key: date, title: label, tasks: list }
      })
    }
    return null
  }, [open, scope, sort, today])

  const HeaderIcon = icon
  const empty = scoped.length === 0
  const noResults = !empty && sorted.length === 0

  return (
    <Page>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {scope === 'project' ? (
              <span className="size-3.5 rounded-[4px]" style={{ background: accentColor }} />
            ) : (
              <HeaderIcon className="size-6 text-ink-3" style={accentColor ? { color: accentColor } : undefined} strokeWidth={1.75} />
            )}
            {title}
          </span>
        }
        subtitle={subtitle ?? `${plural(scoped.filter((t) => !isDone(t)).length, 'open task')}`}
        actions={
          <Button variant="primary" onClick={() => openEditor(null, defaults)} className="hidden md:inline-flex">
            <Plus className="size-4" strokeWidth={2.5} /> New task
          </Button>
        }
      />

      <ScopeChips />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-48">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks"
            type="search"
            enterKeyHint="search"
            className="h-9 w-full rounded-[10px] bg-surface-2 pr-8 pl-9 text-ink ring-1 ring-inset ring-line outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-accent/60"
          />
          {search && (
            <button aria-label="Clear search" onClick={() => setSearch('')} className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-ink-3 hover:text-ink">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <FilterMenu filters={filters} setFilters={setFilters} active={activeFilters} hideCategory={scope === 'category'} />

        <Menu
          width="w-44"
          trigger={(props) => (
            <Button {...props} variant="secondary" size="md" aria-label="Sort">
              <ArrowUpDown className="size-4 text-ink-3" />
              <span className="hidden sm:inline">{SORTS.find((s) => s.value === sort).label}</span>
            </Button>
          )}
        >
          <MenuLabel>Sort by</MenuLabel>
          {SORTS.map((s) => (
            <MenuItem key={s.value} checked={sort === s.value} onSelect={() => setSort(s.value)}>
              {s.label}
            </MenuItem>
          ))}
        </Menu>

        <Button
          variant="secondary"
          size="icon"
          aria-label={showCompleted ? 'Hide completed' : 'Show completed'}
          title={showCompleted ? 'Hide completed' : 'Show completed'}
          onClick={() => updatePreferences({ show_completed: !showCompleted })}
        >
          {showCompleted ? <Eye className="size-4 text-ink-2" /> : <EyeOff className="size-4 text-ink-3" />}
        </Button>

        <Segmented
          value={view}
          onChange={(v) => updatePreferences({ default_view: v })}
          layoutId="view-switch"
          options={[
            { value: 'list', label: 'List', icon: List, iconOnly: true },
            { value: 'grid', label: 'Grid', icon: LayoutGrid, iconOnly: true },
            { value: 'kanban', label: 'Board', icon: Columns3, iconOnly: true },
          ]}
        />
      </div>

      {view !== 'kanban' && <QuickAdd defaults={defaults} placeholder={scope === 'today' ? 'Add a task for today…' : `Add a task${scope === 'category' || scope === 'project' ? ` to ${title}` : ''}…`} />}

      {empty ? (
        <EmptyState
          icon={scope === 'today' ? CheckCircle2 : HeaderIcon}
          title={scope === 'today' ? 'A clear day' : scope === 'upcoming' ? 'Nothing scheduled yet' : 'No tasks here yet'}
          description={
            scope === 'today'
              ? 'Nothing due today. Add something, or enjoy the space.'
              : 'Capture what’s on your mind — it takes a second.'
          }
          action={
            <Button variant="primary" onClick={() => openEditor(null, defaults)}>
              <Plus className="size-4" strokeWidth={2.5} /> Add task
            </Button>
          }
        />
      ) : noResults ? (
        <EmptyState
          compact
          icon={Search}
          title="No matching tasks"
          description="Try a different search or clear your filters."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('')
                setFilters({ priority: null, category: null, status: null })
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : view === 'kanban' ? (
        <KanbanView tasks={visibleForBoard} onOpen={(t) => openEditor(t)} defaults={defaults} />
      ) : view === 'grid' ? (
        <GridView tasks={visibleForBoard} onOpen={(t) => openEditor(t)} />
      ) : (
        <div className="-mx-3">
          {open.length === 0 && done.length > 0 && (
            <EmptyState compact icon={CheckCircle2} title="All done" description="Every task in this view is complete." />
          )}
          <ListView
            open={open}
            done={showCompleted ? done : []}
            onOpen={(t) => openEditor(t)}
            reorderable={sort === 'manual' && !search && !activeFilters && !groups}
            groups={groups}
          />
        </div>
      )}

      {done.length > 0 && showCompleted && view === 'list' && (
        <div className="mt-6 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
            <Trash2 className="size-3.5" /> Clear all completed
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear completed tasks?"
        description="This permanently deletes every completed task across all views. Your statistics history for them will be lost."
        confirmLabel="Delete completed"
        onConfirm={async () => {
          try {
            const n = await clearCompleted()
            toast.success(`Cleared ${plural(n, 'task')}`)
          } catch (err) {
            toast.error(err.message)
          }
          setConfirmClear(false)
        }}
      />
    </Page>
  )
}

function FilterMenu({ filters, setFilters, active, hideCategory }) {
  const { priorities, categories, statuses } = useApp()
  const toggle = (key, id) => setFilters((f) => ({ ...f, [key]: f[key] === id ? null : id }))
  return (
    <Menu
      width="w-60"
      trigger={(props) => (
        <Button {...props} variant="secondary" aria-label="Filter">
          <Filter className={cn('size-4', active ? 'text-accent-ink' : 'text-ink-3')} />
          <span className="hidden sm:inline">Filter</span>
          {active > 0 && <span className="grid size-5 place-items-center rounded-full bg-accent font-mono text-[10.5px] font-semibold text-accent-fg">{active}</span>}
        </Button>
      )}
    >
      <MenuLabel>Status</MenuLabel>
      {statuses.map((s) => (
        <MenuItem key={s.id} keepOpen checked={filters.status === s.id} onSelect={() => toggle('status', s.id)}>
          <span className="inline-flex items-center gap-2">
            <Dot color={s.color} />
            {s.name}
          </span>
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuLabel>Priority</MenuLabel>
      {priorities.map((p) => (
        <MenuItem key={p.id} keepOpen checked={filters.priority === p.id} onSelect={() => toggle('priority', p.id)}>
          <span className="inline-flex items-center gap-2">
            <Dot color={p.color} />
            {p.name}
          </span>
        </MenuItem>
      ))}
      {!hideCategory && (
        <>
          <MenuSeparator />
          <MenuLabel>Category</MenuLabel>
          {categories.map((c) => (
            <MenuItem key={c.id} keepOpen checked={filters.category === c.id} onSelect={() => toggle('category', c.id)}>
              <span className="inline-flex items-center gap-2">
                <Dot color={c.color} />
                {c.name}
              </span>
            </MenuItem>
          ))}
        </>
      )}
      {active > 0 && (
        <>
          <MenuSeparator />
          <MenuItem icon={X} onSelect={() => setFilters({ priority: null, category: null, status: null })}>
            Clear filters
          </MenuItem>
        </>
      )}
    </Menu>
  )
}

/** Horizontal scope switcher — the way to reach categories & projects on phones. */
function ScopeChips() {
  const { categories, projects } = useApp()
  const chip = ({ isActive }) =>
    cn(
      'pressable inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium ring-1 ring-inset',
      isActive ? 'bg-ink text-bg ring-ink' : 'text-ink-2 ring-line hover:bg-surface-2',
    )
  return (
    <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden" style={{ scrollbarWidth: 'none' }}>
      <NavLink to="/tasks" end className={chip}>All</NavLink>
      <NavLink to="/tasks/today" className={chip}>Today</NavLink>
      <NavLink to="/tasks/upcoming" className={chip}>Upcoming</NavLink>
      {categories.map((c) => (
        <NavLink key={`c${c.id}`} to={`/category/${c.id}`} className={chip}>
          <Dot color={c.color} className="size-1.5" />
          {c.name}
        </NavLink>
      ))}
      {projects.filter((p) => !p.is_archived).map((p) => (
        <NavLink key={`p${p.id}`} to={`/project/${p.id}`} className={chip}>
          <span className="size-2 rounded-[2px]" style={{ background: p.color }} />
          {p.name}
        </NavLink>
      ))}
      <Link to="/settings/categories" className="inline-flex h-8 shrink-0 items-center px-2 text-[12.5px] text-ink-3">
        Manage
      </Link>
    </div>
  )
}
