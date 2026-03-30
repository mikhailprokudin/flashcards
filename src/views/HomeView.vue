<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useDecksStore } from '@/stores/decks'

const decks = useDecksStore()
const newName = ref('')

function createDeck() {
  const name = newName.value.trim()
  if (!name) return
  decks.addDeck(name)
  newName.value = ''
}
</script>

<template>
  <div>
    <h1>Колоды</h1>
    <p class="hint">Локальные данные в этом браузере (localStorage).</p>

    <form class="field row" @submit.prevent="createDeck">
      <input v-model="newName" type="text" placeholder="Название колоды" aria-label="Название колоды" />
      <button type="submit" class="primary">Создать</button>
    </form>

    <p v-if="decks.decks.length === 0" class="empty">Пока нет колод — добавьте первую.</p>

    <ul v-else class="list">
      <li v-for="d in decks.decks" :key="d.id">
        <RouterLink :to="`/deck/${d.id}`">
          {{ d.name }}
          <span class="meta">· {{ d.cards.length }} карт.</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.hint {
  font-size: 0.9rem;
  margin-bottom: 1rem;
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
  font-size: 0.9rem;
}
</style>
