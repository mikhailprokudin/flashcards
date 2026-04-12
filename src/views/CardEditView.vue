<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import HanziWriterQuiz from '@/components/HanziWriterQuiz.vue'
import HandwritingPad from '@/components/HandwritingPad.vue'
import { useHandwritingRecognizer } from '@/composables/useHandwritingRecognizer'
import { graphemes } from '@/lib/graphemes'
import { suggestPinyinAndMeaning } from '@/lib/hanziSuggest'
import { useDecksStore } from '@/stores/decks'
import type { Card } from '@/types'

const route = useRoute()
const router = useRouter()
const decks = useDecksStore()
const { initLoading, initError, ensureInit, recognize } = useHandwritingRecognizer()

const deckId = computed(() => route.params.deckId as string)
const cardId = computed(() => route.params.cardId as string | undefined)
const isNew = computed(() => route.name === 'card-new' || !cardId.value)

const deck = computed(() => decks.deckById(deckId.value))
const existing = computed(() =>
  !isNew.value && cardId.value ? deck.value?.cards.find((c) => c.id === cardId.value) : undefined,
)

const hanzi = ref('')
const pinyin = ref('')
const meaning = ref('')
const example = ref('')
const notes = ref('')

watch(
  existing,
  (c) => {
    if (c) {
      hanzi.value = c.hanzi
      pinyin.value = c.pinyin
      meaning.value = c.meaning
      example.value = c.example ?? ''
      notes.value = c.notes ?? ''
    } else if (isNew.value) {
      hanzi.value = ''
      pinyin.value = ''
      meaning.value = ''
      example.value = ''
      notes.value = ''
    }
  },
  { immediate: true },
)

const saveError = ref<string | null>(null)

onMounted(() => {
  void (async () => {
    try {
      await decks.fetchList()
    } catch {
      /* listError в store */
    }
    void decks.ensureDeckCards(deckId.value).catch(() => {
      saveError.value = 'Не удалось загрузить данные колоды'
    })
  })()
})

const drawOpen = ref(false)

/** Редактирование: пошаговый quiz по эталону hanzi-writer */
const drawQueue = ref<string[]>([])
const drawIndex = ref(0)
const drawBuilt = ref('')

/** Новая карточка: свободный рисунок + распознавание (по одному иероглифу, затем сбор слова) */
type NewDrawPhase = 'draw' | 'pick' | 'compose'
const newDrawPhase = ref<NewDrawPhase>('draw')
/** Уже выбранные при рисовании иероглифы (например 你 → 你好) */
const drawComposedHanzi = ref('')
const candidates = ref<string[]>([])
const recognizeLoading = ref(false)
const recognizeError = ref<string | null>(null)
const suggestLoading = ref(false)
const suggestInlineError = ref<string | null>(null)
const padKey = ref(0)

const HAN_REGEX = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/

function hanziHasCjk(s: string): boolean {
  return HAN_REGEX.test(s.trim())
}

let typedSuggestTimer: ReturnType<typeof setTimeout> | null = null

/** Пиньинь и перевод из текста поля 汉字 (как после выбора кандидата с рисунка). */
async function fetchAndApplySuggest(raw: string, replaceHanzi: string | null) {
  const hz = raw.trim()
  if (!hz) return
  suggestInlineError.value = null
  recognizeError.value = null
  suggestLoading.value = true
  try {
    const s = await suggestPinyinAndMeaning(hz)
    if (replaceHanzi !== null) hanzi.value = replaceHanzi
    pinyin.value = s.pinyin
    meaning.value = s.meaning || meaning.value
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ошибка подсказки'
    if (drawOpen.value) recognizeError.value = msg
    else suggestInlineError.value = msg
  } finally {
    suggestLoading.value = false
  }
}

async function suggestFromTypedField() {
  await fetchAndApplySuggest(hanzi.value, null)
}

async function openDraw() {
  drawOpen.value = true
  recognizeError.value = null
  if (isNew.value) {
    newDrawPhase.value = 'draw'
    drawComposedHanzi.value = ''
    candidates.value = []
    padKey.value += 1
    void ensureInit().catch(() => {
      /* initError в composable */
    })
    return
  }
  const g = graphemes(hanzi.value.trim())
  drawQueue.value = g.length ? [...g] : []
  drawIndex.value = 0
  drawBuilt.value = ''
}

const currentDrawChar = computed(() => drawQueue.value[drawIndex.value] ?? '')
const showWriterQuiz = computed(() => !isNew.value && drawOpen.value && currentDrawChar.value !== '')

