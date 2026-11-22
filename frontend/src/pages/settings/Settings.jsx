import { useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, useNavigate, useParams } from 'react-router'
import { Reorder, useDragControls } from 'motion/react'
import {
  Bell, Check, Columns3, GripVertical, LayoutDashboard, LayoutGrid, List, Monitor, Moon, Palette, Shield,
  SlidersHorizontal, Sun, Tags, Workflow as WorkflowIcon, FolderKanban, Archive, ArchiveRestore, Volume2,
} from 'lucide-react'
import { useApp } from '../../store/context'
import { api, post } from '../../lib/api'
import { ACCENTS, WEEKDAYS, cn, plural, readableOn } from '../../lib/utils'
import { CATEGORY_ICONS, iconFor } from '../../lib/icons'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { FieldError, Input, Label, Select } from '../../components/ui/Field'
import { ColorPicker, Segmented, Switch } from '../../components/ui/Controls'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { Menu } from '../../components/ui/Menu'
import { toast } from '../../components/ui/Toast'
import { TaxonomyEditor } from './TaxonomyEditor'
import { WIDGETS } from '../Dashboard'
import { chime } from '../../hooks/useReminders'

const SECTIONS = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'workflow', label: 'Statuses & priorities', icon: WorkflowIcon },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account', icon: Shield },
]

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-line sm:p-6">
      <header className="mb-4">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-ink-3">{description}</p>}
      </header>
      {children}
    </section>
  )
}

const Divider = () => <div className="h-px bg-line" />

/* ---------- General ---------- */
function General() {
  const { user, preferences: p, updatePreferences, updateUser } = useApp()
  const [name, setName] = useState(user.name)
  const [goal, setGoal] = useState(p.daily_goal)
  useEffect(() => setGoal(p.daily_goal), [p.daily_goal])

  return (
    <div className="space-y-4">
      <Section title="Profile">
        <Label htmlFor="name">Display name</Label>
        <div className="flex gap-2">
          <Input id="name" value={name} maxLength={150} onChange={(e) => setName(e.target.value)} />
          <Button
            disabled={!name.trim() || name.trim() === user.name}
            onClick={() =>
              updateUser({ name: name.trim() })
                .then(() => toast.success('Name updated'))
                .catch((e) => toast.error(e.message))
            }
          >
            Save
          </Button>
        </div>
      </Section>

      <Section title="Productivity" description="Shapes your dashboard, goal ring and insights.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="goal" hint="1–50 tasks">Daily goal</Label>
            <div className="flex items-center gap-2">
              <Button size="icon" aria-label="Decrease goal" onClick={() => setGoal((g) => Math.max(1, g - 1))}>−</Button>
              <Input
                id="goal"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value))}
                className="text-center tabular"
              />
              <Button size="icon" aria-label="Increase goal" onClick={() => setGoal((g) => Math.min(50, g + 1))}>+</Button>
            </div>
            {goal !== p.daily_goal && goal >= 1 && goal <= 50 && (
              <Button variant="primary" size="sm" className="mt-2" onClick={() => updatePreferences({ daily_goal: goal }).then(() => toast.success('Daily goal saved'))}>
                Save goal
              </Button>
            )}
          </div>
          <div>
            <Label htmlFor="ws">Week starts on</Label>
            <Select id="ws" value={p.week_start} onChange={(e) => updatePreferences({ week_start: Number(e.target.value) })}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Task view" description="How task lists open by default. You can also switch from any list.">
        <Segmented
          value={p.default_view}
          onChange={(v) => updatePreferences({ default_view: v })}
          layoutId="settings-view"
          className="w-full sm:w-auto"
          options={[
            { value: 'list', label: 'List', icon: List },
            { value: 'grid', label: 'Grid', icon: LayoutGrid },
            { value: 'kanban', label: 'Kanban', icon: Columns3 },
          ]}
        />
        <div className="mt-2">
          <Switch
            checked={p.show_completed}
            onChange={(v) => updatePreferences({ show_completed: v })}
            label="Show completed tasks"
            description="Keep finished tasks visible in lists and boards."
          />
        </div>
        <p className="mt-1 text-[12.5px] text-ink-3">Time zone: {p.timezone} (detected from your browser)</p>
      </Section>
    </div>
  )
}

