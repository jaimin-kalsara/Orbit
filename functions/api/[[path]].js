import { proxyToBackend } from '../../cloudflare/proxy.js'

export const onRequest = proxyToBackend
