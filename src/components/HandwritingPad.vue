<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits<{
  submit: [strokeData: number[]]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const wrapRef = ref<HTMLElement | null>(null)
const strokeData = ref<number[]>([])
let drawing = false

/** Internal drawing resolution (square); synced to container width */
const W = ref(280)
const H = ref(280)

function getPoint(e: PointerEvent): { x: number; y: number } {
  const el = canvasRef.value
  if (!el) return { x: 0, y: 0 }
  const r = el.getBoundingClientRect()
  const w = W.value
  const h = H.value
  return {
    x: ((e.clientX - r.left) / r.width) * w,
    y: ((e.clientY - r.top) / r.height) * h,
  }
}

function redraw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const root = getComputedStyle(document.documentElement)
  const fill = root.getPropertyValue('--canvas-bg').trim() || '#faf6f0'
  const stroke = root.getPropertyValue('--canvas-stroke').trim() || '#14110e'
  const w = W.value
  const h = H.value
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(2, (3 * w) / 280)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const data = strokeData.value
  let last: { x: number; y: number } | null = null
  for (let j = 0; j + 2 < data.length; j += 3) {
    const x = data[j]!
    const y = data[j + 1]!
    const isEnd = data[j + 2]!
    if (last !== null) {
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    last = isEnd === 1 ? null : { x, y }
  }
}

function onPointerDown(e: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  e.preventDefault()
  canvas.setPointerCapture(e.pointerId)
  drawing = true
  const { x, y } = getPoint(e)
  strokeData.value.push(x, y, 0)
  redraw()
}

function onPointerMove(e: PointerEvent) {
  if (!drawing) return
  e.preventDefault()
  const { x, y } = getPoint(e)
  strokeData.value.push(x, y, 0)
  redraw()
}

function onPointerUp(e: PointerEvent) {
  if (!drawing) return
  e.preventDefault()
  drawing = false
  const { x, y } = getPoint(e)
  strokeData.value.push(x, y, 1)
  try {
    canvasRef.value?.releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
  redraw()
}

function clear() {
  strokeData.value = []
  redraw()
}

function submit() {
  if (strokeData.value.length < 9) return
  emit('submit', [...strokeData.value])
}

function resizeCanvas() {
  const canvas = canvasRef.value
  const wrap = wrapRef.value
  if (!canvas || !wrap) return
  const raw = wrap.clientWidth
  if (raw < 16) return
  const side = Math.round(raw)
  if (side !== W.value) {
    if (strokeData.value.length) strokeData.value = []
    W.value = side
    H.value = side
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = W.value * dpr
  canvas.height = H.value * dpr
  canvas.style.width = `${W.value}px`
  canvas.style.height = `${H.value}px`
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
  }
  redraw()
}

let ro: ResizeObserver | null = null

onMounted(() => {
  ro = new ResizeObserver(() => resizeCanvas())
  if (wrapRef.value) ro.observe(wrapRef.value)
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
  window.removeEventListener('resize', resizeCanvas)
  drawing = false
})

defineExpose({ clear, resizeCanvas })
</script>

<template>
  <div class="pad">
    <div ref="wrapRef" class="canvas-wrap">
      <canvas
        ref="canvasRef"
        class="canvas"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />
    </div>

    <div class="actions">
      <button type="button" class="btn btn-icon" aria-label="Очистить поле" title="Очистить" @click="clear">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path stroke-linecap="round" d="M9 9l6 6m0-6l-6 6" />
        </svg>
      </button>
      <button
        type="button"
        class="btn primary btn-icon"
        :disabled="strokeData.length < 9"
        aria-label="Распознать иероглиф"
        title="Распознать"
        @click="submit"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path stroke-linecap="round" d="M21 21l-4.35-4.35" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}
.canvas-wrap {
  width: 100%;
  aspect-ratio: 1;
  flex-shrink: 0;
}
.canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  cursor: crosshair;
  box-sizing: border-box;
}
.hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.95rem;
  color: var(--text);
  margin: 0;
  text-align: center;
}
.hint-ico {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  opacity: 0.9;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}
</style>
