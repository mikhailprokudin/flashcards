import type { ApiCard } from './api/decks'

export type StudyTaskKind = 'meaning' | 'hanzi' | 'write'

export type StudySessionTask = {
  /** Стабильный порядок в сессии (0..n-1) для позиционирования после удаления карточки. */
  order: number
  card: ApiCard
  kind: StudyTaskKind
}

export function hasWriteStepForHanzi(hanzi: string): boolean {
  return cjkGraphemesForWrite(hanzi).length > 0
}

export function kindsForCard(hanzi: string): StudyTaskKind[] {
  const kinds: StudyTaskKind[] = ['meaning', 'hanzi']
  if (hasWriteStepForHanzi(hanzi)) kinds.push('write')
  return kinds
}

/** Иероглифы для шага почерка (латиница и прочие символы отбрасываются). */
export function cjkGraphemesForWrite(hanzi: string): string[] {
  return [...hanzi.trim().matchAll(/\p{Script=Han}/gu)].map((m) => m[0])
}

function shuffleInPlace<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const t = arr[i]!
    arr[i] = arr[j]!
    arr[j] = t
  }
}

/**
 * Для каждой карточки — случайный порядок её шагов, затем общая перетасовка всех шагов.
 */
export function buildShuffledStudyTasks(
  items: { card: ApiCard }[],
  rand: () => number,
): StudySessionTask[] {
  const raw: StudySessionTask[] = []
  let order = 0
  for (const { card } of items) {
    const kinds = kindsForCard(card.hanzi)
    const perm = [...kinds]
    shuffleInPlace(perm, rand)
    for (const kind of perm) {
      raw.push({ order: order++, card, kind })
    }
  }
  shuffleInPlace(raw, rand)
  return raw
}

export function kindsCompleteForCard(hanzi: string, done: Set<StudyTaskKind>): boolean {
  for (const k of kindsForCard(hanzi)) {
    if (!done.has(k)) return false
  }
  return true
}

/**
 * Удаляет все задачи с `removedCardId`. Возвращает индекс следующей задачи по глобальному `order`.
 */
export function tasksAfterCardRemoved(
  tasks: StudySessionTask[],
  removedCardId: number,
  currentOrder: number,
): { nextTasks: StudySessionTask[]; nextIndex: number } {
  const nextTasks = tasks.filter((t) => t.card.id !== removedCardId)
  if (nextTasks.length === 0) return { nextTasks, nextIndex: 0 }

  const larger = nextTasks.filter((t) => t.order > currentOrder)
  const pickOrder =
    larger.length > 0
      ? Math.min(...larger.map((t) => t.order))
      : Math.min(...nextTasks.map((t) => t.order))
  const nextIndex = nextTasks.findIndex((t) => t.order === pickOrder)
  return { nextTasks, nextIndex: Math.max(0, nextIndex) }
}
