// Serves the built React app and proxies /api, /admin and /static (Django admin assets)
// to the Django backend, so the browser stays same-origin and session + CSRF cookies work.
const BACKEND_PATH = /^\/(api|admin|static)(\/|$)/

async function proxyToBackend(request, env) {
  const backend = (env.BACKEND_URL || '').replace(/\/+$/, '')
  if (!backend) {
    return Response.json(
      { detail: 'Backend is not configured. Set BACKEND_URL in the Worker settings.' },
      { status: 503 },
    )
  }
  const url = new URL(request.url)
  const headers = new Headers(request.headers)
  headers.set('X-Forwarded-Host', url.host)
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''))
  const res = await fetch(backend + url.pathname + url.search, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  })
  return new Response(res.body, res)
}

export default {
  fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (BACKEND_PATH.test(pathname)) return proxyToBackend(request, env)
    return env.ASSETS.fetch(request)
  },
}
