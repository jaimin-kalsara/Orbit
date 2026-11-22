import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import {
  BarChart3, CalendarClock, ChevronsUpDown, Inbox, LayoutDashboard, LogOut, Monitor, Moon,
  PanelLeftClose, PanelLeft, Plus, Settings, Sun, Sunrise,
} from 'lucide-react'
import { useApp } from '../../store/context'
import { useReminders } from '../../hooks/useReminders'
import { cn, isOverdue, todayISO } from '../../lib/utils'
import { iconFor } from '../../lib/icons'
import { EditorProvider } from '../tasks/EditorContext'
import { useEditor } from '../tasks/editor-ctx'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../ui/Menu'
import { Kbd } from '../ui/Controls'
import { Logo, LogoMark } from './Logo'

function useCounts() {
  const { tasks, isDone } = useApp()
  return useMemo(() => {
    const today = todayISO()
    let todayCount = 0
    let overdue = 0
    const byCategory = {}
    const byProject = {}
    for (const t of tasks) {
      const done = isDone(t)
      if (done) continue
      const late = isOverdue(t, done)
      if (late) overdue++
      if (t.due_date === today || late) todayCount++
      if (t.category) byCategory[t.category] = (byCategory[t.category] || 0) + 1
      if (t.project) byProject[t.project] = (byProject[t.project] || 0) + 1
    }
    return { today: todayCount, overdue, byCategory, byProject }
  }, [tasks, isDone])
}

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tasks/today', label: 'Today', icon: Sunrise, count: 'today' },
  { to: '/tasks/upcoming', label: 'Upcoming', icon: CalendarClock },
  { to: '/tasks', label: 'All tasks', icon: Inbox, end: true },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
]

function SideLink({ to, icon: Icon, label, end, collapsed, badge, color, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'pressable group relative flex h-8 items-center gap-2.5 rounded-lg px-2 text-[13px] font-medium',
          isActive ? 'text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-lg bg-surface-2 ring-1 ring-inset ring-line"
              transition={{ type: 'spring', duration: 0.32, bounce: 0.1 }}
            />
          )}
          <Icon className={cn('relative size-4 shrink-0', isActive ? 'text-ink' : 'text-ink-3')} style={color ? { color } : undefined} />
          {!collapsed && <span className="relative min-w-0 flex-1 truncate">{label}</span>}
          {!collapsed && badge > 0 && <span className="relative font-mono text-[11px] text-ink-3 tabular">{badge}</span>}
        </>
      )}
    </NavLink>
  )
}

function ThemeItems() {
  const { preferences, updatePreferences } = useApp()
  return (
    <>
      <MenuLabel>Theme</MenuLabel>
      {[
        { v: 'dark', l: 'Dark', i: Moon },
        { v: 'light', l: 'Light', i: Sun },
        { v: 'system', l: 'System', i: Monitor },
      ].map((o) => (
        <MenuItem key={o.v} icon={o.i} checked={preferences?.theme === o.v} keepOpen onSelect={() => updatePreferences({ theme: o.v })}>
          {o.l}
        </MenuItem>
      ))}
    </>
  )
}

function UserMenu({ collapsed, side = 'top', align = 'start', compact }) {
  const { user, logout } = useApp()
  const navigate = useNavigate()
  const initials = (user?.name || user?.email || '?').trim().slice(0, 1).toUpperCase()
  return (
    <Menu
      side={side}
      align={align}
      width="w-60"
      trigger={(props) => (
        <button
          {...props}
          className={cn(
            'pressable flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-surface-2',
            (collapsed || compact) && 'w-auto justify-center',
          )}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-semibold text-accent-fg">{initials}</span>
          {!collapsed && !compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{user?.name}</span>
                <span className="block truncate text-[11.5px] text-ink-3">{user?.email}</span>
              </span>
              <ChevronsUpDown className="size-3.5 text-ink-3" />
            </>
          )}
        </button>
      )}
    >
      <ThemeItems />
      <MenuSeparator />
      <MenuItem icon={Settings} onSelect={() => navigate('/settings')}>
        Settings
      </MenuItem>
      <MenuItem icon={LogOut} onSelect={logout}>
        Log out
      </MenuItem>
    </Menu>
  )
}

