import { createContext, useContext } from 'react'

// Kept in its own module so hot reloads of the provider don't recreate the context.
export const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
