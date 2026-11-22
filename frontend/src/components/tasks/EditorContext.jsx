import { useCallback, useEffect, useMemo, useState } from 'react'
import { EditorCtx } from './editor-ctx'
import { TaskEditor } from './TaskEditor'

export function EditorProvider({ children }) {
  const [state, setState] = useState({ open: false, task: null, defaults: {} })
  const openEditor = useCallback((task = null, defaults = {}) => setState({ open: true, task, defaults }), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])

  // "N" opens a new task from anywhere (not while typing).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      openEditor()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openEditor])

  const value = useMemo(() => ({ openEditor }), [openEditor])
  return (
    <EditorCtx.Provider value={value}>
      {children}
      <TaskEditor open={state.open} task={state.task} defaults={state.defaults} onClose={close} />
    </EditorCtx.Provider>
  )
}

