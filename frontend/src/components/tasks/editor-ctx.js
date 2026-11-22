import { createContext, useContext } from 'react'

// Kept in its own module so hot reloads of the provider don't recreate the context.
export const EditorCtx = createContext(null)
export const useEditor = () => useContext(EditorCtx)
