<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView } from 'vue-router'
import AppTabBar from '@/components/AppTabBar.vue'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const auth = useAuthStore()
const { user } = storeToRefs(auth)

const SPLASH_MIN_MS = 2000

const showSplash = ref(true)

onMounted(async () => {
  await Promise.all([
    router.isReady(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, SPLASH_MIN_MS)
    }),
  ])
  showSplash.value = false
})
</script>

<template>
  <div class="app-shell">
    <Transition name="splash">
      <div
        v-if="showSplash"
        class="splash"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Загрузка приложения"
      >
        <div class="splash-bg" aria-hidden="true" />
        <div class="splash-inner">
          <img class="splash-logo" src="/app-logo.png" alt="" width="192" height="192" />
          <h1 class="splash-title">汉字卡</h1>
          <p class="splash-tagline">карточки иероглифов</p>
        </div>
      </div>
    </Transition>
    <header class="top-bar" aria-label="Шапка приложения">
      <div class="top-bar-bg" aria-hidden="true" />
      <div class="top-bar-pattern" aria-hidden="true" />
      <div class="top-bar-inner">
        <RouterLink to="/" class="logo" aria-label="汉字卡 — на главную">
          <img class="logo-img" src="/app-logo.png" alt="" width="40" height="40" decoding="async" />
          <span class="logo-text">汉字卡</span>
        </RouterLink>
      </div>
    </header>
    <main class="main" :class="{ 'with-tab-bar': user }">
      <div class="main-fill">
        <RouterView v-slot="{ Component, route }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </div>
    </main>
    <AppTabBar v-if="user" />
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.top-bar {
  position: relative;
  z-index: 30;
  overflow: hidden;
  border-bottom: 1px solid color-mix(in srgb, var(--gold) 32%, var(--border));
  box-shadow:
    0 1px 0 0 color-mix(in srgb, var(--gold) 28%, transparent),
    0 8px 28px color-mix(in srgb, var(--accent) 12%, transparent);
}
.top-bar-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    118deg,
    color-mix(in srgb, var(--surface) 88%, var(--accent) 12%) 0%,
    color-mix(in srgb, var(--surface) 94%, var(--gold) 6%) 38%,
    color-mix(in srgb, var(--surface-2) 75%, var(--gold-muted) 8%) 100%
  );
}
@media (prefers-color-scheme: dark) {
  .top-bar-bg {
    background: linear-gradient(
      118deg,
      color-mix(in srgb, var(--surface) 92%, var(--accent) 8%) 0%,
      color-mix(in srgb, var(--surface) 88%, var(--gold-muted) 12%) 45%,
      color-mix(in srgb, var(--surface-2) 80%, #1a0f0c 20%) 100%
    );
  }
}
.top-bar-pattern {
  position: absolute;
  inset: -40% -20%;
  opacity: 0.14;
  background-image: radial-gradient(circle at 20% 30%, var(--accent) 0.5px, transparent 0.6px),
    radial-gradient(circle at 70% 60%, var(--gold) 0.45px, transparent 0.55px);
  background-size: 28px 28px, 36px 36px;
  pointer-events: none;
}
@media (prefers-reduced-motion: no-preference) {
  .top-bar-pattern {
    animation: pattern-drift 28s linear infinite;
  }
}
@keyframes pattern-drift {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(-24px, -12px);
  }
}
.top-bar-inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0.8rem 1.05rem;
  min-height: 3.15rem;
}
.logo {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--font-hanzi), var(--sans);
  font-size: 1.42rem;
  font-weight: 600;
  color: var(--text-h);
  text-decoration: none;
  padding: 0.2rem 0.35rem 0.2rem 0.15rem;
  border-radius: 0.45rem;
  transition:
    color var(--dur-fast) var(--ease-out-soft),
    transform var(--dur-fast) var(--ease-out-soft);
}
.logo:hover {
  color: color-mix(in srgb, var(--text-h) 70%, var(--accent) 30%);
}
@media (prefers-reduced-motion: no-preference) {
  .logo:hover {
    transform: translateY(-1px);
  }
}
.logo-img {
  width: 2.05rem;
  height: 2.05rem;
  object-fit: contain;
  flex-shrink: 0;
  border-radius: 0.35rem;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--border) 55%, transparent);
}
.logo-text {
  letter-spacing: 0.04em;
}
.main {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 1.1rem;
  max-width: 42rem;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
.main.with-tab-bar {
  padding-bottom: calc(4.65rem + env(safe-area-inset-bottom, 0px));
}
.main-fill {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
}
.main-fill > :deep(*) {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.page-enter-active,
.page-leave-active {
  transition:
    opacity var(--dur-med) var(--ease-out-soft),
    transform var(--dur-med) var(--ease-out-soft);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition-duration: 0.01ms;
  }
  .page-enter-from,
  .page-leave-to {
    transform: none;
  }
}

.splash {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  box-sizing: border-box;
}
.splash-bg {
  position: absolute;
  inset: 0;
  background: var(--bg-deep);
  background-image:
    radial-gradient(ellipse 130% 70% at 50% -15%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 58%),
    radial-gradient(ellipse 85% 55% at 105% 25%, color-mix(in srgb, var(--gold) 28%, transparent), transparent 52%),
    radial-gradient(ellipse 75% 45% at -5% 75%, color-mix(in srgb, var(--gold-muted) 18%, transparent), transparent 48%),
    radial-gradient(ellipse 60% 40% at 80% 95%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 50%);
  background-attachment: fixed;
}
@media (prefers-color-scheme: dark) {
  .splash-bg {
    background-image:
      radial-gradient(ellipse 120% 65% at 50% -10%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 55%),
      radial-gradient(ellipse 80% 50% at 100% 20%, color-mix(in srgb, var(--gold) 18%, transparent), transparent 50%),
      radial-gradient(ellipse 70% 45% at 0% 80%, color-mix(in srgb, var(--gold-muted) 12%, transparent), transparent 45%);
  }
}
.splash-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.65rem;
  max-width: 22rem;
}
.splash-logo {
  width: min(42vw, 11.5rem);
  height: auto;
  aspect-ratio: 1;
  object-fit: contain;
  filter: drop-shadow(0 10px 28px color-mix(in srgb, var(--accent) 22%, transparent));
}
.splash-title {
  margin: 0;
  font-family: var(--font-hanzi), var(--sans);
  font-size: clamp(1.85rem, 6.5vw, 2.35rem);
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-h);
}
.splash-tagline {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: color-mix(in srgb, var(--text) 88%, var(--accent) 12%);
}

.splash-enter-active,
.splash-leave-active {
  transition: opacity 0.42s var(--ease-out-soft);
}
.splash-enter-from,
.splash-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .splash-enter-active,
  .splash-leave-active {
    transition-duration: 0.12s;
  }
}
</style>
