import { ref } from 'vue'
import { ZhkRecognizer } from '@zh-keyboard/recognizer'

const MODEL_URL =
  'https://cdn.jsdelivr.net/gh/dusionlike/zh-keyboard@main/packages/vue/public/models/handwrite/model.json'
const DICT_URL =
  'https://cdn.jsdelivr.net/gh/dusionlike/zh-keyboard@main/packages/vue/public/models/dict.txt'

let recognizer: ZhkRecognizer | null = null
let initPromise: Promise<void> | null = null

export function useHandwritingRecognizer() {
  const initLoading = ref(false)
  const initError = ref<string | null>(null)

  async function ensureInit(): Promise<void> {
    if (recognizer) return
    if (initPromise) return initPromise

    initLoading.value = true
    initError.value = null

    recognizer = new ZhkRecognizer({
      modelPath: MODEL_URL,
      dictPath: DICT_URL,
      backend: 'cpu',
    })

    initPromise = recognizer
      .initialize()
      .then(() => {
        initLoading.value = false
      })
      .catch((e: unknown) => {
        initError.value = e instanceof Error ? e.message : String(e)
        initLoading.value = false
        recognizer = null
        initPromise = null
        throw e
      })

    return initPromise
  }

  async function recognize(strokeData: number[]): Promise<string[]> {
    await ensureInit()
    if (!recognizer) throw new Error('Распознаватель не инициализирован')
    return recognizer.recognize(strokeData)
  }

  return { initLoading, initError, ensureInit, recognize }
}
