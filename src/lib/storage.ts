import type { Deck } from '@/types'

const STORAGE_KEY = 'hanzi-flashcards-v1'

export function loadDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as Deck[]
  } catch {
    return []
  }
}

export function saveDecks(decks: Deck[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks))
}

const SETTINGS_KEY = 'hanzi-flashcards-settings-v1'

export interface AppSettings {
  requireHandwritingInStudy: boolean
}

const defaultSettings: AppSettings = {
  requireHandwritingInStudy: false,
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...defaultSettings }
    return { ...defaultSettings, ...JSON.parse(raw) } as AppSettings
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}
