<script setup lang="ts">
defineProps<{
  current: number
  best: number
}>()

function dayWord(n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m100 >= 11 && m100 <= 14) return 'дней'
  if (m10 === 1) return 'день'
  if (m10 >= 2 && m10 <= 4) return 'дня'
  return 'дней'
}
</script>

<template>
  <section class="streak" aria-label="Страйк повторений">
    <div class="streak-accent" aria-hidden="true" />
    <div class="streak-body">
      <h2 class="streak-heading">Страйк</h2>
      <div class="streak-metrics">
        <div
          class="metric"
          role="group"
          :aria-label="`Текущая серия: ${current} ${dayWord(current)} подряд`"
        >
          <span class="metric-value">{{ current }}</span>
          <span class="metric-label">дней подряд</span>
        </div>
        <div class="metric-divider" aria-hidden="true" />
        <div
          class="metric"
          role="group"
          :aria-label="`Лучшая серия за всё время: ${best} ${dayWord(best)}`"
        >
          <span class="metric-value metric-value--best">{{ best }}</span>
          <span class="metric-label">лучший результат</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.streak {
  position: relative;
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--gold) 28%, var(--border));
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--gold) 8%, var(--surface)) 0%,
    var(--surface) 48%,
    var(--surface-2) 100%
  );
  box-shadow: 0 1px 0 0 color-mix(in srgb, var(--gold) 22%, transparent);
  overflow: hidden;
  text-align: left;
}

.streak-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, var(--gold-muted), var(--gold));
  border-radius: 0.75rem 0 0 0.75rem;
}

.streak-body {
  padding: 1rem 1rem 1rem 1.15rem;
  margin-left: 4px;
}

.streak-heading {
  margin: 0 0 0.75rem;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gold-muted);
}

.streak-metrics {
  display: flex;
  align-items: stretch;
  gap: 0;
}

.metric {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.2rem;
  min-width: 0;
}

.metric-value {
  font-family: var(--font-hanzi), var(--sans);
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}

.metric-value--best {
  color: var(--gold-muted);
}

.metric-label {
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--text);
  opacity: 0.82;
  line-height: 1.3;
}

.metric-divider {
  align-self: center;
  width: 1px;
  min-height: 2.5rem;
  background: color-mix(in srgb, var(--border) 85%, var(--gold) 15%);
  flex-shrink: 0;
}

@media (prefers-color-scheme: dark) {
  .streak {
    border-color: color-mix(in srgb, var(--gold) 35%, var(--border));
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--gold) 12%, var(--surface)) 0%,
      var(--surface) 55%,
      var(--surface-2) 100%
    );
  }

  .metric-value--best {
    color: var(--gold);
  }
}
</style>
