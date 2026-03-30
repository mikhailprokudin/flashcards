<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits<{
  submit: [strokeData: number[]]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const strokeData = ref<number[]>([])
let drawing = false

const W = 280
const H = 280

function getPoint(e: PointerEvent): { x: number; y: number } {
  const el = canvasRef.value
  if (!el) return { x: 0, y: 0 }
  const r = el.getBoundingClientRect()
  return {
    x: ((e.clientX - r.left) / r.width) * W,
    y: ((e.clientY - r.top) / r.height) * H,
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
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = stroke
  ctx.lineWidth = 3
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
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.style.width = `${W}px`
  canvas.style.height = `${H}px`
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.scale(dpr, dpr)
  redraw()
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
  drawing = false
})

defineExpose({ clear, resizeCanvas })
</script>

<template>
  <div class="pad">
    <canvas
      ref="canvasRef"
      class="canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />
    <p class="hint">Нарисуйте один иероглиф пальцем или мышью.</p>
    <div class="actions">
      <button type="button" @click="clear">Очистить</button>
      <button type="button" class="primary" :disabled="strokeData.length < 9" @click="submit">
        Узнать иероглиф
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
}
.canvas {
  touch-action: none;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  cursor: crosshair;
}
.hint {
  font-size: 0.85rem;
  color: var(--text);
  margin: 0;
  text-align: center;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}
</style>
