<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
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

const drawOpen = ref(false)

/** Редактирование: пошаговый quiz по эталону hanzi-writer */
const drawQueue = ref<string[]>([])
const drawIndex = ref(0)
const drawBuilt = ref('')

/** Новая карточка: свободный рисунок + распознавание */
type NewDrawPhase = 'draw' | 'pick'
const newDrawPhase = ref<NewDrawPhase>('draw')
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

async function pickCandidate(char: string) {
  await fetchAndApplySuggest(char, char)
  drawOpen.value = false
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

function save() {
  const payload: Omit<Card, 'id'> = {
    hanzi: hanzi.value.trim(),
    pinyin: pinyin.value.trim(),
    meaning: meaning.value.trim(),
    example: example.value.trim() || undefined,
    notes: notes.value.trim() || undefined,
  }
  if (isNew.value) {
    decks.addCard(deckId.value, payload)
  } else if (cardId.value) {
    decks.updateCard(deckId.value, cardId.value, payload)
  }
  router.push(`/deck/${deckId.value}`)
}

function remove() {
  if (!cardId.value || !confirm('Удалить карточку?')) return
  decks.deleteCard(deckId.value, cardId.value)
  router.push(`/deck/${deckId.value}`)
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
    <RouterLink to="/">← Назад</RouterLink>
  </div>

  <div v-else>
    <p><RouterLink :to="`/deck/${deckId}`">← {{ deck.name }}</RouterLink></p>
    <h1>{{ isNew ? 'Новая карточка' : 'Редактирование' }}</h1>

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
          :disabled="suggestLoading || !hanziHasCjk(hanzi)"
          title="Подставить пиньинь и перевод по символам в поле"
          @click="suggestFromTypedField"
        >
          Пиньинь и перевод
        </button>
        <button type="button" class="primary" @click="openDraw">
          {{ isNew ? 'Нарисовать' : 'Написание по чертам' }}
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

    <div class="row-actions">
      <button type="button" class="primary" @click="save">Сохранить</button>
      <button v-if="!isNew" type="button" class="danger" @click="remove">Удалить</button>
    </div>

    <div v-if="drawOpen" class="modal-backdrop" @click.self="drawOpen = false">
      <div class="modal draw-modal">
        <template v-if="isNew">
          <h3>Написание по чертам</h3>
          <p class="modal-text subtle">
            Нарисуйте иероглиф. Модель предложит похожие варианты; пиньинь и перевод подставятся автоматически
            (перевод через сеть).
          </p>
          <p v-if="initLoading" class="modal-text">Загрузка модели распознавания…</p>
          <p v-if="initError" class="modal-text err">{{ initError }}</p>
          <p v-if="recognizeError" class="modal-text err">{{ recognizeError }}</p>

          <template v-if="newDrawPhase === 'draw'">
            <HandwritingPad :key="padKey" @submit="onHandwritingSubmit" />
            <p v-if="recognizeLoading" class="modal-text">Распознавание…</p>
            <button type="button" class="mt" @click="drawOpen = false">Закрыть</button>
          </template>

          <template v-else>
            <p class="modal-text">Выберите подходящий иероглиф:</p>
            <div class="candidates">
              <button
                v-for="c in candidates"
                :key="c"
                type="button"
                class="cand-btn"
                :disabled="suggestLoading"
                @click="pickCandidate(c)"
              >
                {{ c }}
              </button>
            </div>
            <p v-if="suggestLoading" class="modal-text">Подбор пиньиня и перевода…</p>
            <button type="button" class="mt" @click="backToDraw">Нарисовать снова</button>
            <button type="button" class="mt" @click="drawOpen = false">Отмена</button>
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
          <button type="button" class="mt" @click="drawOpen = false">Отмена</button>
        </template>

        <template v-else-if="drawOpen && !isNew">
          <h3>Написание по чертам</h3>
          <p class="modal-text">В поле 汉字 нет иероглифов — введите символы или вставьте текст.</p>
          <button type="button" @click="drawOpen = false">Закрыть</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hanzi-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.field-hint {
  font-size: 0.85rem;
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
  width: min(100%, 24rem);
}
.modal-text {
  font-size: 0.9rem;
  margin: 0 0 1rem;
}
.modal-text.subtle {
  color: var(--text);
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
  font-size: 1.75rem;
  min-width: 3rem;
  padding: 0.35rem 0.5rem;
}
</style>
