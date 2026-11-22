// Thin fetch wrapper: same-origin session auth + Django CSRF.

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

let csrfReady = null
export function ensureCsrf() {
  if (getCookie('csrftoken')) return Promise.resolve()
  if (!csrfReady) {
    csrfReady = fetch('/api/auth/csrf/', { credentials: 'same-origin' }).finally(() => {
      csrfReady = null
    })
  }
  return csrfReady
}

/** Flatten DRF error payloads into one readable sentence. */
export function errorMessage(err, fallback = 'Something went wrong.') {
  const data = err?.data
  if (!data) return err?.message || fallback
  if (typeof data === 'string') return data
  if (data.detail) return String(data.detail)
  const first = Object.values(data)[0]
  if (Array.isArray(first)) return String(first[0])
  if (typeof first === 'string') return first
  return fallback
}

export async function api(path, { method = 'GET', body, keepalive = false, signal } = {}) {
  const unsafe = method !== 'GET'
  if (unsafe) await ensureCsrf()
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    keepalive,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(unsafe ? { 'X-CSRFToken': getCookie('csrftoken') || '' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  let data = null
  const text = await res.text()
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const err = new ApiError(res.statusText || 'Request failed', res.status, data)
    err.message = errorMessage(err, res.status >= 500 ? 'Server error — please try again.' : 'Request failed.')
    throw err
  }
  return data
}

export const get = (p, o) => api(p, { ...o, method: 'GET' })
export const post = (p, body, o) => api(p, { ...o, method: 'POST', body })
export const patch = (p, body, o) => api(p, { ...o, method: 'PATCH', body })
export const del = (p, o) => api(p, { ...o, method: 'DELETE' })
