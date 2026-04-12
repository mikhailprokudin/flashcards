<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import StudyStreakSummary from '@/components/StudyStreakSummary.vue'
import { studyApi } from '@/lib/api/study'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()
const { user } = storeToRefs(auth)

const statsLoading = ref(false)
const statsError = ref<string | null>(null)
const neverReviewed = ref(0)
const learning = ref(0)
const learned = ref(0)
const canStudy = ref(false)
const streakCurrent = ref(0)
const streakBest = ref(0)

async function loadStats() {
  const t = auth.token
  if (!t) return
  statsLoading.value = true
  statsError.value = null
  try {
    const s = await studyApi.stats(t)
    neverReviewed.value = s.neverReviewed
    learning.value = s.learning
    learned.value = s.learned
    canStudy.value = s.canStudy
    streakCurrent.value = s.streakCurrent
    streakBest.value = s.streakBest
  } catch (e) {
    statsError.value = e instanceof Error ? e.message : 'Не удалось загрузить статистику'
  } finally {
    statsLoading.value = false
  }
}

watch(
  [() => route.name, user],
  ([name, u]) => {
    if (!u) {
      neverReviewed.value = 0
      learning.value = 0
      learned.value = 0
      canStudy.value = false
      streakCurrent.value = 0
      streakBest.value = 0
      statsError.value = null
      return
    }
    if (name === 'home') void loadStats()
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="!user" class="home-guest">
    <h1>汉字卡</h1>
    <p class="lead">
      Войдите или зарегистрируйтесь, чтобы создавать колоды и карточки — данные хранятся на сервере и привязаны к
      вашему аккаунту.
    </p>
    <p class="actions">
      <RouterLink :to="{ name: 'login' }" class="btn primary">Вход</RouterLink>
      <RouterLink :to="{ name: 'register' }" class="btn">Регистрация</RouterLink>
    </p>
  </div>

  <div v-else class="home-logged">
    <h1 class="sr-only">Главная</h1>

    <div class="home-logged-inner">
      <p v-if="statsLoading" class="hint">Загрузка…</p>
      <template v-else>
        <p v-if="statsError" class="error">{{ statsError }}</p>
        <p v-else-if="canStudy" class="study-row">
          <RouterLink :to="{ name: 'study' }" class="btn primary btn-study-cta">Повторять</RouterLink>
        </p>
        <p v-else class="no-study">Сейчас нет карточек для повторения</p>

        <StudyStreakSummary
          v-if="!statsError"
          :current="streakCurrent"
          :best="streakBest"
        />

        <ul v-if="!statsError" class="stats" aria-label="Статистика по словам">
          <li class="stat">
            <span class="badge badge-red" aria-hidden="true">{{ neverReviewed }}</span>
            <span class="stat-label">Без повторений</span>
          </li>
          <li class="stat">
            <span class="badge badge-yellow" aria-hidden="true">{{ learning }}</span>
            <span class="stat-label">В процессе изучения</span>
          </li>
          <li class="stat">
            <span class="badge badge-green" aria-hidden="true">{{ learned }}</span>
            <span class="stat-label">Выучено</span>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.home-guest,
.home-logged {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  box-sizing: border-box;
  padding: 0.5rem 0;
}
@media (prefers-reduced-motion: no-preference) {
  .home-guest > h1,
  .home-guest > .lead,
  .home-guest > .actions {
    animation: home-piece 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .home-guest > h1 {
    animation-delay: 0.04s;
  }
  .home-guest > .lead {
    animation-delay: 0.12s;
  }
  .home-guest > .actions {
    animation-delay: 0.2s;
  }
  .home-logged-inner > * {
    animation: home-piece 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .home-logged-inner > *:nth-child(1) {
    animation-delay: 0.05s;
  }
  .home-logged-inner > *:nth-child(2) {
    animation-delay: 0.1s;
  }
  .home-logged-inner > *:nth-child(3) {
    animation-delay: 0.15s;
  }
  .home-logged-inner > *:nth-child(4) {
    animation-delay: 0.2s;
  }
  .home-logged-inner > *:nth-child(5) {
    animation-delay: 0.25s;
  }
}
@keyframes home-piece {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.home-logged-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.65rem, 2.2dvh, 1.25rem);
  width: 100%;
  max-width: 22rem;
}
.lead {
  font-size: 1.08rem;
  line-height: 1.55;
  margin: 0 0 1.25rem;
  max-width: 24rem;
  color: var(--text-h);
}
.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 1.2rem;
  min-height: 2.75rem;
  border-radius: 0.5rem;
  text-decoration: none;
  border: 1px solid var(--border);
  color: var(--text);
  line-height: 1.3;
}
.btn.primary {
  background: var(--accent);
  color: var(--surface);
  border-color: var(--accent);
}
.study-row {
  margin: 0;
  width: 100%;
}
.btn-study-cta {
  width: 100%;
  min-height: 3.35rem;
  padding: 0.85rem 1.35rem;
  font-size: 1.22rem;
  border-radius: 0.65rem;
}
.no-study {
  margin: 0;
  font-size: 1.08rem;
  color: var(--text-h);
  line-height: 1.45;
}
.hint {
  font-size: 1rem;
  color: var(--text);
  margin: 0;
}
.error {
  color: #c62828;
  margin: 0;
  font-size: 1rem;
  text-align: center;
}
.stats {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  text-align: left;
}
.stat {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.45rem;
  height: 2.45rem;
  padding: 0 0.55rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1.08rem;
  color: #fff;
  flex-shrink: 0;
}
.badge-red {
  background: #c62828;
}
.badge-yellow {
  background: #f9a825;
  color: #1a1a1a;
}
.badge-green {
  background: #2e7d32;
}
.stat-label {
  font-size: 1.02rem;
  color: var(--text-h);
  line-height: 1.4;
}
</style>
