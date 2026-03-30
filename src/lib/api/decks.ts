import { apiRequest } from '@/lib/api/client'

export interface ApiDeckSummary {
  id: number
  name: string
  createdAt: string
  cardCount: number
}

export interface ApiDeckDetail {
  id: number
  name: string
  createdAt: string
}

export interface ApiCard {
  id: number
  deckId: number
  hanzi: string
  pinyin: string
  meaning: string
  example: string
  notes: string | null
  createdAt: string
}

export const decksApi = {
  list(token: string): Promise<ApiDeckSummary[]> {
    return apiRequest<ApiDeckSummary[]>('/decks', { method: 'GET', token })
  },

  create(token: string, name: string): Promise<ApiDeckDetail> {
    return apiRequest<ApiDeckDetail>('/decks', {
      method: 'POST',
      token,
      body: JSON.stringify({ name }),
    })
  },

  get(token: string, deckId: string): Promise<ApiDeckDetail> {
    return apiRequest<ApiDeckDetail>(`/decks/${deckId}`, { method: 'GET', token })
  },

  patch(token: string, deckId: string, name: string): Promise<ApiDeckDetail> {
    return apiRequest<ApiDeckDetail>(`/decks/${deckId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ name }),
    })
  },

  delete(token: string, deckId: string): Promise<void> {
    return apiRequest<void>(`/decks/${deckId}`, { method: 'DELETE', token })
  },

  listCards(token: string, deckId: string): Promise<ApiCard[]> {
    return apiRequest<ApiCard[]>(`/decks/${deckId}/cards`, { method: 'GET', token })
  },

  createCard(
    token: string,
    deckId: string,
    body: {
      hanzi: string
      pinyin: string
      meaning: string
      example?: string
      notes?: string | null
    },
  ): Promise<ApiCard> {
    return apiRequest<ApiCard>(`/decks/${deckId}/cards`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    })
  },

  getCard(token: string, deckId: string, cardId: string): Promise<ApiCard> {
    return apiRequest<ApiCard>(`/decks/${deckId}/cards/${cardId}`, {
      method: 'GET',
      token,
    })
  },

  patchCard(
    token: string,
    deckId: string,
    cardId: string,
    patch: Partial<{
      hanzi: string
      pinyin: string
      meaning: string
      example: string
      notes: string | null
    }>,
  ): Promise<ApiCard> {
    return apiRequest<ApiCard>(`/decks/${deckId}/cards/${cardId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(patch),
    })
  },

  deleteCard(token: string, deckId: string, cardId: string): Promise<void> {
    return apiRequest<void>(`/decks/${deckId}/cards/${cardId}`, {
      method: 'DELETE',
      token,
    })
  },
}
