import { defineStore } from 'pinia'
import type { ApiCard } from '@/lib/api/decks'
import { decksApi } from '@/lib/api/decks'
import { useAuthStore } from '@/stores/auth'
import type { Card, Deck } from '@/types'

function mapCard(row: ApiCard): Card {
  return {
    id: String(row.id),
    hanzi: row.hanzi,
    pinyin: row.pinyin,
    meaning: row.meaning,
    example: row.example || undefined,
    notes: row.notes ?? undefined,
  }
}

export const useDecksStore = defineStore('decks', {
  state: () => ({
    summaries: [] as Array<{
      id: string
      name: string
      createdAt: string
      cardCount: number
    }>,
    cardsByDeckId: {} as Record<string, Card[]>,
    listLoading: false,
    listError: null as string | null,
    detailLoading: {} as Record<string, boolean>,
  }),
  getters: {
    deckById: (state) => (id: string): Deck | undefined => {
      const s = state.summaries.find((d) => d.id === id)
      if (!s) return undefined
      return {
        id: s.id,
        name: s.name,
        createdAt: s.createdAt,
        cardCount: s.cardCount,
        cards: state.cardsByDeckId[id] ?? [],
      }
    },
  },
  actions: {
    tokenOrThrow(): string {
      const t = useAuthStore().token
      if (!t) throw new Error('Not authenticated')
      return t
    },

    reset() {
      this.summaries = []
      this.cardsByDeckId = {}
      this.listLoading = false
      this.listError = null
      this.detailLoading = {}
    },

    async fetchList() {
      const token = this.tokenOrThrow()
      this.listLoading = true
      this.listError = null
      try {
        const rows = await decksApi.list(token)
        this.summaries = rows.map((r) => ({
          id: String(r.id),
          name: r.name,
          createdAt: r.createdAt,
          cardCount: r.cardCount,
        }))
        for (const id of Object.keys(this.cardsByDeckId)) {
          if (!this.summaries.some((s) => s.id === id)) {
            delete this.cardsByDeckId[id]
          }
        }
      } catch (e) {
        this.listError = e instanceof Error ? e.message : 'Ошибка загрузки'
        throw e
      } finally {
        this.listLoading = false
      }
    },

    async ensureDeckCards(deckId: string) {
      if (this.cardsByDeckId[deckId]) return
      const token = this.tokenOrThrow()
      this.detailLoading[deckId] = true
      try {
        const rows = await decksApi.listCards(token, deckId)
        this.cardsByDeckId[deckId] = rows.map(mapCard)
      } finally {
        this.detailLoading[deckId] = false
      }
    },

    async addDeck(name: string) {
      const token = this.tokenOrThrow()
      const row = await decksApi.create(token, name.trim() || 'Без названия')
      const id = String(row.id)
      this.summaries.unshift({
        id,
        name: row.name,
        createdAt: row.createdAt,
        cardCount: 0,
      })
      this.cardsByDeckId[id] = []
      return id
    },

    async renameDeck(deckId: string, name: string) {
      const token = this.tokenOrThrow()
      const row = await decksApi.patch(token, deckId, name.trim() || 'Без названия')
      const s = this.summaries.find((x) => x.id === deckId)
      if (s) s.name = row.name
    },

    async deleteDeck(deckId: string) {
      const token = this.tokenOrThrow()
      await decksApi.delete(token, deckId)
      const i = this.summaries.findIndex((x) => x.id === deckId)
      if (i !== -1) this.summaries.splice(i, 1)
      delete this.cardsByDeckId[deckId]
    },

    async addCard(deckId: string, card: Omit<Card, 'id'>) {
      const token = this.tokenOrThrow()
      const row = await decksApi.createCard(token, deckId, {
        hanzi: card.hanzi,
        pinyin: card.pinyin,
        meaning: card.meaning,
        example: card.example,
        notes: card.notes ?? null,
      })
      const list = this.cardsByDeckId[deckId] ?? []
      list.push(mapCard(row))
      this.cardsByDeckId[deckId] = list
      const s = this.summaries.find((x) => x.id === deckId)
      if (s) s.cardCount += 1
    },

    async updateCard(deckId: string, cardId: string, patch: Partial<Card>) {
      const token = this.tokenOrThrow()
      const body: Partial<{
        hanzi: string
        pinyin: string
        meaning: string
        example: string
        notes: string | null
      }> = {}
      if (patch.hanzi !== undefined) body.hanzi = patch.hanzi
      if (patch.pinyin !== undefined) body.pinyin = patch.pinyin
      if (patch.meaning !== undefined) body.meaning = patch.meaning
      if (patch.example !== undefined) body.example = patch.example
      if (patch.notes !== undefined) body.notes = patch.notes ?? null
      const row = await decksApi.patchCard(token, deckId, cardId, body)
      const list = this.cardsByDeckId[deckId]
      if (!list) return
      const c = list.find((x) => x.id === cardId)
      if (!c) return
      Object.assign(c, mapCard(row))
    },

    async deleteCard(deckId: string, cardId: string) {
      const token = this.tokenOrThrow()
      await decksApi.deleteCard(token, deckId, cardId)
      const list = this.cardsByDeckId[deckId]
      if (list) {
        const i = list.findIndex((x) => x.id === cardId)
        if (i !== -1) list.splice(i, 1)
      }
      const s = this.summaries.find((x) => x.id === deckId)
      if (s && s.cardCount > 0) s.cardCount -= 1
    },

    async refreshCard(deckId: string, cardId: string) {
      const token = this.tokenOrThrow()
      const row = await decksApi.getCard(token, deckId, cardId)
      const list = this.cardsByDeckId[deckId]
      if (!list) return
      const i = list.findIndex((x) => x.id === cardId)
      const mapped = mapCard(row)
      if (i === -1) list.push(mapped)
      else list[i] = mapped
    },
  },
})
