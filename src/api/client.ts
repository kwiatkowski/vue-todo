import { config } from '@/config'

export class ApiError extends Error {
  constructor (
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

let nonce = config.nonce

/** WordPress nonces expire (12–24 h) – a tab left open gets a fresh one from core's `rest-nonce` endpoint. */
async function refreshNonce (): Promise<boolean> {
  if (!config.nonceUrl) {
    return false
  }

  const response = await fetch(config.nonceUrl, { credentials: 'same-origin' }).catch(() => null)
  const fresh = response?.ok ? (await response.text()).trim() : ''

  if (!fresh || fresh === '0' || fresh === '-1') {
    return false
  }

  nonce = fresh

  return true
}

/**
 * JSON request to todo/v1. PATCH and DELETE travel as POST + X-HTTP-Method-Override
 * (WordPress understands it), because some hosts block those methods.
 */
export async function request<T> (method: Method, path: string, body?: unknown, retry = true): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (nonce) {
    headers['X-WP-Nonce'] = nonce
  }

  if (method === 'PATCH' || method === 'DELETE') {
    headers['X-HTTP-Method-Override'] = method
  }

  let response: Response

  try {
    response = await fetch(config.restUrl + path, {
      method: method === 'GET' ? 'GET' : 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError('Brak połączenia z serwerem.', 0, 'network')
  }

  const data = await response.json().catch(() => null) as { code?: string, message?: string } | null

  if (response.status === 403 && retry && data?.code === 'rest_cookie_invalid_nonce' && await refreshNonce()) {
    return request<T>(method, path, body, false)
  }

  if (!response.ok) {
    throw new ApiError(data?.message ?? `Błąd serwera (${response.status}).`, response.status, data?.code ?? 'http_error')
  }

  return data as T
}
