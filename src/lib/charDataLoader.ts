import type { CharacterJson } from 'hanzi-writer'

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0'

/** Local dist/hanzi-data after build; falls back to CDN (e.g. dev without full copy). */
export function charDataLoader(
  char: string,
  onLoad: (data: CharacterJson) => void,
  onError: (err?: unknown) => void,
): void {
  const base = import.meta.env.BASE_URL || './'
  const localUrl = `${base}hanzi-data/${encodeURIComponent(char)}.json`

  fetch(localUrl)
    .then((r) => {
      if (!r.ok) throw new Error('local')
      return r.json() as Promise<CharacterJson>
    })
    .then(onLoad)
    .catch(() => {
      fetch(`${CDN_BASE}/${encodeURIComponent(char)}.json`)
        .then((r) => {
          if (!r.ok) throw new Error('cdn')
          return r.json() as Promise<CharacterJson>
        })
        .then(onLoad)
        .catch(onError)
    })
}
