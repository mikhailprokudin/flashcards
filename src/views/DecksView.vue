<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDecksStore } from '@/stores/decks'

const router = useRouter()
const auth = useAuthStore()
const decks = useDecksStore()
const { user } = storeToRefs(auth)
const { summaries, listLoading, listError } = storeToRefs(decks)

const newName = ref('')

watch(
  user,
  (u) => {
    if (u) {
      void decks.fetchList().catch(() => {})
    }
  },
  { immediate: true },
)

async function createDeck() {
  const name = newName.value.trim()
  if (!name) return
  try {
    const id = await decks.addDeck(name)
    newName.value = ''
    await router.push(`/deck/${id}`)
  } catch {
    /* listError or toast */
  }
}
</script>

<template>
  <div v-if="!user">
    <p class="empty">Войдите, чтобы управлять колодами.</p>
    <RouterLink :to="{ name: 'login' }" class="btn primary">Вход</RouterLink>
  </div>

  <div v-else>
    <h1>Колоды</h1>
    <p v-if="listError" class="error">{{ listError }}</p>

    <form class="field row" @submit.prevent="createDeck">
      <input v-model="newName" type="text" placeholder="Название колоды" aria-label="Название колоды" />
      <button type="submit" class="primary" :disabled="listLoading">Создать</button>
    </form>

    <p v-if="listLoading && summaries.length === 0" class="hint">Загрузка…</p>
    <p v-else-if="summaries.length === 0" class="empty">Пока нет колод — добавьте первую.</p>

    <ul v-else class="list">
      <li v-for="d in summaries" :key="d.id">
        <RouterLink :to="`/deck/${d.id}`">
          {{ d.name }}
          <span class="meta">· {{ d.cardCount }} карт.</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  text-decoration: none;
  border: 1px solid var(--border);
  color: var(--text);
}
.btn.primary {
  background: var(--accent);
  color: var(--surface);
  border-color: var(--accent);
}
.hint {
  font-size: 1rem;
  margin-bottom: 1rem;
  color: var(--text);
}
.error {
  color: #c62828;
  margin-bottom: 1rem;
  font-size: 1rem;
}
.row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.row input {
  flex: 1;
}
.meta {
  color: var(--text);
  font-weight: normal;
  font-size: 0.98rem;
}
</style>
