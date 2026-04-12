<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import HanziWriterQuiz from '@/components/HanziWriterQuiz.vue'
import { studyApi } from '@/lib/api/study'
import { speakChinese } from '@/lib/speakZh'
import {
  buildShuffledStudyTasks,
  cjkGraphemesForWrite,
  kindsCompleteForCard,
  tasksAfterCardRemoved,
  type StudySessionTask,
  type StudyTaskKind,
} from '@/lib/studySessionTasks'
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

/** По умолчанию на сервере включён тройной квиз; до загрузки профиля считаем режим включённым. */
const tripleMode = computed(() => (auth.user ? auth.user.studyTripleMode : true))

const queue = ref<StudyQueueItem[]>([])
const queueLoading = ref(false)
const queueError = ref<string | null>(null)
const reviewLoading = ref(false)

const index = ref(0)
const flipped = ref(false)
const writeIndex = ref(0)
const writingDone = ref(false)

const sessionTasks = ref<StudySessionTask[]>([])
const taskIndex = ref(0)
/** Карточки, по которым в этой сессии было «Не знаю» (итоговый review). */
const sessionDontKnow = ref<Record<number, true>>({})
/** Завершённые виды шага по cardId. */
const sessionCompletedKinds = ref(new Map<number, Set<StudyTaskKind>>())

const tripleWriteIndex = ref(0)
const tripleWriteLoadFailed = ref(false)
const tripleQuizKey = ref(0)
/** Переворот карточки в шагах «перевод» / «иероглиф» тройного режима. */
const tripleQuizFlipped = ref(false)

const TAP_MAX_MOVE_PX = 14
const SWIPE_MIN_DX = 56

/** Указатель по карточке квиза (тап = переворот, свайп = ответ). */
const cardPointer = ref<{ x: number; y: number; pointerId: number } | null>(null)

function tripleQuizCardPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  cardPointer.value = { x: e.clientX, y: e.clientY, pointerId: e.pointerId }
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function tripleQuizCardPointerUp(e: PointerEvent) {
  const s = cardPointer.value
  cardPointer.value = null
  if (!s || s.pointerId !== e.pointerId || reviewLoading.value) return
  const dx = e.clientX - s.x
  const dy = e.clientY - s.y
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (tripleQuizFlipped.value && absDx >= SWIPE_MIN_DX && absDx > absDy * 1.12) {
    void completeTripleTask(dx > 0)
    return
  }
  if (Math.hypot(dx, dy) <= TAP_MAX_MOVE_PX) {
    tripleQuizFlipped.value = !tripleQuizFlipped.value
  }
}

function tripleQuizCardPointerCancel() {
  cardPointer.value = null
}

function speakTripleHanzi() {
  const hz = currentTask.value?.card.hanzi?.trim()
  if (currentTask.value?.kind === 'hanzi' && hz) speakChinese(hz)
}

function classicCardPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  cardPointer.value = { x: e.clientX, y: e.clientY, pointerId: e.pointerId }
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function classicCardPointerUp(e: PointerEvent) {
  const s = cardPointer.value
  cardPointer.value = null
  if (!s || s.pointerId !== e.pointerId || reviewLoading.value) return
  const dx = e.clientX - s.x
  const dy = e.clientY - s.y
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  const canSwipe =
    flipped.value && (!needWriting.value || writingDone.value)

  if (canSwipe && absDx >= SWIPE_MIN_DX && absDx > absDy * 1.12) {
    if (dx > 0) void submitReview('know')
    else void submitReview('dont_know')
    return
  }
  if (Math.hypot(dx, dy) <= TAP_MAX_MOVE_PX) {
    if (!flipped.value) {
      flipped.value = true
      writeIndex.value = 0
      writingDone.value = !needWriting.value
    } else {
      flipped.value = false
      writeIndex.value = 0
      writingDone.value = false
    }
  }
}

function classicCardPointerCancel() {
  cardPointer.value = null
}

