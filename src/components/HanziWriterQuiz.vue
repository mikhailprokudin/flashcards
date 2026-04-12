<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import HanziWriter from 'hanzi-writer'
import { charDataLoader } from '@/lib/charDataLoader'
import { speakChinese, cancelChineseSpeech } from '@/lib/speakZh'

const props = withDefaults(
  defineProps<{
    char: string
    /**
     * Индекс символа в многошаговом почерке (StudyView). Если задан — в `complete` возвращается
     * тот же индекс; родитель отбрасывает устаревшие колбэки после смены шага.
     */
    writingStepIndex?: number
    /** Целиком слово/фраза для озвучки; если несколько иероглифов — передавайте полный 汉字. */
    pronunciationText?: string
    /** Автоозвучка при старте квиза (для 2+ иероглифов обычно только у первого шага). */
    speakOnStart?: boolean
    /** `false` — без подсказок по чертам (hanzi-writer). По умолчанию 3. */
    showHintAfterMisses?: number | false
    /**
     * Контур эталона: при `true` во время квиза видна схема черт (подсказка).
     * `false` — только пустое поле; эталонная черта появляется после верного написания (как в hanzi-writer quiz).
     */
    showOutline?: boolean
    width?: number
    height?: number
  }>(),
  { width: 280, height: 280, speakOnStart: true, showHintAfterMisses: 3, showOutline: true },
)

const emit = defineEmits<{
  complete: [summary: { character: string; totalMistakes: number; writingStepIndex?: number }]
  loadError: [message: string]
}>()

const root = ref<HTMLElement | null>(null)
const loadFailed = ref(false)
let writer: InstanceType<typeof HanziWriter> | null = null
/** Сбрасывается при каждом setup — чтобы не обрабатывать onComplete от предыдущего квиза после смены символа. */
let setupSeq = 0

function destroy() {
  cancelChineseSpeech()
  try {
    writer?.cancelQuiz()
  } catch {
    /* ignore */
  }
  writer = null
  if (root.value) root.value.replaceChildren()
}

function ttsText(): string {
  return props.pronunciationText?.trim() || props.char?.trim() || ''
}

function replayPronunciation() {
  const t = ttsText()
  if (t) speakChinese(t)
}

function writerColors() {
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  if (dark) {
    return {
      strokeColor: '#e8dfd0',
      outlineColor: '#3d342c',
      highlightColor: '#d4af37',
      drawingColor: '#e63b2e',
    }
  }
  return {
    strokeColor: '#14110e',
    outlineColor: '#dcd0bc',
    highlightColor: '#c9a227',
    drawingColor: '#de2910',
  }
}

async function setup() {
  const seq = ++setupSeq
  destroy()
  loadFailed.value = false
  const ch = props.char?.trim()
  const writingStepIndex = props.writingStepIndex
  if (!ch) return

  await nextTick()
  if (seq !== setupSeq || !root.value) return

  const colors = writerColors()
  writer = HanziWriter.create(root.value, ch, {
    width: props.width,
    height: props.height,
    padding: 8,
    showOutline: props.showOutline,
    showCharacter: false,
    charDataLoader,
    ...colors,
    onLoadCharDataError: () => {
      loadFailed.value = true
      emit('loadError', 'Нет данных черт для этого символа (редкий знак или ошибка сети).')
    },
  })

  if (props.speakOnStart) {
    const t = ttsText()
    if (t) speakChinese(t)
  }

  await writer.quiz({
    showHintAfterMisses: props.showHintAfterMisses,
    onComplete: (summary) => {
      if (seq !== setupSeq) return
      const payload: { character: string; totalMistakes: number; writingStepIndex?: number } = {
        character: ch,
        totalMistakes: summary.totalMistakes,
      }
      if (writingStepIndex !== undefined) payload.writingStepIndex = writingStepIndex
      emit('complete', payload)
    },
  })
}

onMounted(() => {
  setup()
})

// Только параметры, влияющие на HanziWriter; `speakOnStart` / `pronunciationText` не включаем —
// при смене шага они меняются вместе с `char`, и лишний вызов `setup()` давал гонку (второй setup
// отменял квиз до `onComplete`, родитель не получал событие и не переходил к следующему иероглифу).
watch(
  () =>
    [
      props.char,
      props.width,
      props.height,
      props.showHintAfterMisses,
      props.showOutline,
      props.writingStepIndex,
    ] as const,
  () => {
    setup()
  },
)

onBeforeUnmount(() => {
  destroy()
})
</script>

<template>
  <div class="quiz-wrap">
    <p v-if="loadFailed" class="err">Не удалось загрузить данные написания.</p>
    <template v-else>
      <button
        type="button"
        class="speak btn btn-icon"
        title="Прослушать произношение"
        aria-label="Прослушать произношение"
        @click="replayPronunciation"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"
          />
        </svg>
      </button>
      <div ref="root" class="hanzi-root" />
    </template>
  </div>
</template>

<style scoped>
.quiz-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hanzi-root {
  touch-action: none;
}
.err {
  color: var(--danger);
  margin: 0 0 0.75rem;
  text-align: center;
}
.speak {
  margin: 0 0 0.75rem;
  background: var(--surface-2);
}
.speak:hover {
  filter: brightness(0.97);
}
</style>
