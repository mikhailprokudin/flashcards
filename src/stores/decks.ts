import { defineStore } from 'pinia'
import { loadDecks, saveDecks } from '@/lib/storage'
import type { Card, Deck } from '@/types'

function newId(): string {
  return crypto.randomUUID()
}

export const useDecksStore = defineStore('decks', {
  state: () => ({
    decks: loadDecks() as Deck[],
  }),
  getters: {
    deckById: (state) => {
      return (id: string) => state.decks.find((d) => d.id === id)
    },
  },
  actions: {
    persist() {
      saveDecks(this.decks)
    },
    addDeck(name: string) {
      const deck: Deck = {
        id: newId(),
        name: name.trim() || 'Без названия',
        cards: [],
        createdAt: Date.now(),
      }
      this.decks.unshift(deck)
      this.persist()
      return deck.id
    },
    renameDeck(deckId: string, name: string) {
      const d = this.decks.find((x) => x.id === deckId)
      if (!d) return
      d.name = name.trim() || 'Без названия'
      this.persist()
    },
    deleteDeck(deckId: string) {
      const i = this.decks.findIndex((x) => x.id === deckId)
      if (i === -1) return
      this.decks.splice(i, 1)
      this.persist()
    },
    addCard(deckId: string, card: Omit<Card, 'id'>) {
      const d = this.decks.find((x) => x.id === deckId)
      if (!d) return
      d.cards.push({
        id: newId(),
        ...card,
      })
      this.persist()
    },
    updateCard(deckId: string, cardId: string, patch: Partial<Card>) {
      const d = this.decks.find((x) => x.id === deckId)
      if (!d) return
      const c = d.cards.find((x) => x.id === cardId)
      if (!c) return
      Object.assign(c, patch)
      this.persist()
    },
    deleteCard(deckId: string, cardId: string) {
      const d = this.decks.find((x) => x.id === deckId)
      if (!d) return
      const i = d.cards.findIndex((x) => x.id === cardId)
      if (i === -1) return
      d.cards.splice(i, 1)
      this.persist()
    },
  },
})
