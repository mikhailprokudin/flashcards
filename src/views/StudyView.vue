<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import HanziWriterQuiz from '@/components/HanziWriterQuiz.vue'
import { graphemes } from '@/lib/graphemes'
import { useDecksStore } from '@/stores/decks'
import { useSettingsStore } from '@/stores/settings'
import type { Card } from '@/types'

const route = useRoute()
const decks = useDecksStore()
const settings = useSettingsStore()

const deckId = computed(() => route.params.deckId as string)
const deck = computed(() => decks.deckById(deckId.value))

const queue = ref<Card[]>([])
const index = ref(0)
const flipped = ref(false)
const writeIndex = ref(0)
const writingDone = ref(false)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

watch(
  deck,
  (d) => {
    if (!d || d.cards.length === 0) {
      queue.value = []
      return
    }
    queue.value = shuffle(d.cards)
    index.value = 0
    flipped.value = false
    writeIndex.value = 0
    writingDone.value = false
  },
  { immediate: true },
)

const current = computed(() => queue.value[index.value])

const charsToWrite = computed(() => {
  const c = current.value
  if (!c?.hanzi) return []
  return graphemes(c.hanzi.trim())
})

const needWriting = computed(
  () => settings.requireHandwritingInStudy && charsToWrite.value.length > 0,
)

const showWriting = computed(() => flipped.value && needWriting.value && !writingDone.value)

const currentWriteChar = computed(() => charsToWrite.value[writeIndex.value] ?? '')

function flip() {
  flipped.value = true
  writeIndex.value = 0
  writingDone.value = !needWriting.value
}

function onStrokeQuizComplete() {
  if (writeIndex.value + 1 >= charsToWrite.value.length) {
    writingDone.value = true
    return
  }
  writeIndex.value += 1
}

function nextCard() {
  if (!flipped.value) return
  if (needWriting.value && !writingDone.value) return
  index.value = (index.value + 1) % queue.value.length
  flipped.value = false
  writeIndex.value = 0
  writingDone.value = false
}

function prevCard() {
  index.value = (index.value - 1 + queue.value.length) % queue.value.length
  flipped.value = false
  writeIndex.value = 0
  writingDone.value = false
}
</script>

<template>
  <div v-if="!deck">
    <p class="empty">Колода не найдена.</p>
    <RouterLink to="/">← Назад</RouterLink>
  </div>

  <div v-else-if="deck.cards.length === 0">
    <p class="empty">В колоде нет карточек.</p>
    <RouterLink :to="`/deck/${deckId}`">← К колоде</RouterLink>
  </div>

  <div v-else class="study">
    <p><RouterLink :to="`/deck/${deckId}`">← {{ deck.name }}</RouterLink></p>
    <p class="progress">{{ index + 1 }} / {{ queue.length }}</p>

    <div class="card" @click="!flipped && flip()">
      <template v-if="current">
        <div v-if="!flipped" class="face front">
          <span class="hanzi">{{ current.hanzi }}</span>
          <span class="tap-hint">Нажмите, чтобы перевернуть</span>
        </div>
        <div v-else class="face back">
          <p class="line hanzi-line">{{ current.hanzi }}</p>
          <p class="line pinyin">{{ current.pinyin }}</p>
          <p class="line meaning">{{ current.meaning }}</p>
          <p v-if="current.example" class="line example">{{ current.example }}</p>
        </div>
      </template>
    </div>

    <div v-if="showWriting" class="writing-block">
      <h2>Напишите по чертам</h2>
      <p class="sub">Иероглиф {{ writeIndex + 1 }} из {{ charsToWrite.length }}</p>
      <HanziWriterQuiz
        :key="`${current?.id}-${currentWriteChar}-${writeIndex}`"
        :char="currentWriteChar"
        :pronunciation-text="charsToWrite.length > 1 && current ? current.hanzi.trim() : undefined"
        :speak-on-start="charsToWrite.length <= 1 || writeIndex === 0"
        :width="300"
        :height="300"
        @complete="onStrokeQuizComplete"
      />
    </div>

    <div class="row-actions">
      <button type="button" :disabled="index === 0" @click="prevCard">Назад</button>
      <button
        v-if="flipped && (!needWriting || writingDone)"
        type="button"
        class="primary"
        @click="nextCard"
      >
        Дальше
      </button>
    </div>
  </div>
</template>

<style scoped>
.study {
  text-align: center;
}
.progress {
  font-size: 0.875rem;
  color: var(--text);
  margin-bottom: 1rem;
}
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 1rem;
  min-height: 12rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  margin-bottom: 1rem;
  cursor: default;
}
.face {
  width: 100%;
}
.front {
  cursor: pointer;
}
.hanzi {
  font-family: var(--font-hanzi), var(--sans);
  font-size: 3rem;
  font-weight: 500;
  display: block;
}
.tap-hint {
  display: block;
  margin-top: 1rem;
  font-size: 0.8rem;
  color: var(--text);
}
.back {
  text-align: left;
}
.line {
  margin: 0 0 0.5rem;
}
.pinyin {
  font-size: 1.15rem;
  color: var(--accent);
}
.meaning {
  font-size: 1rem;
  color: var(--text-h);
}
.example {
  font-size: 0.95rem;
  color: var(--text);
  font-family: var(--font-hanzi), var(--sans);
}
.writing-block {
  margin: 1.5rem 0;
  padding: 1rem;
  border: 1px dashed var(--border);
  border-radius: 0.75rem;
}
.writing-block h2 {
  font-size: 1rem;
}
.sub {
  font-size: 0.875rem;
  color: var(--text);
  margin-bottom: 0.75rem;
}
</style>
