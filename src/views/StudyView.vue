<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import HanziWriterQuiz from '@/components/HanziWriterQuiz.vue'
import { studyApi } from '@/lib/api/study'
import { graphemes } from '@/lib/graphemes'
import { useAuthStore } from '@/stores/auth'
import { useDecksStore } from '@/stores/decks'
import type { StudyQueueItem } from '@/lib/api/study'

const route = useRoute()
const auth = useAuthStore()
const decks = useDecksStore()

const deckId = computed(() => route.params.deckId as string | undefined)
const isGlobalStudy = computed(() => deckId.value == null || deckId.value === '')
const deck = computed(() => (deckId.value ? decks.deckById(deckId.value) : undefined))
const deckMissing = computed(() => Boolean(deckId.value) && !deck.value)

const queue = ref<StudyQueueItem[]>([])
const queueLoading = ref(false)
const queueError = ref<string | null>(null)
const reviewLoading = ref(false)

const index = ref(0)
const flipped = ref(false)
const writeIndex = ref(0)
const writingDone = ref(false)

function shuffleQueue<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function loadQueue() {
  const t = auth.token
  if (!t) return
  queueLoading.value = true
  queueError.value = null
  try {
    const { items } = isGlobalStudy.value
      ? await studyApi.queueAll(t, { limit: 50, maxNew: 10 })
      : await studyApi.queue(t, deckId.value!, { limit: 50, maxNew: 10 })
    queue.value = shuffleQueue(items)
    index.value = 0
    flipped.value = false
    writeIndex.value = 0
    writingDone.value = false
  } catch (e) {
    queueError.value = e instanceof Error ? e.message : 'Не удалось загрузить очередь'
    queue.value = []
  } finally {
    queueLoading.value = false
  }
}

watch(
  () => [deckId.value, route.name] as const,
  async () => {
    await decks.fetchList().catch(() => {})
    void loadQueue()
  },
  { immediate: true },
)

const currentItem = computed(() => queue.value[index.value])

const current = computed(() => currentItem.value?.card)

const currentDeckLabel = computed(() => {
  const c = current.value
  if (!c?.deckId) return null
  return decks.deckById(String(c.deckId))?.name ?? null
})

const charsToWrite = computed(() => {
  const c = current.value
  if (!c?.hanzi) return []
  return graphemes(c.hanzi.trim())
})

