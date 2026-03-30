import { pinyin } from 'pinyin-pro'
import { translateZhToRu } from './translateZhToRu'

export async function suggestPinyinAndMeaning(hanzi: string): Promise<{ pinyin: string; meaning: string }> {
  const hz = hanzi.trim()
  if (!hz) return { pinyin: '', meaning: '' }

  const py = pinyin(hz, { type: 'array', toneType: 'symbol' }).join(' ')
  let meaning = ''
  try {
    meaning = (await translateZhToRu(hz)).trim()
  } catch {
    meaning = ''
  }
  return { pinyin: py, meaning }
}