async function onHandwritingSubmit(strokeData: number[]) {
  recognizeError.value = null
  recognizeLoading.value = true
  candidates.value = []
  try {
    await ensureInit()
    const list = await recognize(strokeData)
    candidates.value = list.slice(0, 12)
    newDrawPhase.value = 'pick'
    if (candidates.value.length === 0) {
      recognizeError.value = 'Не удалось сопоставить рисунок с иероглифом. Попробуйте ещё раз.'
      newDrawPhase.value = 'draw'
    }
  } catch (e) {
    recognizeError.value = e instanceof Error ? e.message : 'Ошибка распознавания'
    newDrawPhase.value = 'draw'
  } finally {
    recognizeLoading.value = false
  }
}

function backToDraw() {
  newDrawPhase.value = 'draw'
  candidates.value = []
  recognizeError.value = null
  padKey.value += 1
}

/** Выбран иероглиф с распознавания — добавляем к слову, дальше можно дорисовать следующий */
function selectCandidate(char: string) {
  drawComposedHanzi.value += char
  newDrawPhase.value = 'compose'
  candidates.value = []
  recognizeError.value = null
}

function addAnotherDrawnChar() {
  newDrawPhase.value = 'draw'
  padKey.value += 1
}

async function applyComposedDrawAndClose() {
  const hz = drawComposedHanzi.value.trim()
  if (!hz) return
  await fetchAndApplySuggest(hz, hz)
  drawOpen.value = false
}

function removeLastDrawnChar() {
  const s = drawComposedHanzi.value
  if (!s.length) return
  const next = [...s].slice(0, -1).join('')
  drawComposedHanzi.value = next
  if (!next) {
    newDrawPhase.value = 'draw'
    padKey.value += 1
  }
}

function onDrawComplete() {
  const ch = currentDrawChar.value
  if (!ch) return
  drawBuilt.value += ch
  if (drawIndex.value + 1 >= drawQueue.value.length) {
    hanzi.value = drawBuilt.value
    drawOpen.value = false
    return
  }
  drawIndex.value += 1
}

async function save() {
  saveError.value = null
  const payload: Omit<Card, 'id'> = {
    hanzi: hanzi.value.trim(),
    pinyin: pinyin.value.trim(),
    meaning: meaning.value.trim(),
    example: example.value.trim() || undefined,
    notes: notes.value.trim() || undefined,
  }
  try {
    if (isNew.value) {
      await decks.addCard(deckId.value, payload)
    } else if (cardId.value) {
      await decks.updateCard(deckId.value, cardId.value, payload)
    }
    await router.push(`/deck/${deckId.value}`)
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Не удалось сохранить'
  }
}

async function remove() {
  if (!cardId.value || !confirm('Удалить карточку?')) return
  saveError.value = null
  try {
    await decks.deleteCard(deckId.value, cardId.value)
    await router.push(`/deck/${deckId.value}`)
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Не удалось удалить'
  }
}

watch(
  hanzi,
  () => {
    if (!isNew.value) return
    if (drawOpen.value) return
    suggestInlineError.value = null
    if (typedSuggestTimer) clearTimeout(typedSuggestTimer)
    const hz = hanzi.value.trim()
    if (!hz || !hanziHasCjk(hz)) return
    typedSuggestTimer = setTimeout(() => {
      typedSuggestTimer = null
      if (hanzi.value.trim() !== hz || drawOpen.value) return
      void fetchAndApplySuggest(hz, null)
    }, 500)
  },
)

onBeforeUnmount(() => {
  if (typedSuggestTimer) clearTimeout(typedSuggestTimer)
})
</script>

