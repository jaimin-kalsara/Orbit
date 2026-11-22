import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useApp } from '../store/context'
import { Button } from '../components/ui/Button'
import { FieldError, Input, Label } from '../components/ui/Field'
import { Logo } from '../components/layout/Logo'

function Showcase() {
  const rows = [
    { t: 'Review pull requests', c: '#3D7BFF', done: true },
    { t: 'Leg day — 45 min', c: '#F43F5E', done: true },
    { t: 'Ship onboarding flow', c: '#FFB224', done: false },
    { t: 'Read 20 pages', c: '#A3E635', done: false },
  ]
  return (
    <div className="relative hidden overflow-hidden border-l border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="relative">
        <p className="font-mono text-[11.5px] text-ink-3">DAILY SYSTEM</p>
        <h2 className="mt-3 max-w-sm text-[30px] leading-[1.1] font-semibold tracking-[-0.035em] text-ink">
          Plan the day. Do the work. Watch the streak grow.
        </h2>
      </div>
      <motion.div
        initial={{ opacity: 0, transform: 'translateY(12px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-bg p-4 shadow-pop"
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-[13px] font-semibold text-ink">Today</span>
          <span className="font-mono text-[11px] text-ink-3">2 / 4</span>
        </div>
        {rows.map((r, i) => (
          <motion.div
            key={r.t}
            initial={{ opacity: 0, transform: 'translateY(6px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.07, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-3 rounded-lg px-1 py-2.5"
          >
            <span
              className="grid size-[18px] place-items-center rounded-full border-[1.5px]"
              style={{ borderColor: r.done ? 'var(--accent)' : r.c, background: r.done ? 'var(--accent)' : 'transparent' }}
            >
              {r.done && (
                <svg viewBox="0 0 16 16" className="size-3">
                  <path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" fill="none" stroke="var(--accent-fg)" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              )}
            </span>
            <span className={r.done ? 'text-[13.5px] text-ink-3 line-through' : 'text-[13.5px] text-ink'}>{r.t}</span>
            <span className="ml-auto size-1.5 rounded-full" style={{ background: r.c }} />
          </motion.div>
        ))}
      </motion.div>
      <p className="relative text-[12.5px] text-ink-3">Customizable statuses, priorities, categories and views — yours to shape.</p>
    </div>
  )
}

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login'
  const { login, register } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!isLogin && !form.name.trim()) errs.name = 'Tell us what to call you.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Enter a valid email.'
    if (!form.password) errs.password = 'Enter your password.'
    else if (!isLogin && form.password.length < 8) errs.password = 'Use at least 8 characters.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      if (isLogin) await login(form.email.trim(), form.password)
      else await register(form.name.trim(), form.email.trim(), form.password)
      navigate('/', { replace: true })
    } catch (err) {
      const d = err.data || {}
      setErrors({
        name: d.name?.[0],
        email: d.email?.[0],
        password: d.password?.[0],
        form: d.detail || d.non_field_errors?.[0] || (!d.name && !d.email && !d.password ? err.message : undefined),
      })
    } finally {
      setBusy(false)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="safe-top flex flex-col px-6 py-6 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center">
          <motion.div
            key={mode}
            initial={{ opacity: 0, transform: 'translateY(8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="mx-auto w-full max-w-[360px] py-10"
          >
            <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
            <p className="mt-1.5 text-[14px] text-ink-3">
              {isLogin ? 'Log in to pick up where you left off.' : 'Your tasks, your workflow, your rules.'}
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
              {!isLogin && (
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" autoComplete="name" value={form.name} onChange={set('name')} invalid={!!errors.name} maxLength={150} />
                  <FieldError>{errors.name}</FieldError>
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="email"
                  value={form.email}
                  onChange={set('email')}
                  invalid={!!errors.email}
                  maxLength={254}
                />
                <FieldError>{errors.email}</FieldError>
              </div>
              <div>
                <Label htmlFor="password" hint={isLogin ? undefined : '8+ characters'}>
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? 'text' : 'password'}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    value={form.password}
                    onChange={set('password')}
                    invalid={!!errors.password}
                    className="pr-10"
                    maxLength={128}
                  />
                  <button
                    type="button"
                    aria-label={show ? 'Hide password' : 'Show password'}
                    onClick={() => setShow((s) => !s)}
                    className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-ink-3 hover:text-ink"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <FieldError>{errors.password}</FieldError>
              </div>
              {errors.form && (
                <div role="alert" className="rounded-lg bg-danger/10 px-3 py-2.5 text-[13px] text-danger ring-1 ring-danger/20">
                  {errors.form}
                </div>
              )}
              <Button type="submit" variant="primary" size="lg" className="w-full justify-center" loading={busy}>
                {isLogin ? 'Log in' : 'Create account'}
                {!busy && <ArrowRight className="size-4" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-[13.5px] text-ink-3">
              {isLogin ? 'New to Orbit? ' : 'Already have an account? '}
              <Link to={isLogin ? '/register' : '/login'} className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                {isLogin ? 'Create an account' : 'Log in'}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
      <Showcase />
    </div>
  )
}
