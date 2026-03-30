/** Неофициальный клиент Google Translate (без API-ключа). Только для подсказки перевода. */
export async function translateZhToRu(text: string): Promise<string> {
  const q = text.trim()
  if (!q) return ''
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=ru&dt=t&q=${encodeURIComponent(q)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Перевод: ${res.status}`)
  const data: unknown = await res.json()
  if (!Array.isArray(data) || !Array.isArray(data[0])) return ''
  const parts = data[0] as unknown[]
  return parts.map((p) => (Array.isArray(p) ? String(p[0] ?? '') : '')).join('')
}
