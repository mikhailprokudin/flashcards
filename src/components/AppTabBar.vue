<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { name: 'home' as const, to: '/', ariaLabel: 'Главная' },
  { name: 'decks' as const, to: { name: 'decks' }, ariaLabel: 'Колоды' },
  { name: 'settings' as const, to: { name: 'settings' }, ariaLabel: 'Настройки' },
]

function isActive(tabName: (typeof tabs)[number]['name']) {
  if (tabName === 'home') return route.name === 'home'
  return route.name === tabName
}
</script>

<template>
  <nav class="tab-bar" aria-label="Основная навигация">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.name"
      :to="tab.to"
      class="tab"
      :class="{ active: isActive(tab.name) }"
      :aria-label="tab.ariaLabel"
    >
      <span class="icon" aria-hidden="true">
        <svg v-if="tab.name === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 10.5 12 3l9 7.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M5 10v10h5v-6h4v6h5V10" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else-if="tab.name === 'decks'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="4" width="16" height="12" rx="1.5" />
          <path d="M6 8h12M6 11h8" stroke-linecap="round" />
          <rect x="6" y="14" width="12" height="6" rx="1" opacity="0.85" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32L19.07 4.93"
            stroke-linecap="round"
          />
        </svg>
      </span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  gap: 0.35rem;
  padding: 0.5rem 0.65rem calc(0.55rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid color-mix(in srgb, var(--gold) 22%, var(--border));
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface) 94%, var(--gold) 6%) 0%,
    color-mix(in srgb, var(--surface-2) 88%, var(--gold-muted) 5%) 100%
  );
  box-shadow:
    0 -1px 0 0 color-mix(in srgb, var(--gold) 22%, transparent),
    0 -12px 32px color-mix(in srgb, var(--accent) 8%, transparent);
}
@media (prefers-reduced-motion: no-preference) {
  .tab-bar {
    animation: tab-bar-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}
@media (prefers-reduced-motion: reduce) {
  .tab-bar {
    animation: none;
  }
}
@keyframes tab-bar-rise {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.tab {
  flex: 1;
  max-width: 9rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.35rem;
  border-radius: 0.65rem;
  text-decoration: none;
  color: var(--text);
  transition:
    color 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.tab:hover {
  color: var(--text-h);
  background: color-mix(in srgb, var(--gold) 14%, transparent);
}
.tab.active {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 9%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent);
}
@media (prefers-reduced-motion: no-preference) {
  .tab:active {
    transform: scale(0.96);
  }
  .tab.active {
    transform: translateY(-1px);
  }
}
.tab.active .icon {
  color: var(--accent);
}
.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  color: color-mix(in srgb, var(--text) 75%, var(--text-h) 25%);
  transition:
    color 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .tab.active .icon {
    transform: scale(1.06);
    animation: tab-icon-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  }
}
@keyframes tab-icon-pop {
  0% {
    transform: scale(0.92);
  }
  60% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1.06);
  }
}
.icon svg {
  width: 100%;
  height: 100%;
}
</style>