function shuffleQueue<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function resetTripleSessionState() {
  sessionTasks.value = []
  taskIndex.value = 0
  sessionDontKnow.value = {}
  sessionCompletedKinds.value = new Map()
  tripleQuizFlipped.value = false
  resetTripleWriteState(true)
}

/** Сброс UI почерка; `remountQuiz` — пересоздать HanziWriter (назад, новая сессия, повтор после ошибки). */
function resetTripleWriteState(remountQuiz = false) {
  tripleWriteIndex.value = 0
  tripleWriteLoadFailed.value = false
  if (remountQuiz) tripleQuizKey.value += 1
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
    if (tripleMode.value) {
      sessionTasks.value = buildShuffledStudyTasks(queue.value, Math.random)
      taskIndex.value = 0
      sessionDontKnow.value = {}
      sessionCompletedKinds.value = new Map()
      tripleQuizFlipped.value = false
      resetTripleWriteState(true)
    } else {
      resetTripleSessionState()
    }
  } catch (e) {
    queueError.value = e instanceof Error ? e.message : 'Не удалось загрузить очередь'
    queue.value = []
    resetTripleSessionState()
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

watch(
  () => auth.user?.studyTripleMode,
  () => {
    if (auth.token) void loadQueue()
  },
)

const currentItem = computed(() => queue.value[index.value])
const current = computed(() => currentItem.value?.card)

const currentTask = computed(() => {
  const list = sessionTasks.value
  const i = taskIndex.value
  if (i < 0 || i >= list.length) return undefined
  return list[i]
})

watch(
  () =>
    [taskIndex.value, currentTask.value?.kind, currentTask.value?.card.id] as const,
  () => {
    tripleQuizFlipped.value = false
  },
)

const currentDeckLabel = computed(() => {
  const c = tripleMode.value ? currentTask.value?.card : current.value
  if (!c?.deckId) return null
  return decks.deckById(String(c.deckId))?.name ?? null
})

const charsToWrite = computed(() => {
  const c = current.value
  if (!c?.hanzi) return []
  return cjkGraphemesForWrite(c.hanzi)
})

const tripleCharsToWrite = computed(() => {
  const c = currentTask.value?.card
  if (!c?.hanzi) return []
  return cjkGraphemesForWrite(c.hanzi)
})

const tripleCurrentWriteChar = computed(() => tripleCharsToWrite.value[tripleWriteIndex.value] ?? '')

const needWriting = computed(
  () =>
    (auth.user?.requireHandwritingInStudy ?? false) && charsToWrite.value.length > 0,
)

const showWriting = computed(() => flipped.value && needWriting.value && !writingDone.value)

const currentWriteChar = computed(() => charsToWrite.value[writeIndex.value] ?? '')

function onStrokeQuizComplete(summary: {
  character: string
  totalMistakes: number
  writingStepIndex?: number
}) {
  if (summary.writingStepIndex !== undefined && summary.writingStepIndex !== writeIndex.value) return
  if (writeIndex.value + 1 >= charsToWrite.value.length) {
    writingDone.value = true
    return
  }
  writeIndex.value += 1
}

function onTripleStrokeQuizComplete(summary: {
  character: string
  totalMistakes: number
  writingStepIndex?: number
}) {
  if (summary.writingStepIndex !== undefined && summary.writingStepIndex !== tripleWriteIndex.value) return
  if (summary.totalMistakes > 0) {
    void completeTripleTask(false)
    return
  }
  if (tripleWriteIndex.value + 1 >= tripleCharsToWrite.value.length) {
    void completeTripleTask(true)
    return
  }
  tripleWriteIndex.value += 1
}

function onTripleWriterLoadError() {
  tripleWriteLoadFailed.value = true
}

function retryTripleWriter() {
  resetTripleWriteState(true)
}

async function completeTripleTask(know: boolean) {
  const task = sessionTasks.value[taskIndex.value]
  if (!task || reviewLoading.value) return
  const id = task.card.id
  if (!know) sessionDontKnow.value = { ...sessionDontKnow.value, [id]: true }

  let kinds = sessionCompletedKinds.value.get(id)
  if (!kinds) {
    kinds = new Set()
    sessionCompletedKinds.value.set(id, kinds)
  }
  kinds.add(task.kind)

  if (kindsCompleteForCard(task.card.hanzi, kinds)) {
    await finalizeTripleReview(id)
  } else {
    taskIndex.value += 1
    const next = sessionTasks.value[taskIndex.value]
    resetTripleWriteState(task.kind === 'write' || next?.kind === 'write')
  }
}

async function finalizeTripleReview(cardId: number) {
  const t = auth.token
  if (!t || reviewLoading.value) return
  const cur = sessionTasks.value[taskIndex.value]
  const currentOrder = cur?.order ?? 0
  reviewLoading.value = true
  try {
    const result = sessionDontKnow.value[cardId] ? 'dont_know' : 'know'
    await studyApi.review(t, { cardId, result })
    const { [cardId]: _omit, ...restFail } = sessionDontKnow.value
    sessionDontKnow.value = restFail
    sessionCompletedKinds.value.delete(cardId)
    const { nextTasks, nextIndex } = tasksAfterCardRemoved(sessionTasks.value, cardId, currentOrder)
    sessionTasks.value = nextTasks
    taskIndex.value = nextIndex
    resetTripleWriteState(true)
    if (nextTasks.length === 0) {
      await loadQueue()
    }
  } catch (e) {
    queueError.value = e instanceof Error ? e.message : 'Ошибка при сохранении ответа'
  } finally {
    reviewLoading.value = false
  }
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
  if (tripleMode.value) {
    if (taskIndex.value <= 0) return
    taskIndex.value -= 1
    resetTripleWriteState(true)
    return
  }
  if (index.value <= 0) return
  index.value -= 1
  flipped.value = false
  writeIndex.value = 0
  writingDone.value = false
}

const tripleProgressLabel = computed(
  () => `${taskIndex.value + 1} / ${sessionTasks.value.length}`,
)
const classicProgressLabel = computed(() => `${index.value + 1} / ${queue.value.length}`)

const tripleKindLabel = computed(() => {
  const k = currentTask.value?.kind
  if (k === 'meaning') return 'Перевод'
  if (k === 'hanzi') return 'Иероглиф'
  if (k === 'write') return 'Почерк по чертам'
  return ''
})
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

  <div v-else-if="queue.length === 0" class="study-empty-queue">
    <img
      class="study-empty-queue-logo"
      src="/app-logo.png"
      alt=""
      width="160"
      height="160"
      decoding="async"
    />
    <p class="empty study-empty-queue-msg">
      {{
        isGlobalStudy
          ? 'Сейчас нет карточек для повторения.'
          : 'Сейчас нет карточек для повторения в этой колоде.'
      }}
    </p>
  </div>

  <div v-else class="study">
    <p v-if="isGlobalStudy && currentDeckLabel" class="deck-tag">{{ currentDeckLabel }}</p>
    <p class="progress">{{ tripleMode ? tripleProgressLabel : classicProgressLabel }}</p>
    <p v-if="queueError" class="queue-err">{{ queueError }}</p>

    <!-- Тройной режим -->
    <template v-if="tripleMode && currentTask">
      <p class="triple-kind">{{ tripleKindLabel }}</p>

      <div v-if="taskIndex > 0" class="study-prev-row">
        <button
          type="button"
          class="btn btn-icon"
          aria-label="Предыдущий шаг"
          @click="prevCard"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div v-if="currentTask.kind === 'hanzi'" class="triple-speak-row">
        <button
          type="button"
          class="btn btn-icon triple-speak-btn"
          title="Прослушать произношение"
          aria-label="Прослушать произношение"
          @click="speakTripleHanzi"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"
            />
          </svg>
        </button>
      </div>

      <div
        v-if="currentTask.kind === 'meaning' || currentTask.kind === 'hanzi'"
        class="card triple-card flip-scene study-touch-card"
        :class="{ 'flip-scene--flipped': tripleQuizFlipped }"
        @pointerdown="tripleQuizCardPointerDown"
        @pointerup="tripleQuizCardPointerUp"
        @pointercancel="tripleQuizCardPointerCancel"
      >
        <div class="flip-inner">
          <div class="flip-face flip-front">
            <template v-if="currentTask.kind === 'meaning'">
              <p class="triple-meaning">{{ currentTask.card.meaning }}</p>
            </template>
            <template v-else>
              <span class="hanzi">{{ currentTask.card.hanzi }}</span>
            </template>
            <span v-if="!tripleQuizFlipped" class="tap-hint" aria-hidden="true">
              <svg class="tap-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </span>
            <span class="sr-only">Нажмите, чтобы перевернуть карточку и увидеть ответ</span>
          </div>
          <div class="flip-face flip-back">
            <template v-if="currentTask.kind === 'meaning'">
              <span class="hanzi">{{ currentTask.card.hanzi }}</span>
              <p v-if="currentTask.card.pinyin?.trim()" class="triple-flip-pinyin">
                {{ currentTask.card.pinyin }}
              </p>
            </template>
            <template v-else>
              <p class="triple-meaning">{{ currentTask.card.meaning }}</p>
            </template>
          </div>
        </div>
      </div>

      <template v-else-if="currentTask.kind === 'write'">
        <div class="writing-block">
          <h2 class="writing-head">
            <svg class="writing-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
              />
            </svg>
            По чертам (без подсказок)
          </h2>
          <p v-if="currentTask.card.meaning?.trim()" class="writing-meaning">{{ currentTask.card.meaning }}</p>
          <p class="sub">{{ tripleWriteIndex + 1 }} / {{ tripleCharsToWrite.length }}</p>
          <p v-if="tripleWriteLoadFailed" class="write-err">
            Не удалось загрузить данные написания.
            <button type="button" class="btn linkish" @click="retryTripleWriter">Повторить</button>
          </p>
          <HanziWriterQuiz
            v-if="!tripleWriteLoadFailed && tripleCurrentWriteChar"
            :key="`${tripleQuizKey}-${currentTask.card.id}-${tripleCurrentWriteChar}-${tripleWriteIndex}`"
            :char="tripleCurrentWriteChar"
            :writing-step-index="tripleWriteIndex"
            :pronunciation-text="
              tripleCharsToWrite.length > 1 ? currentTask.card.hanzi.trim() : undefined
            "
            :speak-on-start="tripleCharsToWrite.length <= 1 || tripleWriteIndex === 0"
            :show-hint-after-misses="false"
            :show-outline="false"
            :width="300"
            :height="300"
            @complete="onTripleStrokeQuizComplete"
            @load-error="onTripleWriterLoadError"
          />
        </div>
      </template>

      <div
        v-if="currentTask.kind === 'meaning' || currentTask.kind === 'hanzi'"
        class="row-actions study-actions study-answer-row"
      >
        <button
          type="button"
          class="btn btn-icon study-answer-btn"
          :disabled="reviewLoading || !tripleQuizFlipped"
          aria-label="Не знаю"
          @click="completeTripleTask(false)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <button
          type="button"
          class="btn primary btn-icon study-answer-btn"
          :disabled="reviewLoading || !tripleQuizFlipped"
          aria-label="Знаю"
          @click="completeTripleTask(true)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5" />
          </svg>
        </button>
      </div>
      <div v-else-if="currentTask.kind === 'write'" class="row-actions study-actions">
        <button
          type="button"
          class="btn btn-icon"
          :disabled="reviewLoading"
          aria-label="Не знаю"
          @click="completeTripleTask(false)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </template>

    <!-- Классический режим -->
    <template v-else-if="!tripleMode && current">
      <div class="study-prev-row">
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
      </div>

      <div
        class="card study-touch-card"
        @pointerdown="classicCardPointerDown"
        @pointerup="classicCardPointerUp"
        @pointercancel="classicCardPointerCancel"
      >
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
        <p v-if="current.meaning?.trim()" class="writing-meaning">{{ current.meaning }}</p>
        <p class="sub">{{ writeIndex + 1 }} / {{ charsToWrite.length }}</p>
        <HanziWriterQuiz
          :key="`${current?.id}-${currentWriteChar}-${writeIndex}`"
          :char="currentWriteChar"
          :writing-step-index="writeIndex"
          :pronunciation-text="charsToWrite.length > 1 && current ? current.hanzi.trim() : undefined"
          :speak-on-start="charsToWrite.length <= 1 || writeIndex === 0"
          :width="300"
          :height="300"
          @complete="onStrokeQuizComplete"
        />
      </div>

      <div
        v-if="flipped && (!needWriting || writingDone)"
        class="row-actions study-actions study-answer-row"
      >
        <button
          type="button"
          class="btn btn-icon study-answer-btn"
          :disabled="reviewLoading"
          aria-label="Не знаю"
          @click="submitReview('dont_know')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <button
          type="button"
          class="btn primary btn-icon study-answer-btn"
          :disabled="reviewLoading"
          aria-label="Знаю"
          @click="submitReview('know')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5" />
          </svg>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.study {
  text-align: center;
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
.triple-kind {
  font-size: 0.95rem;
  color: var(--accent);
  margin: 0 0 0.5rem;
  font-weight: 600;
}
.triple-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 1rem;
  min-height: 12rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  margin-bottom: 1rem;
}
.card.triple-card.flip-scene {
  display: block;
  padding: 0;
  min-height: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  perspective: 900px;
}
.card.triple-card.flip-scene.flip-scene--flipped {
  cursor: pointer;
}
.study-touch-card {
  touch-action: manipulation;
}
.card.study-touch-card:not(.triple-card) {
  cursor: pointer;
}
.study-prev-row {
  display: flex;
  justify-content: flex-start;
  margin: 0 0 0.65rem;
}
.triple-speak-row {
  display: flex;
  justify-content: center;
  margin: 0 0 0.65rem;
}
.row-actions.study-answer-row {
  justify-content: space-between;
  width: 100%;
  box-sizing: border-box;
}
button.study-answer-btn {
  min-width: 5.8rem;
  min-height: 5.8rem;
  width: 5.8rem;
  height: 5.8rem;
}
button.study-answer-btn svg {
  width: 3rem;
  height: 3rem;
}
.flip-inner {
  display: grid;
  min-height: 12rem;
  transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1);
  border-radius: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
}
.card.triple-card.flip-scene.flip-scene--flipped .flip-inner {
  transform: rotateY(180deg);
}
.flip-face {
  grid-area: 1 / 1;
  width: 100%;
  padding: 1.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.flip-back {
  transform: rotateY(180deg);
}
.triple-meaning {
  margin: 0;
  font-size: 1.35rem;
  color: var(--text-h);
  line-height: 1.45;
}
.triple-flip-pinyin {
  margin: 0.65rem 0 0;
  font-size: 1.25rem;
  color: var(--accent);
  line-height: 1.35;
}
.write-err {
  color: var(--danger);
  margin: 0 0 0.75rem;
}
.linkish {
  margin-left: 0.35rem;
  padding: 0.15rem 0.5rem;
  font-size: inherit;
  vertical-align: baseline;
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
.writing-meaning {
  margin: 0 0 0.65rem;
  font-size: 1.2rem;
  color: var(--text-h);
  line-height: 1.45;
}
.study-actions {
  justify-content: center;
}
.study-empty-queue {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 1.25rem;
  padding: 1rem;
  box-sizing: border-box;
}
.study-empty-queue-logo {
  width: min(42vw, 10rem);
  height: auto;
  aspect-ratio: 1;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 10px 28px color-mix(in srgb, var(--accent) 22%, transparent));
}
.study-empty-queue-msg {
  margin: 0;
  max-width: 22rem;
  padding: 0;
}
</style>
