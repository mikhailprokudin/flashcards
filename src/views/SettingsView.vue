<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDecksStore } from '@/stores/decks'

const router = useRouter()
const auth = useAuthStore()
const decks = useDecksStore()
const { user, preferenceSaving } = storeToRefs(auth)

function onHandwritingToggle(e: Event) {
  const el = e.target as HTMLInputElement
  void auth.setRequireHandwritingInStudy(el.checked)
}

function onTripleToggle(e: Event) {
  const el = e.target as HTMLInputElement
  void auth.setStudyTripleMode(el.checked)
}

function logout() {
  decks.reset()
  auth.logout()
  void router.replace({ name: 'login' })
}
</script>

<template>
  <div>
    <h1>Настройки</h1>

    <section v-if="user" class="account">
      <h2 class="account-title">Аккаунт</h2>
      <p class="user-email" :title="user.email">{{ user.email }}</p>
      <button type="button" class="logout-btn btn btn-icon" title="Выйти" aria-label="Выйти из аккаунта" @click="logout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 17H6a2 2 0 01-2-2V9a2 2 0 012-2h4M14 21l7-7-7-7M21 12H9" />
        </svg>
      </button>
    </section>

    <label class="toggle">
      <input
        type="checkbox"
        :checked="user?.studyTripleMode ?? true"
        :disabled="preferenceSaving || !user"
        @change="onTripleToggle"
      />
      <span>Тройной квиз при повторении (смысл → 汉字 → почерк, в случайном порядке)</span>
    </label>
    <p class="note">
      Для каждой карточки в сессии показываются три шага: русский перевод, только иероглифы, затем написание по
      чертам без подсказок. Шаги разных слов перемешиваются. Один ответ SRS («знаю / не знаю») сохраняется после
      всех трёх шагов по карточке. Когда этот режим включён, обычный переворот карточки в повторении не
      используется (отдельная настройка про почерк ниже на него не влияет).
    </p>

    <label class="toggle">
      <input
        type="checkbox"
        :checked="user?.requireHandwritingInStudy ?? false"
        :disabled="preferenceSaving || !user || (user?.studyTripleMode ?? true)"
        @change="onHandwritingToggle"
      />
      <span>Требовать рукописный ввод (笔顺) при повторении</span>
    </label>
    <p class="note">
      После переворота карточки нужно правильно написать каждый иероглиф слова по чертам. Данные черт подгружаются
      из сети (CDN), если локальных файлов нет. Параметр сохраняется в вашем профиле на сервере. Недоступно при
      включённом тройном квизе.
    </p>
  </div>
</template>

<style scoped>
.account {
  margin-bottom: 1.5rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
}
.account-title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-h);
}
.user-email {
  margin: 0 0 0.75rem;
  font-size: 1.02rem;
  color: var(--text);
  word-break: break-all;
}
.logout-btn {
  border-color: var(--border);
  background: color-mix(in srgb, var(--surface) 92%, var(--gold) 8%);
  color: var(--accent);
  cursor: pointer;
}
.logout-btn:hover {
  border-color: color-mix(in srgb, var(--gold) 45%, var(--border));
  color: var(--accent-hover);
}
.toggle + .toggle {
  margin-top: 1.25rem;
}
.toggle {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  cursor: pointer;
  color: var(--text-h);
}
.toggle input {
  margin-top: 0.25rem;
  width: auto;
}
.note {
  margin-top: 1rem;
  font-size: 0.98rem;
  color: var(--text);
  line-height: 1.5;
}
</style>