<template>
  <div v-if="!deck">
    <p class="empty">Колода не найдена.</p>
    <RouterLink class="btn btn-icon" :to="{ name: 'decks' }" aria-label="К списку колод">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
    </RouterLink>
  </div>

  <div v-else>
    <p class="edit-nav">
      <RouterLink
        class="btn btn-icon"
        :to="`/deck/${deckId}`"
        :aria-label="`К колоде «${deck.name}»`"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
      </RouterLink>
      <span class="edit-nav-text">{{ deck.name }}</span>
    </p>
    <h1>{{ isNew ? 'Новая карточка' : 'Редактирование' }}</h1>
    <p v-if="saveError" class="field-hint err">{{ saveError }}</p>

    <div class="field">
      <label for="hz">汉字</label>
      <div class="hanzi-row">
        <div>
          <input
            id="hz"
            v-model="hanzi"
            class="hanzi-input"
            type="text"
            inputmode="text"
            autocomplete="off"
          />
        </div>
        <button
          type="button"
          class="btn btn-icon"
          :disabled="suggestLoading || !hanziHasCjk(hanzi)"
          title="Пиньинь и перевод"
          aria-label="Подставить пиньинь и перевод"
          @click="suggestFromTypedField"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" d="M12 3l1.8 5.5L19 10l-5.2 1.7L12 17l-1.8-5.3L5 10l5.2-1.5L12 3z" />
            <path stroke-linecap="round" d="M5 21h6M8 18v6" />
          </svg>
        </button>
        <button
          type="button"
          class="btn primary btn-icon"
          :title="isNew ? 'Нарисовать' : 'По чертам'"
          :aria-label="isNew ? 'Нарисовать иероглиф' : 'Написание по чертам'"
          @click="openDraw"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.5 3.5l4 4L8 20H4v-4L16.5 3.5zM12.5 7.5l4 4"
            />
          </svg>
        </button>
      </div>
      <p v-if="isNew" class="field-hint subtle">
        Если вводите иероглифы с клавиатуры, пиньинь и значение подставятся после короткой паузы (как после выбора
        с рисунка; перевод через сеть).
      </p>
      <p v-if="suggestInlineError" class="field-hint err">{{ suggestInlineError }}</p>
      <p v-if="suggestLoading && !drawOpen" class="field-hint subtle">Подбор пиньиня и перевода…</p>
    </div>
    <div class="field">
      <label for="py">Пиньинь</label>
      <input id="py" v-model="pinyin" type="text" />
    </div>
    <div class="field">
      <label for="mn">Значение</label>
      <textarea id="mn" v-model="meaning" />
    </div>
    <div class="field">
      <label for="ex">Пример (необязательно)</label>
      <textarea id="ex" v-model="example" />
    </div>
    <div class="field">
      <label for="nt">Заметки</label>
      <textarea id="nt" v-model="notes" />
    </div>

    <div class="row-actions edit-footer-btns" :class="{ 'edit-footer-new': isNew }">
      <button
        v-if="isNew"
        type="button"
        class="btn primary edit-save-full"
        @click="save"
      >
        Сохранить
      </button>
      <button v-else type="button" class="btn primary btn-icon" aria-label="Сохранить" @click="save">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5" />
        </svg>
      </button>
      <button v-if="!isNew" type="button" class="btn danger btn-icon" aria-label="Удалить карточку" @click="remove">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 7h16M10 11v6m4-6v6M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7h12l-1 14H7L6 7z"
          />
        </svg>
      </button>
    </div>

    <div v-if="drawOpen" class="modal-backdrop" @click.self="drawOpen = false">
      <div class="modal draw-modal">
        <template v-if="isNew">
          <h3>Написание по чертам</h3>
          <p v-if="initLoading" class="modal-text">Загрузка модели распознавания…</p>
          <p v-if="initError" class="modal-text err">{{ initError }}</p>
          <p v-if="recognizeError" class="modal-text err">{{ recognizeError }}</p>

          <template v-if="newDrawPhase === 'draw'">
            <p v-if="drawComposedHanzi" class="modal-text composed-so-far">
              Уже: <span class="composed-inline">{{ drawComposedHanzi }}</span>
            </p>
            <p v-if="!drawComposedHanzi" class="modal-text draw-hint">
              Рисуйте один иероглиф за раз. Слово из нескольких символов собирается после выбора каждого — кнопка «Добавить ещё».
            </p>
            <p v-else class="modal-text draw-hint-next">Нарисуйте следующий иероглиф.</p>
            <HandwritingPad :key="padKey" @submit="onHandwritingSubmit" />
            <p v-if="recognizeLoading" class="modal-text">Распознавание…</p>
            <div v-if="drawComposedHanzi" class="draw-actions-row">
              <button
                type="button"
                class="btn primary"
                :disabled="suggestLoading"
                @click="applyComposedDrawAndClose"
              >
                Готово
              </button>
            </div>
            <button type="button" class="btn btn-icon mt" aria-label="Закрыть" @click="drawOpen = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </template>

          <template v-else-if="newDrawPhase === 'pick'">
            <p class="modal-text">Выберите подходящий иероглиф:</p>
            <div class="candidates">
              <button
                v-for="c in candidates"
                :key="c"
                type="button"
                class="cand-btn"
                :disabled="suggestLoading"
                @click="selectCandidate(c)"
              >
                {{ c }}
              </button>
            </div>
            <p v-if="suggestLoading" class="modal-text">Подбор пиньиня и перевода…</p>
            <button type="button" class="btn btn-icon mt" title="Нарисовать снова" aria-label="Нарисовать снова" @click="backToDraw">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M20 20v-5h-.581m-15.357-2a8.003 8.003 0 0015.357 2" />
              </svg>
            </button>
            <button type="button" class="btn btn-icon mt" aria-label="Отмена" @click="drawOpen = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </template>

          <template v-else-if="newDrawPhase === 'compose'">
            <p class="modal-text">Собрано:</p>
            <p class="composed-preview">{{ drawComposedHanzi }}</p>
            <p class="modal-text compose-hint">
              Нужно ещё иероглиф — нажмите «Добавить ещё» и нарисуйте следующий. Или «Готово», чтобы подставить в карточку.
            </p>
            <div class="compose-actions">
              <button type="button" class="btn primary" :disabled="suggestLoading" @click="applyComposedDrawAndClose">
                Готово
              </button>
              <button type="button" class="btn" :disabled="suggestLoading" @click="addAnotherDrawnChar">
                Добавить ещё
              </button>
              <button
                v-if="drawComposedHanzi.length"
                type="button"
                class="btn"
                :disabled="suggestLoading"
                @click="removeLastDrawnChar"
              >
                Удалить последний
              </button>
            </div>
            <button type="button" class="btn btn-icon mt" aria-label="Отмена" @click="drawOpen = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </template>
        </template>

        <template v-else-if="showWriterQuiz">
          <h3>Написание по чертам</h3>
          <p class="modal-text">
            Символ {{ drawIndex + 1 }} из {{ drawQueue.length }}: рисуйте по порядку черт.
          </p>
          <HanziWriterQuiz
            :key="`${currentDrawChar}-${drawIndex}`"
            :char="currentDrawChar"
            :pronunciation-text="drawQueue.length > 1 ? hanzi.trim() : undefined"
            :speak-on-start="drawQueue.length <= 1 || drawIndex === 0"
            @complete="onDrawComplete"
          />
          <button type="button" class="btn btn-icon mt" aria-label="Отмена" @click="drawOpen = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </template>

        <template v-else-if="drawOpen && !isNew">
          <h3>Написание по чертам</h3>
          <p class="modal-text">В поле 汉字 нет иероглифов — введите символы или вставьте текст.</p>
          <button type="button" class="btn btn-icon" aria-label="Закрыть" @click="drawOpen = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edit-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.5rem;
  flex-wrap: wrap;
}
.edit-nav-text {
  font-size: 1.05rem;
  color: var(--text-h);
  max-width: min(100%, 18rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.edit-footer-btns {
  align-items: center;
}
.edit-footer-new {
  flex-direction: column;
  align-items: stretch;
}
.edit-save-full {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.hanzi-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.field-hint {
  font-size: 0.95rem;
  margin: 0.35rem 0 0;
}
.field-hint.subtle {
  color: var(--text);
  opacity: 0.9;
}
.hanzi-row input {
  flex: 1;
}
.draw-modal {
  width: min(100%, 680px);
}
.modal-text {
  font-size: 1rem;
  margin: 0 0 1rem;
}
.err {
  color: var(--danger);
}
.mt {
  margin-top: 0.75rem;
}
.candidates {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 1rem;
}
.cand-btn {
  font-family: var(--font-hanzi), var(--sans);
  font-size: 1.9rem;
  min-width: 3.25rem;
  padding: 0.4rem 0.55rem;
}
.composed-so-far {
  margin-bottom: 0.5rem;
}
.composed-inline {
  font-family: var(--font-hanzi), var(--sans);
  font-size: 1.35rem;
}
.draw-hint,
.draw-hint-next {
  font-size: 0.95rem;
  color: var(--text);
  opacity: 0.92;
}
.draw-hint-next {
  margin-top: -0.35rem;
}
.draw-actions-row {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}
.composed-preview {
  font-family: var(--font-hanzi), var(--sans);
  font-size: 2.25rem;
  text-align: center;
  margin: 0 0 1rem;
  line-height: 1.35;
  word-break: break-all;
}
.compose-hint {
  font-size: 0.95rem;
  color: var(--text);
  opacity: 0.92;
}
.compose-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 0.5rem;
}
</style>