function Sidebar({ collapsed, setCollapsed }) {
  const { categories, projects } = useApp()
  const { openEditor } = useEditor()
  const counts = useCounts()
  const activeProjects = projects.filter((p) => !p.is_archived)

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 68 : 252 }}
      transition={{ duration: 0.26, ease: [0.77, 0, 0.175, 1] }}
      className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-bg md:flex"
    >
      <div className={cn('flex h-14 items-center px-4', collapsed ? 'justify-center px-0' : 'justify-between')}>
        {collapsed ? <LogoMark /> : <Logo />}
        {!collapsed && (
          <button
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed(true)}
            className="pressable grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      <div className={cn('px-3 pb-3', collapsed && 'px-3.5')}>
        <button
          onClick={() => openEditor()}
          title="New task (N)"
          className={cn(
            'pressable flex h-9 w-full items-center gap-2 rounded-[10px] bg-accent px-3 text-[13px] font-semibold text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] hover:brightness-105',
            collapsed && 'justify-center px-0',
          )}
        >
          <Plus className="size-4" strokeWidth={2.5} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">New task</span>
              <span className="rounded bg-black/10 px-1.5 font-mono text-[10.5px]">N</span>
            </>
          )}
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
        <div className="space-y-0.5">
          {NAV.map((item) => (
            <SideLink key={item.to} {...item} collapsed={collapsed} badge={item.count ? counts[item.count] : 0} />
          ))}
        </div>

        <SectionTitle collapsed={collapsed} to="/settings/categories">
          Categories
        </SectionTitle>
        <div className="space-y-0.5">
          {categories.map((c) => (
            <SideLink
              key={c.id}
              to={`/category/${c.id}`}
              icon={iconFor(c.icon)}
              color={c.color}
              label={c.name}
              collapsed={collapsed}
              badge={counts.byCategory[c.id]}
            />
          ))}
        </div>

        {(activeProjects.length > 0 || !collapsed) && (
          <SectionTitle collapsed={collapsed} to="/settings/projects">
            Projects
          </SectionTitle>
        )}
        <div className="space-y-0.5">
          {activeProjects.map((p) => (
            <SideLink
              key={p.id}
              to={`/project/${p.id}`}
              icon={(props) => <span {...props} className={cn(props.className, 'grid place-items-center')}><span className="size-2.5 rounded-[3px]" style={{ background: p.color }} /></span>}
              label={p.name}
              collapsed={collapsed}
              badge={counts.byProject[p.id]}
            />
          ))}
          {!collapsed && activeProjects.length === 0 && (
            <NavLink to="/settings/projects" className="block px-2 py-1 text-[12.5px] text-ink-3 hover:text-ink-2">
              + Create a project
            </NavLink>
          )}
        </div>
      </nav>

      <div className={cn('border-t border-line p-3', collapsed && 'flex flex-col items-center gap-1')}>
        {collapsed && (
          <button
            aria-label="Expand sidebar"
            onClick={() => setCollapsed(false)}
            className="pressable mb-1 grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <PanelLeft className="size-4" />
          </button>
        )}
        <SideLink to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
        <div className="mt-1">
          <UserMenu collapsed={collapsed} />
        </div>
      </div>
    </motion.aside>
  )
}

function SectionTitle({ children, collapsed, to }) {
  if (collapsed) return <div className="mx-auto my-3 h-px w-6 bg-line" />
  return (
    <div className="mt-5 mb-1 flex items-center justify-between px-2">
      <span className="text-[11.5px] font-medium text-ink-3">{children}</span>
      <NavLink to={to} aria-label={`Manage ${children}`} className="grid size-5 place-items-center rounded text-ink-3 hover:bg-surface-2 hover:text-ink">
        <Plus className="size-3.5" />
      </NavLink>
    </div>
  )
}

/* ---------- Mobile chrome ---------- */
function MobileTopBar() {
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl md:hidden">
      <div className="flex h-13 items-center justify-between px-4">
        <Logo />
        <UserMenu side="bottom" align="end" compact />
      </div>
    </header>
  )
}

function MobileTabBar() {
  const { openEditor } = useEditor()
  const counts = useCounts()
  const tabs = [
    { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
    { to: '/tasks/today', label: 'Today', icon: Sunrise, badge: counts.today },
    null,
    { to: '/tasks', label: 'Tasks', icon: Inbox, end: true },
    { to: '/insights', label: 'Insights', icon: BarChart3 },
  ]
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur-xl md:hidden">
      <div className="grid h-16 grid-cols-5 items-center px-2">
        {tabs.map((t, i) =>
          t === null ? (
            <div key="fab" className="grid place-items-center">
              <button
                aria-label="New task"
                onClick={() => openEditor()}
                className="pressable grid size-12 place-items-center rounded-2xl bg-accent text-accent-fg shadow-[0_8px_24px_-6px_color-mix(in_oklab,var(--accent)_60%,transparent)]"
              >
                <Plus className="size-5" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn('pressable relative flex flex-col items-center gap-1 py-1 text-[10.5px] font-medium', isActive ? 'text-ink' : 'text-ink-3')
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <t.icon className="size-[22px]" strokeWidth={isActive ? 2.25 : 1.75} />
                    {t.badge > 0 && (
                      <span className="absolute -top-1 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[9.5px] font-semibold text-accent-fg">
                        {t.badge > 99 ? '99+' : t.badge}
                      </span>
                    )}
                  </span>
                  {t.label}
                </>
              )}
            </NavLink>
          ),
        )}
      </div>
    </nav>
  )
}

function ShellInner() {
  useReminders()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('orbit.sidebar')
      if (saved !== null) return saved === '1'
    } catch {
      /* ignore */
    }
    return window.matchMedia('(max-width: 1023px)').matches
  })
  useEffect(() => {
    try {
      localStorage.setItem('orbit.sidebar', collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex min-h-dvh">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <motion.main
          key={location.pathname.split('/').slice(0, 2).join('/') + (location.pathname.startsWith('/tasks') || location.pathname.startsWith('/category') || location.pathname.startsWith('/project') ? '' : location.pathname)}
          initial={{ opacity: 0, transform: 'translateY(6px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          className="flex-1 pb-[calc(88px+env(safe-area-inset-bottom,0px))] md:pb-10"
        >
          <Outlet />
        </motion.main>
      </div>
      <MobileTabBar />
    </div>
  )
}

export function AppShell() {
  return (
    <EditorProvider>
      <ShellInner />
    </EditorProvider>
  )
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[12.5px] font-medium text-ink-3">{eyebrow}</div>}
        <h1 className="truncate text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Page({ children, className }) {
  return <div className={cn('mx-auto w-full max-w-[1180px] px-4 pt-5 sm:px-6 md:pt-8 lg:px-10', className)}>{children}</div>
}

export { Kbd }