/* ---------- Appearance ---------- */
function Appearance() {
  const { preferences: p, updatePreferences } = useApp()
  const themes = [
    { v: 'dark', l: 'Dark', i: Moon, bg: '#09090A', fg: '#1F1F23' },
    { v: 'light', l: 'Light', i: Sun, bg: '#F7F7F8', fg: '#FFFFFF' },
    { v: 'system', l: 'System', i: Monitor, bg: 'linear-gradient(135deg,#09090A 50%,#F7F7F8 50%)', fg: '#888' },
  ]
  const isPreset = ACCENTS.some((a) => a.value.toLowerCase() === p.accent_color.toLowerCase())
  return (
    <div className="space-y-4">
      <Section title="Theme">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {themes.map((t) => {
            const active = p.theme === t.v
            return (
              <button
                key={t.v}
                onClick={() => updatePreferences({ theme: t.v })}
                aria-pressed={active}
                className={cn('pressable rounded-xl p-1.5 text-left ring-1', active ? 'ring-2 ring-accent' : 'ring-line hover:ring-line-strong')}
              >
                <div className="relative h-16 overflow-hidden rounded-lg sm:h-20" style={{ background: t.bg }}>
                  <div className="absolute top-2.5 left-2.5 h-2 w-8 rounded-full opacity-70" style={{ background: t.v === 'light' ? '#D4D4D8' : '#3F3F46' }} />
                  <div className="absolute top-6 left-2.5 h-2 w-12 rounded-full opacity-50" style={{ background: t.v === 'light' ? '#E4E4E7' : '#27272A' }} />
                  <div className="absolute right-2.5 bottom-2.5 size-4 rounded-full" style={{ background: p.accent_color }} />
                </div>
                <div className="flex items-center gap-1.5 px-1 pt-2 pb-0.5 text-[13px] font-medium text-ink">
                  <t.i className="size-3.5 text-ink-3" />
                  {t.l}
                </div>
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Accent color" description="Used for primary actions, progress and highlights.">
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((a) => {
            const active = a.value.toLowerCase() === p.accent_color.toLowerCase()
            return (
              <button
                key={a.value}
                onClick={() => updatePreferences({ accent_color: a.value })}
                aria-pressed={active}
                className={cn('pressable flex h-9 items-center gap-2 rounded-full pr-3.5 pl-1.5 text-[13px] font-medium ring-1', active ? 'bg-surface-2 text-ink ring-line-strong' : 'text-ink-2 ring-line hover:bg-surface-2')}
              >
                <span className="grid size-6 place-items-center rounded-full" style={{ background: a.value }}>
                  {active && <Check className="size-3.5" strokeWidth={3} style={{ color: readableOn(a.value) }} />}
                </span>
                {a.name}
              </button>
            )
          })}
          <label className={cn('pressable relative flex h-9 cursor-pointer items-center gap-2 rounded-full pr-3.5 pl-1.5 text-[13px] font-medium ring-1', !isPreset ? 'bg-surface-2 text-ink ring-line-strong' : 'text-ink-2 ring-line hover:bg-surface-2')}>
            <span className="size-6 rounded-full" style={{ background: !isPreset ? p.accent_color : 'conic-gradient(#f43f5e,#f59e0b,#a3e635,#14b8a6,#3b82f6,#a855f7,#f43f5e)' }} />
            Custom
            <input
              type="color"
              value={p.accent_color}
              onChange={(e) => updatePreferences({ accent_color: e.target.value.toUpperCase() })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </Section>

      <Section title="Interface">
        <Label>Density</Label>
        <Segmented
          value={p.density}
          onChange={(v) => updatePreferences({ density: v })}
          layoutId="density"
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
        <div className="mt-3">
          <Switch
            checked={p.reduce_motion}
            onChange={(v) => updatePreferences({ reduce_motion: v })}
            label="Reduce motion"
            description="Minimize movement in animations. Your system setting is always respected too."
          />
        </div>
      </Section>
    </div>
  )
}

/* ---------- Workflow (statuses + priorities) ---------- */
const KINDS = [
  { value: 'todo', label: 'Open' },
  { value: 'in_progress', label: 'Active' },
  { value: 'done', label: 'Done' },
]

function Workflow() {
  const { statuses, priorities, tasks, deleteItem, updateItem } = useApp()
  const [statusToDelete, setStatusToDelete] = useState(null)
  const [moveTo, setMoveTo] = useState('')
  const [prioToDelete, setPrioToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const count = (field, id) => tasks.filter((t) => t[field] === id).length

  return (
    <div className="space-y-4">
      <Section
        title="Statuses"
        description="Your workflow stages — they become Kanban columns. Each status behaves as Open, Active or Done for tracking."
      >
        <TaxonomyEditor
          kind="statuses"
          items={statuses}
          placeholder="New status, e.g. Blocked"
          createDefaults={{ kind: 'todo' }}
          onDelete={(s) => {
            setMoveTo('')
            setStatusToDelete(s)
          }}
          extra={(item, save) => (
            <Menu
              width="w-40"
              trigger={(props) => (
                <button {...props} className="pressable h-7 rounded-md bg-surface-2 px-2 text-[12px] font-medium text-ink-2 ring-1 ring-inset ring-line hover:text-ink">
                  {KINDS.find((k) => k.value === item.kind)?.label}
                </button>
              )}
            >
              {KINDS.map((k) => (
                <MenuItemSimple key={k.value} active={item.kind === k.value} onClick={() => save({ kind: k.value })}>
                  {k.label}
                </MenuItemSimple>
              ))}
            </Menu>
          )}
        />
      </Section>

      <Section title="Priorities" description="Rename, recolor and reorder. Ordered from lowest to highest importance.">
        <TaxonomyEditor
          kind="priorities"
          items={priorities}
          placeholder="New priority, e.g. Critical"
          createDefaults={{ level: priorities.length + 1 }}
          onDelete={setPrioToDelete}
          onReordered={(order) =>
            order.forEach((p, i) => p.level !== i + 1 && updateItem('priorities', p.id, { level: i + 1 }).catch(() => {}))
          }
        />
      </Section>

      <ConfirmDialog
        open={!!statusToDelete}
        onClose={() => setStatusToDelete(null)}
        title={`Delete “${statusToDelete?.name}”?`}
        description={
          statusToDelete && count('status', statusToDelete.id)
            ? `${plural(count('status', statusToDelete.id), 'task')} use this status. Choose where they go.`
            : 'No tasks use this status.'
        }
        loading={busy}
        onConfirm={async () => {
          setBusy(true)
          try {
            await deleteItem('statuses', statusToDelete.id, { moveTo: moveTo || undefined })
            toast.success('Status deleted')
            setStatusToDelete(null)
          } catch (err) {
            toast.error(err.message)
          } finally {
            setBusy(false)
          }
        }}
      >
        {statusToDelete && count('status', statusToDelete.id) > 0 && (
          <>
            <Label htmlFor="move">Move tasks to</Label>
            <Select id="move" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
              <option value="">Automatic (same type)</option>
              {statuses.filter((s) => s.id !== statusToDelete.id).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </>
        )}
      </ConfirmDialog>

      <DeleteConfirm
        item={prioToDelete}
        kind="priorities"
        noun="priority"
        usage={prioToDelete ? count('priority', prioToDelete.id) : 0}
        onClose={() => setPrioToDelete(null)}
      />
    </div>
  )
}

function MenuItemSimple({ children, active, onClick }) {
  return (
    <button
      role="menuitemradio"
      aria-checked={active}
      onClick={onClick}
      className="flex h-8 w-full items-center justify-between rounded-lg px-2 text-left text-[13px] text-ink hover:bg-surface-3"
    >
      {children}
      {active && <Check className="size-3.5 text-accent-ink" />}
    </button>
  )
}

function DeleteConfirm({ item, kind, noun, usage, onClose }) {
  const { deleteItem } = useApp()
  const [busy, setBusy] = useState(false)
  return (
    <ConfirmDialog
      open={!!item}
      onClose={onClose}
      title={`Delete “${item?.name}”?`}
      description={usage ? `${plural(usage, 'task')} will keep existing, without a ${noun}.` : `No tasks use this ${noun}.`}
      loading={busy}
      onConfirm={async () => {
        setBusy(true)
        try {
          await deleteItem(kind, item.id)
          toast.success(`Deleted “${item.name}”`)
          onClose()
        } catch (err) {
          toast.error(err.message)
        } finally {
          setBusy(false)
        }
      }}
    />
  )
}

/* ---------- Categories ---------- */
function IconButton({ icon, onChange }) {
  const Icon = iconFor(icon)
  return (
    <Menu
      align="end"
      width="w-[220px]"
      trigger={(props) => (
        <button {...props} aria-label="Change icon" className="pressable grid size-8 place-items-center rounded-lg text-ink-2 ring-1 ring-inset ring-line hover:bg-surface-2">
          <Icon className="size-4" />
        </button>
      )}
    >
      <div className="grid grid-cols-5 gap-1 p-1">
        {Object.entries(CATEGORY_ICONS).map(([key, I]) => (
          <button
            key={key}
            aria-label={key}
            onClick={() => onChange(key)}
            className={cn('grid size-9 place-items-center rounded-lg hover:bg-surface-3', key === icon && 'bg-surface-3 text-accent-ink')}
          >
            <I className="size-4" />
          </button>
        ))}
      </div>
    </Menu>
  )
}

function Categories() {
  const { categories, tasks } = useApp()
  const [toDelete, setToDelete] = useState(null)
  return (
    <Section title="Categories" description="Group tasks by area of life. Drag to reorder — the sidebar follows.">
      <TaxonomyEditor
        kind="categories"
        items={categories}
        placeholder="New category, e.g. Side project"
        onDelete={setToDelete}
        extra={(item, save) => <IconButton icon={item.icon} onChange={(icon) => save({ icon })} />}
      />
      <DeleteConfirm
        item={toDelete}
        kind="categories"
        noun="category"
        usage={toDelete ? tasks.filter((t) => t.category === toDelete.id).length : 0}
        onClose={() => setToDelete(null)}
      />
    </Section>
  )
}

/* ---------- Projects ---------- */
function Projects() {
  const { projects, categories, tasks, isDone } = useApp()
  const [toDelete, setToDelete] = useState(null)
  const [editing, setEditing] = useState(null)
  return (
    <Section title="Projects" description="Projects collect related tasks with a shared goal. Archive them when they wrap up.">
      <TaxonomyEditor
        kind="projects"
        items={projects}
        placeholder="New project, e.g. Portfolio launch"
        onDelete={setToDelete}
        extra={(item, save) => {
          const list = tasks.filter((t) => t.project === item.id)
          const done = list.filter(isDone).length
          return (
            <>
              <span className="mr-1 hidden font-mono text-[11.5px] text-ink-3 tabular sm:inline">{done}/{list.length}</span>
              <Button variant="ghost" size="sm" onClick={() => setEditing(item)}>Details</Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={item.is_archived ? 'Unarchive' : 'Archive'}
                title={item.is_archived ? 'Unarchive' : 'Archive'}
                onClick={() => save({ is_archived: !item.is_archived }).then(() => toast(item.is_archived ? 'Project restored' : 'Project archived'))}
                className={item.is_archived ? 'text-warning!' : 'text-ink-3!'}
              >
                {item.is_archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
              </Button>
            </>
          )
        }}
      />
      <ProjectDetails project={editing} categories={categories} onClose={() => setEditing(null)} />
      <DeleteConfirm
        item={toDelete}
        kind="projects"
        noun="project"
        usage={toDelete ? tasks.filter((t) => t.project === toDelete.id).length : 0}
        onClose={() => setToDelete(null)}
      />
    </Section>
  )
}

function ProjectDetails({ project, categories, onClose }) {
  const { updateItem } = useApp()
  const [form, setForm] = useState({ description: '', category: '', color: '#3B82F6' })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (project) setForm({ description: project.description || '', category: project.category ?? '', color: project.color })
  }, [project])
  return (
    <Modal
      open={!!project}
      onClose={onClose}
      title={project?.name}
      description="Project details"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await updateItem('projects', project.id, {
                  description: form.description.trim(),
                  category: form.category ? Number(form.category) : null,
                  color: form.color,
                })
                onClose()
              } catch (err) {
                toast.error(err.message)
              } finally {
                setBusy(false)
              }
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="pd">Description</Label>
          <Input id="pd" maxLength={280} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this project about?" />
        </div>
        <div>
          <Label htmlFor="pc">Category</Label>
          <Select id="pc" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <Label>Color</Label>
          <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
        </div>
      </div>
    </Modal>
  )
}

/* ---------- Dashboard widgets ---------- */
function WidgetItem({ item, onToggle, onDragEnd }) {
  const controls = useDragControls()
  const meta = WIDGETS[item.id]
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="relative flex items-center gap-2 rounded-xl bg-surface px-2 ring-1 ring-line"
      whileDrag={{ boxShadow: 'var(--shadow-pop)', zIndex: 10 }}
    >
      <button aria-label={`Drag ${meta.title}`} onPointerDown={(e) => controls.start(e)} className="grid h-10 w-6 cursor-grab touch-none place-items-center text-ink-3">
        <GripVertical className="size-4" />
      </button>
      <div className="flex-1">
        <Switch checked={item.visible} onChange={onToggle} label={meta.title} description={meta.description} />
      </div>
    </Reorder.Item>
  )
}

function DashboardSettings() {
  const { preferences, updatePreferences } = useApp()
  const [items, setItems] = useState(preferences.dashboard_widgets)
  const itemsRef = useRef(items)
  useEffect(() => {
    setItems(preferences.dashboard_widgets)
    itemsRef.current = preferences.dashboard_widgets
  }, [preferences.dashboard_widgets])
  const reorder = (next) => {
    itemsRef.current = next
    setItems(next)
  }
  return (
    <Section title="Dashboard widgets" description="Choose what your dashboard shows and in what order. Changes save instantly.">
      <Reorder.Group axis="y" values={items} onReorder={reorder} className="flex flex-col gap-2">
        {items.map((item) => (
          <WidgetItem
            key={item.id}
            item={item}
            onDragEnd={() => updatePreferences({ dashboard_widgets: itemsRef.current })}
            onToggle={(v) => {
              const next = items.map((x) => (x.id === item.id ? { ...x, visible: v } : x))
              setItems(next)
              updatePreferences({ dashboard_widgets: next })
            }}
          />
        ))}
      </Reorder.Group>
    </Section>
  )
}

/* ---------- Notifications ---------- */
function Notifications() {
  const { preferences: p, updatePreferences } = useApp()
  const supported = typeof window !== 'undefined' && 'Notification' in window
  const [perm, setPerm] = useState(supported ? Notification.permission : 'unsupported')

  async function toggleBrowser(v) {
    if (v && supported && Notification.permission !== 'granted') {
      const result = await Notification.requestPermission()
      setPerm(result)
      if (result !== 'granted') {
        toast.error('Notifications are blocked by your browser for this site.')
        return
      }
    }
    updatePreferences({ browser_notifications: v })
  }

  return (
    <Section title="Notifications & reminders" description="Reminders fire while Orbit is open in a tab.">
      <Switch checked={p.reminders_enabled} onChange={(v) => updatePreferences({ reminders_enabled: v })} label="Task reminders" description="Show an alert when a task’s reminder time arrives." />
      <Divider />
      <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="block text-[13.5px] font-medium text-ink">Default reminder</span>
          <span className="block text-[12.5px] text-ink-3">Used by “My default” in the task editor.</span>
        </div>
        <Select
          value={p.default_reminder_minutes}
          onChange={(e) => updatePreferences({ default_reminder_minutes: Number(e.target.value) })}
          className="sm:w-48"
          aria-label="Default reminder"
        >
          {[0, 5, 10, 15, 30, 60, 120, 1440].map((m) => (
            <option key={m} value={m}>
              {m === 0 ? 'At due time' : m < 60 ? `${m} minutes before` : m === 1440 ? '1 day before' : `${m / 60} hour${m > 60 ? 's' : ''} before`}
            </option>
          ))}
        </Select>
      </div>
      <Divider />
      <Switch
        checked={p.browser_notifications && perm === 'granted'}
        onChange={toggleBrowser}
        disabled={!supported || !p.reminders_enabled}
        label="System notifications"
        description={!supported ? 'Not supported in this browser.' : perm === 'denied' ? 'Blocked in browser settings for this site.' : 'Also show reminders as OS notifications.'}
      />
      <Divider />
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Switch checked={p.reminder_sound} onChange={(v) => updatePreferences({ reminder_sound: v })} disabled={!p.reminders_enabled} label="Reminder sound" description="Play a soft chime with each reminder." />
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="mt-3"
          aria-label="Preview sound"
          onClick={chime}
        >
          <Volume2 className="size-4" />
        </Button>
      </div>
      <Divider />
      <Switch checked={p.overdue_alerts} onChange={(v) => updatePreferences({ overdue_alerts: v })} label="Overdue summary" description="A gentle nudge about overdue tasks when you open Orbit." />
    </Section>
  )
}

/* ---------- Account ---------- */
function Account() {
  const { user, logout } = useApp()
  const navigate = useNavigate()
  const [pw, setPw] = useState({ current_password: '', new_password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [delPw, setDelPw] = useState('')
  const [delErr, setDelErr] = useState('')

  async function changePassword(e) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      await post('/auth/password/', pw)
      setPw({ current_password: '', new_password: '' })
      toast.success('Password updated')
    } catch (err) {
      const d = err.data || {}
      setErrors({ current: d.current_password?.[0], next: d.new_password?.[0], form: d.detail })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Section title="Account">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[13.5px] font-medium text-ink">{user.email}</div>
            <div className="text-[12.5px] text-ink-3">Member since {new Date(user.date_joined).toLocaleDateString([], { month: 'long', year: 'numeric' })}</div>
          </div>
          <Button variant="secondary" onClick={async () => { await logout(); navigate('/login') }}>
            Log out
          </Button>
        </div>
      </Section>

      <Section title="Change password">
        <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cp">Current password</Label>
            <Input id="cp" type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} invalid={!!errors.current} />
            <FieldError>{errors.current}</FieldError>
          </div>
          <div>
            <Label htmlFor="np" hint="8+ characters">New password</Label>
            <Input id="np" type="password" autoComplete="new-password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} invalid={!!errors.next} />
            <FieldError>{errors.next}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <FieldError>{errors.form}</FieldError>
            <Button type="submit" variant="primary" loading={busy} disabled={!pw.current_password || !pw.new_password}>
              Update password
            </Button>
          </div>
        </form>
      </Section>

      <section className="rounded-2xl p-4 ring-1 ring-danger/30 sm:p-6">
        <h2 className="text-[15px] font-semibold text-danger">Delete account</h2>
        <p className="mt-1 mb-4 text-[13px] text-ink-3">Permanently removes your account, tasks and settings. This can’t be undone.</p>
        <Button variant="danger" onClick={() => setDeleting(true)}>Delete my account</Button>
      </section>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete your account?"
        description="All your tasks, categories, projects and settings will be permanently deleted."
        confirmLabel="Delete forever"
        onConfirm={async () => {
          setDelErr('')
          try {
            await api('/auth/me/', { method: 'DELETE', body: { password: delPw } })
            window.location.assign('/login')
          } catch (err) {
            setDelErr(err.data?.password?.[0] || err.message)
          }
        }}
      >
        <Label htmlFor="dp">Confirm with your password</Label>
        <Input id="dp" type="password" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} invalid={!!delErr} />
        <FieldError>{delErr}</FieldError>
      </ConfirmDialog>
    </div>
  )
}

const RENDER = {
  general: General,
  appearance: Appearance,
  workflow: Workflow,
  categories: Categories,
  projects: Projects,
  dashboard: DashboardSettings,
  notifications: Notifications,
  account: Account,
}

export default function Settings() {
  const { section = 'general' } = useParams()
  if (!RENDER[section]) return <Navigate to="/settings" replace />
  const Comp = RENDER[section]
  return (
    <Page className="max-w-[1040px]">
      <PageHeader title="Settings" subtitle="Make Orbit work the way you do. Everything syncs to your account." />
      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="-mx-4 flex shrink-0 gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:w-52 md:flex-col md:overflow-visible md:px-0" style={{ scrollbarWidth: 'none' }}>
          {SECTIONS.map((s) => (
            <NavLink
              key={s.id}
              to={s.id === 'general' ? '/settings' : `/settings/${s.id}`}
              end
              className={({ isActive }) =>
                cn(
                  'pressable flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap',
                  isActive || (s.id === 'general' && section === 'general') ? 'bg-surface-2 text-ink ring-1 ring-inset ring-line' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <s.icon className="size-4 text-ink-3" />
              {s.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <Comp key={section} />
        </div>
      </div>
    </Page>
  )
}

