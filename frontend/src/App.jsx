import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { MotionConfig } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import { AppProvider } from './store/AppStore'
import { useApp } from './store/context'
import { Toaster } from './components/ui/Toast'
import { AppShell } from './components/layout/AppShell'
import { LogoMark } from './components/layout/Logo'
import { Skeleton } from './components/ui/Controls'
import { Button } from './components/ui/Button'
import AuthPage from './pages/Auth'
import Dashboard from './pages/Dashboard'
import TasksPage from './pages/Tasks'
const Insights = lazy(() => import('./pages/Insights'))
const Settings = lazy(() => import('./pages/settings/Settings'))

function PageFallback() {
  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-4 px-4 pt-8 sm:px-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

const lazyPage = (C) => (
  <Suspense fallback={<PageFallback />}>
    <C />
  </Suspense>
)

function BootScreen() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-[252px] shrink-0 flex-col gap-3 border-r border-line p-4 md:flex">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="mt-2 h-9" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7" />
        ))}
      </div>
      <div className="mx-auto w-full max-w-[1180px] flex-1 space-y-4 px-4 pt-8 sm:px-10">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 pt-4 lg:grid-cols-12">
          <Skeleton className="h-36 rounded-2xl lg:col-span-5" />
          <Skeleton className="h-36 rounded-2xl lg:col-span-7" />
          <Skeleton className="h-64 rounded-2xl lg:col-span-7" />
          <Skeleton className="h-64 rounded-2xl lg:col-span-5" />
        </div>
      </div>
    </div>
  )
}

function ErrorScreen() {
  const { boot } = useApp()
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <LogoMark className="mx-auto mb-5 size-10" />
        <h1 className="text-[18px] font-semibold text-ink">Can’t reach Orbit right now</h1>
        <p className="mt-1.5 text-[13.5px] text-ink-3">Check your connection — your data is safe on the server.</p>
        <Button className="mt-5" onClick={boot}>
          <RotateCcw className="size-4" /> Try again
        </Button>
      </div>
    </div>
  )
}

function Gate({ children, anon }) {
  const { phase } = useApp()
  const location = useLocation()
  if (phase === 'loading') return <BootScreen />
  if (phase === 'error') return <ErrorScreen />
  if (anon) return phase === 'ready' ? <Navigate to="/" replace /> : children
  if (phase === 'anon') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function Motion({ children }) {
  const { preferences } = useApp()
  return <MotionConfig reducedMotion={preferences?.reduce_motion ? 'always' : 'user'}>{children}</MotionConfig>
}

export default function App() {
  return (
    <AppProvider>
      <Motion>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Gate anon><AuthPage mode="login" /></Gate>} />
            <Route path="/register" element={<Gate anon><AuthPage mode="register" /></Gate>} />
            <Route element={<Gate><AppShell /></Gate>}>
              <Route index element={<Dashboard />} />
              <Route path="tasks" element={<TasksPage scope="all" />} />
              <Route path="tasks/today" element={<TasksPage scope="today" key="today" />} />
              <Route path="tasks/upcoming" element={<TasksPage scope="upcoming" key="upcoming" />} />
              <Route path="category/:id" element={<TasksPage scope="category" />} />
              <Route path="project/:id" element={<TasksPage scope="project" />} />
              <Route path="insights" element={lazyPage(Insights)} />
              <Route path="settings" element={lazyPage(Settings)} />
              <Route path="settings/:section" element={lazyPage(Settings)} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </Motion>
    </AppProvider>
  )
}
