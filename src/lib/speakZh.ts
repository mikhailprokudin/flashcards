/** Озвучка китайского текста через браузерный Speech Synthesis API. */

export function cancelChineseSpeech(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
}

function pickChineseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang === 'zh-CN' || /^zh(-|$)/i.test(v.lang))
}

function speakNow(text: string): void {
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  const voice = pickChineseVoice()
  if (voice) u.voice = voice
  u.rate = 0.95
  window.speechSynthesis.speak(u)
}

/**
 * Произносит строку на китайском (для иероглифов и фраз).
 * Безопасен при отсутствии API или пустой строки.
 */
export function speakChinese(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const clean = text.trim()
  if (!clean) return

  const trySpeak = () => speakNow(clean)

  if (window.speechSynthesis.getVoices().length > 0) {
    trySpeak()
    return
  }

  const onVoices = () => {
    window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
    trySpeak()
  }
  window.speechSynthesis.addEventListener('voiceschanged', onVoices)
  window.speechSynthesis.getVoices()
}
