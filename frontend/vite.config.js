import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Asset base for production builds:
// - Cloudflare Pages (sets CF_PAGES automatically) serves dist/ at the site root -> "/".
// - Otherwise Django serves the build, with assets under /static/.
// VITE_BASE overrides both.
const buildBase = process.env.VITE_BASE || (process.env.CF_PAGES ? '/' : '/static/')

export default defineConfig(({ command }) => ({
  base: command === 'build' ? buildBase : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000',
    },
  },
}))
