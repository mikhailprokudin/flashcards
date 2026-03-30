<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useDecksStore } from '@/stores/decks'

const route = useRoute()
const router = useRouter()
const decks = useDecksStore()

const deckId = computed(() => route.params.deckId as string)
const deck = computed(() => decks.deckById(deckId.value))

const renameOpen = ref(false)
const renameValue = ref('')

function openRename() {
  if (!deck.value) return
  renameValue.value = deck.value.name
  renameOpen.value = true
}

function saveRename() {
  decks.renameDeck(deckId.value, renameValue.value)
  renameOpen.value = false
}

function removeDeck() {
  if (!confirm('Удалить колоду и все карточки?')) return
  decks.deleteDeck(deckId.value)
  router.push('/')
}
</script>

<template>
  <div v-if="!deck">
    <p class="empty">Колода не найдена.</p>
    <RouterLink to="/">← К списку</RouterLink>
  </div>

  <div v-else>
    <p><RouterLink to="/">← Колоды</RouterLink></p>
    <h1 class="title">{{ deck.name }}</h1>

    <div class="row-actions">
      <RouterLink :to="`/deck/${deckId}/study`" class="btn primary">Повторять</RouterLink>
      <RouterLink :to="`/deck/${deckId}/card/new`" class="btn primary">Новая карточка</RouterLink>
      <button type="button" @click="openRename">Переименовать</button>
      <button type="button" class="danger" @click="removeDeck">Удалить колоду</button>
    </div>

    <h2>Карточки</h2>
    <p v-if="deck.cards.length === 0" class="empty">Пока пусто — добавьте карточку.</p>
    <ul v-else class="list">
      <li v-for="c in deck.cards" :key="c.id">
        <RouterLink :to="`/deck/${deckId}/card/${c.id}`">
          <span class="hz">{{ c.hanzi || '…' }}</span>
          <span class="py">{{ c.pinyin }}</span>
        </RouterLink>
      </li>
    </ul>

    <div v-if="renameOpen" class="modal-backdrop" @click.self="renameOpen = false">
      <div class="modal">
        <h3>Переименовать</h3>
        <input v-model="renameValue" type="text" />
        <div class="row-actions">
          <button type="button" class="primary" @click="saveRename">Сохранить</button>
          <button type="button" @click="renameOpen = false">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.title {
  font-family: var(--font-hanzi), var(--sans);
}
.hz {
  font-family: var(--font-hanzi), var(--sans);
  font-size: 1.35rem;
  margin-right: 0.5rem;
}
.py {
  color: var(--text);
  font-size: 0.9rem;
}
</style>
