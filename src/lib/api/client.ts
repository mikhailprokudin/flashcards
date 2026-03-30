import { getApiBase } from '@/lib/apiBase'

interface ErrorBody {
  error?: string
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { error: text }
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { token?: string | null },
): Promise<T> {
  const { token, headers: initHeaders, ...rest } = init
  const headers = new Headers(initHeaders)
  if (!headers.has('Content-Type') && rest.method && rest.method !== 'GET' && rest.method !== 'HEAD') {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${getApiBase()}${path}`, { ...rest, headers })
  const body = await parseJson(res)

  if (!res.ok) {
    const msg =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as ErrorBody).error ?? `HTTP ${res.status}`)
        : `HTTP ${res.status}`
    throw new ApiError(msg, res.status, body)
  }

  return body as T
}
