import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, Flame, RotateCcw, Target, TrendingUp, Trophy } from 'lucide-react'
import { useApp } from '../store/context'
import { get } from '../lib/api'
import { Page, PageHeader } from '../components/layout/AppShell'
import { Segmented, Skeleton } from '../components/ui/Controls'
import { Button } from '../components/ui/Button'
import { BarChart, ShareBars } from '../components/charts/BarChart'
import { parseISODate, plural } from '../lib/utils'
import { cn } from '../lib/utils'

function Kpi({ icon: Icon, label, value, sub, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateY(6px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col gap-4 p-4 sm:p-5"
    >
      <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink-3">
        <Icon className="size-3.5" />
        {label}
      </span>
      <div>
        <div className="text-[26px] leading-none font-semibold tracking-[-0.03em] text-ink tabular">{value}</div>
        {sub && <div className="mt-1.5 text-[12px] text-ink-3">{sub}</div>}
      </div>
    </motion.div>
  )
}

function Panel({ title, children, className, action }) {
  return (
    <section className={cn('rounded-2xl bg-surface p-4 shadow-card ring-1 ring-line sm:p-5', className)}>
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}

function StatusSplit({ totals }) {
  const parts = [
    { key: 'todo', label: 'To do', value: totals.todo, color: 'var(--ink-3)' },
    { key: 'in_progress', label: 'In progress', value: totals.in_progress, color: 'var(--warning)' },
    { key: 'done', label: 'Done', value: totals.completed, color: 'var(--accent)' },
  ]
  const total = Math.max(1, totals.total)
  return (
    <div>
      <div className="flex h-2.5 gap-1 overflow-hidden rounded-full">
        {parts.map((p, i) =>
          p.value > 0 ? (
            <motion.div
              key={p.key}
              className="h-full rounded-full"
              style={{ width: `${(p.value / total) * 100}%`, background: p.color, transformOrigin: 'left' }}
              initial={{ transform: 'scaleX(0)' }}
              animate={{ transform: 'scaleX(1)' }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.23, 1, 0.32, 1] }}
            />
          ) : null,
        )}
        {totals.total === 0 && <div className="h-full w-full rounded-full bg-surface-3" />}
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <li key={p.key}>
            <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
              <span className="size-2 rounded-full" style={{ background: p.color }} />
              {p.label}
            </div>
            <div className="mt-1 text-[18px] font-semibold text-ink tabular">{p.value}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Insights() {
  const { tasks, categoryById, priorityById } = useApp()
  const [period, setPeriod] = useState('week')
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [reload, setReload] = useState(0)

  // Refetch only when the underlying data actually changed.
  const version = useMemo(() => `${tasks.length}:${tasks.reduce((m, t) => (t.updated_at > m ? t.updated_at : m), '')}`, [tasks])

  useEffect(() => {
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      setError(null)
      get(`/stats/?period=${period}`, { signal: ctrl.signal })
        .then(setStats)
        .catch((err) => err.name !== 'AbortError' && setError(err.message))
    }, stats ? 250 : 0)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, version, reload])

  const series = useMemo(() => {
    if (!stats) return []
    return stats.series.map((d) => {
      const date = parseISODate(d.date)
      return {
        key: d.date,
        value: d.completed,
        label: period === 'week' ? date.toLocaleDateString([], { weekday: 'short' }) : String(date.getDate()),
        tooltip: date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
        highlight: d.is_today,
        future: d.is_future,
      }
    })
  }, [stats, period])

  const rangeLabel = stats
    ? `${parseISODate(stats.range.start).toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${parseISODate(stats.range.end).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
    : ''

  return (
    <Page>
      <PageHeader
        title="Insights"
        subtitle={rangeLabel ? `Your productivity · ${rangeLabel}` : 'Your productivity at a glance'}
        actions={
          <Segmented
            value={period}
            onChange={setPeriod}
            layoutId="period"
            options={[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: '30d', label: '30 days' },
            ]}
          />
        }
      />

      {error ? (
        <div className="grid place-items-center rounded-2xl bg-surface py-16 text-center ring-1 ring-line">
          <AlertTriangle className="mb-3 size-5 text-warning" />
          <p className="text-[14px] font-medium text-ink">Couldn’t load insights</p>
          <p className="mt-1 text-[13px] text-ink-3">{error}</p>
          <Button className="mt-4" onClick={() => setReload((r) => r + 1)}>
            <RotateCcw className="size-4" /> Retry
          </Button>
        </div>
      ) : !stats ? (
        <div className="space-y-4">
          <Skeleton className="h-[120px] rounded-2xl" />
          <Skeleton className="h-[260px] rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[200px] rounded-2xl" />
            <Skeleton className="h-[200px] rounded-2xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="grid grid-cols-2 divide-line overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line lg:grid-cols-4 [&>*:nth-child(even)]:border-l [&>*:nth-child(even)]:border-line [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-line lg:[&>*:nth-child(n+2)]:border-l lg:[&>*:nth-child(n+3)]:border-t-0">
            <Kpi index={0} icon={TrendingUp} label="Completed" value={stats.period_summary.completed} sub={`${stats.period_summary.created} created in this period`} />
            <Kpi index={1} icon={Target} label="Daily average" value={stats.period_summary.daily_average} sub={`Goal: ${stats.goal.target} / day`} />
            <Kpi index={2} icon={Trophy} label="Goal days hit" value={stats.period_summary.goal_days_hit} sub={`of ${stats.series.filter((d) => !d.is_future).length} days so far`} />
            <Kpi index={3} icon={Flame} label="Streak" value={plural(stats.streak.current, 'day')} sub={`Best: ${plural(stats.streak.best, 'day')}`} />
          </section>

          <Panel title="Completed per day" action={<span className="text-[12px] text-ink-3">Dashed line = daily goal</span>}>
            <BarChart data={series} goal={stats.goal.target} height={220} sparseLabels={period !== 'week'} />
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Task status">
              <StatusSplit totals={stats.totals} />
              <div className="mt-5 flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-3 text-[13px]">
                <span className="text-ink-2">Overall completion</span>
                <span className="font-semibold text-ink tabular">{stats.completion_rate}%</span>
              </div>
              {stats.totals.overdue > 0 && (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-danger/8 px-3.5 py-3 text-[13px]">
                  <span className="text-danger">Overdue right now</span>
                  <span className="font-semibold text-danger tabular">{stats.totals.overdue}</span>
                </div>
              )}
            </Panel>
            <Panel title="By category">
              <ShareBars
                rows={stats.by_category.map((r) => ({
                  key: r.category_id ?? 'none',
                  label: categoryById[r.category_id]?.name ?? 'Uncategorized',
                  color: categoryById[r.category_id]?.color ?? 'var(--ink-3)',
                  total: r.total,
                  done: r.done,
                }))}
                emptyLabel="No tasks yet."
              />
            </Panel>
          </div>

          <Panel title="By priority">
            <ShareBars
              rows={stats.by_priority.map((r) => ({
                key: r.priority_id ?? 'none',
                label: priorityById[r.priority_id]?.name ?? 'No priority',
                color: priorityById[r.priority_id]?.color ?? 'var(--ink-3)',
                total: r.total,
                done: r.done,
              }))}
              emptyLabel="No tasks yet."
            />
          </Panel>
        </div>
      )}
    </Page>
  )
}
