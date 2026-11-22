// Proxies a request to the Django backend so the browser stays same-origin
// (session + CSRF cookies keep working on the Pages domain).
export async function proxyToBackend({ request, env }) {
  const backend = (env.BACKEND_URL || '').replace(/\/+$/, '')
  if (!backend) {
    return Response.json(
      { detail: 'Backend is not configured. Set BACKEND_URL in Cloudflare Pages settings.' },
      { status: 503 },
    )
  }
  const url = new URL(request.url)
  const target = backend + url.pathname + url.search
  const headers = new Headers(request.headers)
  headers.set('X-Forwarded-Host', url.host)
  headers.set('X-Forwarded-Proto', 'https')
  const res = await fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  })
  return new Response(res.body, res)
}
