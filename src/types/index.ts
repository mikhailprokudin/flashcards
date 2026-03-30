export interface Card {
  id: string
  hanzi: string
  pinyin: string
  meaning: string
  example?: string
  notes?: string
}

export interface Deck {
  id: string
  name: string
  cards: Card[]
  createdAt: number
}
