export const cn = (...parts) => parts.filter(Boolean).join(' ')

/* ---------- Colors ---------- */
export function readableOn(hex) {
  const h = (hex || '#000000').replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.36 ? '#0B0B0C' : '#FFFFFF'
}

export const ACCENTS = [
  { name: 'Volt', value: '#C8F542' },
  { name: 'Ember', value: '#FF6B2C' },
  { name: 'Cobalt', value: '#3D7BFF' },
  { name: 'Jade', value: '#19C37D' },
  { name: 'Crimson', value: '#F2385A' },
  { name: 'Ice', value: '#7DD3FC' },
  { name: 'Amber', value: '#FFB224' },
  { name: 'Steel', value: '#A1A1AA' },
]

export const SWATCHES = [
  '#8A8F98', '#64748B', '#3B82F6', '#3D7BFF', '#7DD3FC', '#14B8A6', '#22C55E', '#A3E635',
  '#C8F542', '#F59E0B', '#FFB224', '#FF6B2C', '#EF4444', '#F43F5E', '#EC4899', '#A855F7',
]

/* ---------- Dates (all local) ---------- */
const pad = (n) => String(n).padStart(2, '0')
export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayISO = () => toISODate(new Date())
export const parseISODate = (s) => {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const dayDiff = (a, b) => Math.round((parseISODate(a) - parseISODate(b)) / 86400000)

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function startOfWeek(date, weekStart = 1) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = (d.getDay() - weekStart + 7) % 7
  return addDays(d, -diff)
}

export function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDue(dateStr, timeStr) {
  if (!dateStr) return ''
  const diff = dayDiff(dateStr, todayISO())
  const d = parseISODate(dateStr)
  let label
  if (diff === 0) label = 'Today'
  else if (diff === 1) label = 'Tomorrow'
  else if (diff === -1) label = 'Yesterday'
  else if (diff > 1 && diff < 7) label = d.toLocaleDateString([], { weekday: 'short' })
  else
    label = d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
    })
  return timeStr ? `${label}, ${formatTime(timeStr)}` : label
}

export function relativeTime(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Late night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/* ---------- Task helpers ---------- */
export function isOverdue(task, done) {
  if (done || !task.due_date) return false
  const today = todayISO()
  if (task.due_date < today) return true
  if (task.due_date === today && task.due_time) {
    const now = new Date()
    return task.due_time.slice(0, 5) < `${pad(now.getHours())}:${pad(now.getMinutes())}`
  }
  return false
}

export function dueDateTime(task) {
  if (!task.due_date) return null
  const d = parseISODate(task.due_date)
  if (task.due_time) {
    const [h, m] = task.due_time.split(':').map(Number)
    d.setHours(h, m, 0, 0)
  } else {
    d.setHours(9, 0, 0, 0)
  }
  return d
}

export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`
