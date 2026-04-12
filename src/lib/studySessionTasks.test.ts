import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ApiCard } from './api/decks'
import {
  buildShuffledStudyTasks,
  cjkGraphemesForWrite,
  kindsCompleteForCard,
  kindsForCard,
  tasksAfterCardRemoved,
  type StudyTaskKind,
} from './studySessionTasks'

function card(id: number, hanzi: string): ApiCard {
  return {
    id,
    deckId: 1,
    hanzi,
    pinyin: 'x',
    meaning: 'm',
    example: '',
    notes: null,
    createdAt: new Date().toISOString(),
  }
}

describe('studySessionTasks', () => {
  it('kindsForCard includes write when hanzi has graphemes', () => {
    assert.deepEqual(kindsForCard('你好'), ['meaning', 'hanzi', 'write'])
  })

  it('cjkGraphemesForWrite splits Han even with zero-width between chars', () => {
    assert.deepEqual(cjkGraphemesForWrite('你\u200c好'), ['你', '好'])
  })

  it('cjkGraphemesForWrite includes supplementary-plane Han', () => {
    assert.deepEqual(cjkGraphemesForWrite('𠮷'), ['𠮷'])
  })

  it('kindsForCard omits write when no CJK graphemes', () => {
    assert.deepEqual(kindsForCard('   '), ['meaning', 'hanzi'])
  })

  it('buildShuffledStudyTasks produces correct counts per card (seeded)', () => {
    let s = 12345
    const rand = () => {
      s = (s * 16807) % 2147483647
      return (s - 1) / 2147483646
    }
    const items = [{ card: card(1, '甲') }, { card: card(2, 'ab') }]
    const tasks = buildShuffledStudyTasks(items, rand)
    assert.equal(tasks.length, 5)
    const byId = new Map<number, number>()
    for (const t of tasks) {
      byId.set(t.card.id, (byId.get(t.card.id) ?? 0) + 1)
    }
    assert.equal(byId.get(1), 3)
    assert.equal(byId.get(2), 2)
    const orders = tasks.map((t) => t.order).sort((a, b) => a - b)
    assert.deepEqual(orders, [0, 1, 2, 3, 4])
  })

  it('kindsCompleteForCard', () => {
    const done = new Set<StudyTaskKind>(['meaning', 'hanzi'])
    assert.equal(kindsCompleteForCard('x', done), true)
    assert.equal(kindsCompleteForCard('好', done), false)
    done.add('write')
    assert.equal(kindsCompleteForCard('好', done), true)
  })

  it('tasksAfterCardRemoved picks next order after current', () => {
    const c1 = card(1, 'a')
    const c2 = card(2, 'b')
    const tasks = [
      { order: 0, card: c1, kind: 'meaning' as const },
      { order: 1, card: c2, kind: 'hanzi' as const },
      { order: 2, card: c1, kind: 'write' as const },
      { order: 3, card: c2, kind: 'meaning' as const },
    ]
    const { nextTasks, nextIndex } = tasksAfterCardRemoved(tasks, 1, 2)
    assert.equal(nextTasks.length, 2)
    assert.equal(nextTasks[nextIndex]!.order, 3)
  })

  it('tasksAfterCardRemoved falls back to smallest order when none larger', () => {
    const c1 = card(1, 'a')
    const c2 = card(2, 'b')
    const tasks = [
      { order: 0, card: c2, kind: 'meaning' as const },
      { order: 1, card: c1, kind: 'hanzi' as const },
    ]
    const { nextTasks, nextIndex } = tasksAfterCardRemoved(tasks, 1, 1)
    assert.equal(nextTasks.length, 1)
    assert.equal(nextTasks[nextIndex]!.card.id, 2)
    assert.equal(nextTasks[nextIndex]!.order, 0)
  })
})
