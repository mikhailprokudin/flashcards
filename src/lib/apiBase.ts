/** Base URL for the API (no trailing slash). Dev default `/api` matches Vite proxy. */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw != null && raw !== '') {
    return raw.replace(/\/$/, '')
  }
  return '/api'
}
