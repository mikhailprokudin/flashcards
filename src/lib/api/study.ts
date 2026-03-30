import { apiRequest } from '@/lib/api/client'
import type { ApiCard } from '@/lib/api/decks'

export interface StudyProgress {
  status: string
  step: number
  firstShownAt: string | null
  nextDueAt: string | null
  lastReviewAt: string | null
  lastResult: 'know' | 'dont_know' | null
}

export interface StudyQueueItem {
  card: ApiCard
  progress: StudyProgress | null
}

export interface StudyStats {
  /** Нет ни одного ответа «знаю / не знаю» (нет строки прогресса или last_review пуст). */
  neverReviewed: number
  learning: number
  learned: number
  /** Есть ли сейчас карточки в очереди повторения (как у GET /study/queue). */
  canStudy: boolean
}

export const studyApi = {
  stats(token: string): Promise<StudyStats> {
    return apiRequest<StudyStats>('/study/stats', { method: 'GET', token })
  },

  /** Очередь по всем колодам пользователя (единый SRS). */
  queueAll(
    token: string,
    query?: { limit?: number; maxNew?: number },
  ): Promise<{ items: StudyQueueItem[] }> {
    const q = new URLSearchParams()
    if (query?.limit != null) q.set('limit', String(query.limit))
    if (query?.maxNew != null) q.set('maxNew', String(query.maxNew))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return apiRequest<{ items: StudyQueueItem[] }>(`/study/queue${suffix}`, { method: 'GET', token })
  },

  queue(
    token: string,
    deckId: string,
    query?: { limit?: number; maxNew?: number },
  ): Promise<{ items: StudyQueueItem[] }> {
    const q = new URLSearchParams()
    if (query?.limit != null) q.set('limit', String(query.limit))
    if (query?.maxNew != null) q.set('maxNew', String(query.maxNew))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return apiRequest<{ items: StudyQueueItem[] }>(
      `/study/decks/${deckId}/queue${suffix}`,
      { method: 'GET', token },
    )
  },

  review(
    token: string,
    body: { cardId: number; result: 'know' | 'dont_know' },
  ): Promise<{ progress: StudyProgress }> {
    return apiRequest<{ progress: StudyProgress }>('/study/review', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    })
  },
}
