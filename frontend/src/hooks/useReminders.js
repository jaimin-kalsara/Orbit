import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/context'
import { toast } from '../components/ui/Toast'
import { isOverdue, plural } from '../lib/utils'

const HORIZON = 24 * 60 * 60 * 1000 // schedule timers for the next 24h; re-plan hourly

export function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const now = ctx.currentTime
    ;[880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.0001, now + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.4)
    })
    setTimeout(() => ctx.close(), 1000)
  } catch {
    /* audio not available */
  }
}

/** Fires in-app (and optionally OS) reminders for tasks with reminder_at set. */
export function useReminders() {
  const { phase, tasks, preferences, isDone, markReminderSent, toggleComplete } = useApp()
  const [tick, setTick] = useState(0)
  const announcedOverdue = useRef(false)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (phase !== 'ready' || !preferences?.reminders_enabled) return
    const now = Date.now()
    const timers = []
    for (const task of tasks) {
      if (!task.reminder_at || task.reminder_sent || isDone(task)) continue
      const at = new Date(task.reminder_at).getTime()
      const wait = at - now
      if (wait > HORIZON) continue
      // Missed by more than 12h (app was closed) — mark silently, don't spam.
      if (wait < -12 * 60 * 60 * 1000) {
        markReminderSent(task.id)
        continue
      }
      timers.push(
        setTimeout(() => {
          toast.reminder(task.title, {
            id: `reminder-${task.id}`,
            description: 'Reminder',
            action: { label: 'Done', onClick: () => toggleComplete(task) },
          })
          if (preferences.reminder_sound) chime()
          if (preferences.browser_notifications && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('Orbit reminder', { body: task.title, tag: `orbit-${task.id}` })
            } catch {
              /* some browsers only allow notifications from a service worker */
            }
          }
          markReminderSent(task.id)
        }, Math.max(0, wait)),
      )
    }
    return () => timers.forEach(clearTimeout)
  }, [phase, tasks, preferences, isDone, markReminderSent, toggleComplete, tick])

  // One overdue nudge per session.
  useEffect(() => {
    if (phase !== 'ready' || announcedOverdue.current || !preferences?.overdue_alerts) return
    announcedOverdue.current = true
    const count = tasks.filter((t) => isOverdue(t, isDone(t))).length
    if (count > 0) {
      setTimeout(() => toast(`${plural(count, 'task')} overdue`, { description: 'Worth a look today.' }), 900)
    }
  }, [phase, tasks, preferences, isDone])
}
