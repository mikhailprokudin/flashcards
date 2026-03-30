/** Символы строки с учётом суррогатных пар (иероглифы). */
export function graphemes(text: string): string[] {
  if (!text) return []
  try {
    const seg = new Intl.Segmenter('zh-Hans', { granularity: 'grapheme' })
    return [...seg.segment(text)].map((s) => s.segment)
  } catch {
    return [...text]
  }
}