const needWriting = computed(
  () =>
    (auth.user?.requireHandwritingInStudy ?? false) && charsToWrite.value.length > 0,
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

async function submitReview(result: 'know' | 'dont_know') {
  const t = auth.token
  const card = current.value
  if (!t || !card || reviewLoading.value) return
  reviewLoading.value = true
  try {
    await studyApi.review(t, { cardId: card.id, result })
    index.value += 1
    if (index.value >= queue.value.length) {
      await loadQueue()
    } else {
      flipped.value = false
      writeIndex.value = 0
      writingDone.value = false
    }
  } catch (e) {
    queueError.value = e instanceof Error ? e.message : 'Ошибка при сохранении ответа'
  } finally {
    reviewLoading.value = false
  }
}

function prevCard() {
  if (index.value <= 0) return
  index.value -= 1
  flipped.value = false
  writeIndex.value = 0
  writingDone.value = false
}
</script>

<template>
  <div v-if="deckMissing">
    <p class="empty">Колода не найдена.</p>
    <RouterLink class="btn btn-icon" :to="{ name: 'decks' }" aria-label="К списку колод">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
    </RouterLink>
  </div>

  <div v-else-if="queueLoading && queue.length === 0">
    <p class="empty">Загрузка очереди…</p>
    <RouterLink
      v-if="deckId"
      class="btn btn-icon"
      :to="`/deck/${deckId}`"
      aria-label="Назад к колоде"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
    </RouterLink>
    <RouterLink v-else class="btn btn-icon" to="/" aria-label="На главную">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
    </RouterLink>
  </div>

  <div v-else-if="queueError && queue.length === 0">
    <p class="empty">{{ queueError }}</p>
    <RouterLink
      v-if="deckId"
      class="btn btn-icon"
      :to="`/deck/${deckId}`"
      aria-label="Назад к колоде"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
    </RouterLink>
    <RouterLink v-else class="btn btn-icon" to="/" aria-label="На главную">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
    </RouterLink>
  </div>

  <div v-else-if="queue.length === 0">
    <p class="empty">
      {{
        isGlobalStudy
          ? 'Сейчас нет карточек для повторения.'
          : 'Сейчас нет карточек для повторения в этой колоде.'
      }}
    </p>
    <RouterLink
      v-if="deckId"
      class="btn btn-icon"
      :to="`/deck/${deckId}`"
      aria-label="Назад к колоде"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
    </RouterLink>
    <RouterLink v-else class="btn btn-icon" to="/" aria-label="На главную">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
    </RouterLink>
  </div>

  <div v-else class="study">
    <p v-if="deck" class="nav-back">
      <RouterLink
        class="btn btn-icon"
        :to="`/deck/${deckId}`"
        :aria-label="`К колоде «${deck.name}»`"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
      </RouterLink>
      <span class="nav-back-text">{{ deck.name }}</span>
    </p>
    <p v-else class="nav-back">
      <RouterLink class="btn btn-icon" to="/" aria-label="На главную">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
      </RouterLink>
    </p>
    <p v-if="isGlobalStudy && currentDeckLabel" class="deck-tag">{{ currentDeckLabel }}</p>
    <p class="progress">{{ index + 1 }} / {{ queue.length }}</p>
    <p v-if="queueError" class="queue-err">{{ queueError }}</p>

    <div class="card" @click="!flipped && flip()">
      <template v-if="current">
        <div v-if="!flipped" class="face front">
          <span class="hanzi">{{ current.hanzi }}</span>
          <span class="tap-hint" aria-hidden="true">
            <svg class="tap-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </span>
          <span class="sr-only">Нажмите, чтобы перевернуть карточку</span>
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
      <h2 class="writing-head">
        <svg class="writing-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
          />
        </svg>
        По чертам
      </h2>
      <p class="sub">{{ writeIndex + 1 }} / {{ charsToWrite.length }}</p>
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

    <div class="row-actions study-actions">
      <button
        type="button"
        class="btn btn-icon"
        :disabled="index === 0"
        aria-label="Предыдущая карточка"
        @click="prevCard"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <template v-if="flipped && (!needWriting || writingDone)">
        <button
          type="button"
          class="btn primary btn-icon"
          :disabled="reviewLoading"
          aria-label="Знаю"
          @click="submitReview('know')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5" />
          </svg>
        </button>
        <button
          type="button"
          class="btn btn-icon"
          :disabled="reviewLoading"
          aria-label="Не знаю"
          @click="submitReview('dont_know')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.study {
  text-align: center;
}
.nav-back {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0 0 0.35rem;
  flex-wrap: wrap;
}
.nav-back-text {
  font-size: 1rem;
  color: var(--text-h);
  max-width: min(100%, 16rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.deck-tag {
  font-size: 0.95rem;
  color: var(--text);
  margin: -0.15rem 0 0.75rem;
}
.progress {
  font-size: 0.95rem;
  color: var(--text);
  margin-bottom: 1rem;
}
.queue-err {
  font-size: 0.95rem;
  color: #c62828;
  margin-bottom: 0.75rem;
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
  font-size: 3.25rem;
  font-weight: 500;
  display: block;
}
.tap-hint {
  display: flex;
  margin-top: 1rem;
  justify-content: center;
  color: var(--text);
  opacity: 0.85;
}
.tap-ico {
  width: 2rem;
  height: 2rem;
}
.back {
  text-align: left;
}
.line {
  margin: 0 0 0.5rem;
}
.pinyin {
  font-size: 1.25rem;
  color: var(--accent);
}
.meaning {
  font-size: 1.08rem;
  color: var(--text-h);
}
.example {
  font-size: 1.02rem;
  color: var(--text);
  font-family: var(--font-hanzi), var(--sans);
}
.writing-block {
  margin: 1.5rem 0;
  padding: 1.1rem;
  border: 1px dashed var(--border);
  border-radius: 0.75rem;
}
.writing-head {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  font-size: 1.15rem;
  margin: 0 0 0.35rem;
}
.writing-ico {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}
.sub {
  font-size: 0.95rem;
  color: var(--text);
  margin-bottom: 0.75rem;
}
.study-actions {
  justify-content: center;
}
</style>
