import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppContext } from './context'
import { api, del, get, patch, post } from '../lib/api'
import { readableOn } from '../lib/utils'
import { toast } from '../components/ui/Toast'

const EMPTY = { user: null, preferences: null, statuses: [], priorities: [], categories: [], projects: [], tasks: [] }

/* ---------- Theme application ---------- */
function applyAppearance(prefs) {
  if (!prefs) return
  const root = document.documentElement
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && systemDark)
  root.classList.toggle('dark', dark)
  root.style.setProperty('--accent', prefs.accent_color)
  root.style.setProperty('--accent-fg', readableOn(prefs.accent_color))
  root.dataset.density = prefs.density
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute('content', dark ? '#09090A' : '#F7F7F8')
  })
  try {
    localStorage.setItem('orbit.theme', prefs.theme)
    localStorage.setItem('orbit.accent', prefs.accent_color)
  } catch {
    /* storage may be unavailable (private mode) */
  }
}

export function AppProvider({ children }) {
  const [phase, setPhase] = useState('loading') // loading | anon | ready | error
  const [data, setData] = useState(EMPTY)
  const pendingDeletes = useRef(new Map())

  const set = useCallback((fn) => setData((d) => ({ ...d, ...fn(d) })), [])

  /* ---------- Session ---------- */
  const boot = useCallback(async () => {
    try {
      // Cheap session probe first (also sets the CSRF cookie) — avoids a 403 when logged out.
      const { authenticated } = await get('/auth/csrf/')
      if (!authenticated) {
        setData(EMPTY)
        setPhase('anon')
        return
      }
      const payload = await get('/bootstrap/')
      setData({ ...EMPTY, ...payload })
      setPhase('ready')
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz && payload.preferences.timezone !== tz) {
        patch('/auth/preferences/', { timezone: tz })
          .then((p) => set(() => ({ preferences: p })))
          .catch(() => {})
      }
    } catch (err) {
      if (err.status === 403 || err.status === 401) {
        setData(EMPTY)
        setPhase('anon')
      } else setPhase('error')
    }
  }, [set])

  useEffect(() => {
    boot()
  }, [boot])

  useEffect(() => {
    applyAppearance(data.preferences)
    if (data.preferences?.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyAppearance(data.preferences)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [data.preferences])

  const login = useCallback(
    async (email, password) => {
      await post('/auth/login/', { email, password })
      await boot()
    },
    [boot],
  )

  const register = useCallback(
    async (name, email, password) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      await post('/auth/register/', { name, email, password, timezone })
      await boot()
    },
    [boot],
  )

  const logout = useCallback(async () => {
    await flushDeletes()
    await post('/auth/logout/')
    setData(EMPTY)
    setPhase('anon')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- Lookups ---------- */
  const lookups = useMemo(() => {
    const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]))
    const statusById = byId(data.statuses)
    const doneStatus = data.statuses.find((s) => s.kind === 'done')
    const openStatus = data.statuses.find((s) => s.kind === 'todo') || data.statuses.find((s) => s.kind !== 'done')
    return {
      statusById,
      priorityById: byId(data.priorities),
      categoryById: byId(data.categories),
      projectById: byId(data.projects),
      doneStatus,
      openStatus,
      isDone: (task) => statusById[task.status]?.kind === 'done',
    }
  }, [data.statuses, data.priorities, data.categories, data.projects])

  /* ---------- Preferences ---------- */
  const updatePreferences = useCallback(
    async (changes) => {
      let previous
      set((d) => {
        previous = d.preferences
        return { preferences: { ...d.preferences, ...changes } }
      })
      try {
        const saved = await patch('/auth/preferences/', changes)
        set(() => ({ preferences: saved }))
        return saved
      } catch (err) {
        set(() => ({ preferences: previous }))
        toast.error(err.message)
        throw err
      }
    },
    [set],
  )

  const updateUser = useCallback(
    async (changes) => {
      const user = await patch('/auth/me/', changes)
      set(() => ({ user }))
      return user
    },
    [set],
  )

  /* ---------- Tasks ---------- */
  const replaceTask = (task) => set((d) => ({ tasks: d.tasks.map((t) => (t.id === task.id ? task : t)) }))

  const createTask = useCallback(
    async (fields) => {
      const task = await post('/tasks/', fields)
      set((d) => ({ tasks: [task, ...d.tasks] }))
      return task
    },
    [set],
  )

  const updateTask = useCallback(
    async (id, changes, { silent = false } = {}) => {
      let previous
      set((d) => ({
        tasks: d.tasks.map((t) => {
          if (t.id !== id) return t
          previous = t
          return { ...t, ...changes }
        }),
      }))
      try {
        const saved = await patch(`/tasks/${id}/`, changes)
        replaceTask(saved)
        return saved
      } catch (err) {
        if (previous) replaceTask(previous)
        if (!silent) toast.error(err.message)
        throw err
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [set],
  )

  const toggleComplete = useCallback(
    (task) => {
      const done = lookups.isDone(task)
      const target = done ? lookups.openStatus : lookups.doneStatus
      if (!target) return
      const optimistic = { status: target.id }
      if (!done) optimistic.completed_at = new Date().toISOString()
      else optimistic.completed_at = null
      // completed_at is read-only server side; send only status.
      set((d) => ({ tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, ...optimistic } : t)) }))
      return patch(`/tasks/${task.id}/`, { status: target.id })
        .then(replaceTask)
        .catch((err) => {
          replaceTask(task)
          toast.error(err.message)
        })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lookups, set],
  )

  // Deletes are optimistic with a short undo window; flushed on page hide.
  const commitDelete = useCallback((id, { keepalive = false } = {}) => {
    const entry = pendingDeletes.current.get(id)
    if (!entry) return Promise.resolve()
    clearTimeout(entry.timer)
    pendingDeletes.current.delete(id)
    return del(`/tasks/${id}/`, { keepalive }).catch((err) => {
      if (err.status === 404) return
      set((d) => ({ tasks: [entry.task, ...d.tasks] }))
      toast.error(`Couldn't delete “${entry.task.title}”`)
    })
  }, [set])

  const flushDeletes = useCallback(
    () => Promise.all([...pendingDeletes.current.keys()].map((id) => commitDelete(id, { keepalive: true }))),
    [commitDelete],
  )

  useEffect(() => {
    const onHide = () => flushDeletes()
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [flushDeletes])

  const deleteTask = useCallback(
    (task) => {
      set((d) => ({ tasks: d.tasks.filter((t) => t.id !== task.id) }))
      const timer = setTimeout(() => commitDelete(task.id), 5000)
      pendingDeletes.current.set(task.id, { task, timer })
      toast('Task deleted', {
        description: task.title,
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            const entry = pendingDeletes.current.get(task.id)
            if (!entry) return
            clearTimeout(entry.timer)
            pendingDeletes.current.delete(task.id)
            set((d) => ({ tasks: [entry.task, ...d.tasks] }))
          },
        },
      })
    },
    [commitDelete, set],
  )

  const reorderTasks = useCallback(
    async (orderedIds) => {
      const pos = new Map(orderedIds.map((id, i) => [id, i]))
      set((d) => ({
        tasks: d.tasks.map((t) => (pos.has(t.id) ? { ...t, position: pos.get(t.id) } : t)),
      }))
      try {
        await post('/tasks/reorder/', { ids: orderedIds })
      } catch (err) {
        toast.error(err.message)
      }
    },
    [set],
  )

  const clearCompleted = useCallback(async () => {
    const { deleted } = await post('/tasks/clear-completed/')
    set((d) => ({ tasks: d.tasks.filter((t) => d.statuses.find((s) => s.id === t.status)?.kind !== 'done') }))
    return deleted
  }, [set])

  const markReminderSent = useCallback(
    (id) => {
      set((d) => ({ tasks: d.tasks.map((t) => (t.id === id ? { ...t, reminder_sent: true } : t)) }))
      post(`/tasks/${id}/reminder-sent/`).catch(() => {})
    },
    [set],
  )

  /* ---------- Taxonomies (statuses, priorities, categories, projects) ---------- */
  const createItem = useCallback(
    async (kind, fields) => {
      const item = await post(`/${kind}/`, fields)
      set((d) => ({ [kind]: [...d[kind], item] }))
      return item
    },
    [set],
  )

  const updateItem = useCallback(
    async (kind, id, changes) => {
      const item = await patch(`/${kind}/${id}/`, changes)
      set((d) => ({ [kind]: d[kind].map((x) => (x.id === id ? { ...x, ...item } : x)) }))
      return item
    },
    [set],
  )

  const deleteItem = useCallback(
    async (kind, id, { moveTo } = {}) => {
      await api(`/${kind}/${id}/${moveTo ? `?move_to=${moveTo}` : ''}`, { method: 'DELETE' })
      if (kind === 'statuses') {
        const tasks = await get('/tasks/')
        set((d) => ({ statuses: d.statuses.filter((x) => x.id !== id), tasks }))
        return
      }
      const field = { priorities: 'priority', categories: 'category', projects: 'project' }[kind]
      set((d) => ({
        [kind]: d[kind].filter((x) => x.id !== id),
        tasks: d.tasks.map((t) => (t[field] === id ? { ...t, [field]: null } : t)),
        ...(kind === 'categories'
          ? { projects: d.projects.map((p) => (p.category === id ? { ...p, category: null } : p)) }
          : {}),
      }))
    },
    [set],
  )

  const reorderItems = useCallback(
    async (kind, ordered) => {
      set(() => ({ [kind]: ordered.map((x, i) => ({ ...x, position: i })) }))
      try {
        await post(`/${kind}/reorder/`, { ids: ordered.map((x) => x.id) })
      } catch (err) {
        toast.error(err.message)
      }
    },
    [set],
  )

  const value = useMemo(
    () => ({
      phase,
      ...data,
      ...lookups,
      boot,
      login,
      register,
      logout,
      updatePreferences,
      updateUser,
      createTask,
      updateTask,
      toggleComplete,
      deleteTask,
      reorderTasks,
      clearCompleted,
      markReminderSent,
      createItem,
      updateItem,
      deleteItem,
      reorderItems,
      setData,
    }),
    [
      phase, data, lookups, boot, login, register, logout, updatePreferences, updateUser, createTask,
      updateTask, toggleComplete, deleteTask, reorderTasks, clearCompleted, markReminderSent, createItem,
      updateItem, deleteItem, reorderItems,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

