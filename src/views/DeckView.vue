<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useDecksStore } from '@/stores/decks'

const route = useRoute()
const router = useRouter()
const decks = useDecksStore()

const deckId = computed(() => route.params.deckId as string)
const deck = computed(() => decks.deckById(deckId.value))
const loadingCards = computed(() => decks.detailLoading[deckId.value] === true)

const renameOpen = ref(false)
const renameValue = ref('')
const actionError = ref<string | null>(null)

onMounted(() => {
  void (async () => {
    try {
      await decks.fetchList()
    } catch {
      /* listError в store */
    }
    void decks.ensureDeckCards(deckId.value).catch((e) => {
      actionError.value = e instanceof Error ? e.message : 'Не удалось загрузить карточки'
    })
  })()
})

function openRename() {
  if (!deck.value) return
  renameValue.value = deck.value.name
  renameOpen.value = true
}

async function saveRename() {
  actionError.value = null
  try {
    await decks.renameDeck(deckId.value, renameValue.value)
    renameOpen.value = false
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Ошибка сохранения'
  }
}

async function removeDeck() {
  if (!confirm('Удалить колоду и все карточки?')) return
  actionError.value = null
  try {
    await decks.deleteDeck(deckId.value)
    await router.push({ name: 'decks' })
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Ошибка удаления'
  }
}
</script>

<template>
  <div v-if="!deck">
    <p class="empty">Колода не найдена.</p>
    <RouterLink class="btn btn-icon" :to="{ name: 'decks' }" aria-label="К списку колод">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
    </RouterLink>
  </div>

  <div v-else>
    <p class="deck-nav">
      <RouterLink class="btn btn-icon" :to="{ name: 'decks' }" aria-label="К списку колод">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
      </RouterLink>
    </p>
    <h1 class="title">{{ deck.name }}</h1>
    <p v-if="actionError" class="error">{{ actionError }}</p>

    <div class="row-actions deck-actions">
      <RouterLink
        class="btn btn-icon"
        :to="{ name: 'study-deck', params: { deckId } }"
        aria-label="Повторять колоду"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M20 20v-5h-.581m-15.357-2a8.003 8.003 0 0015.357 2"
          />
        </svg>
      </RouterLink>
      <RouterLink
        class="btn primary btn-icon"
        :to="`/deck/${deckId}/card/new`"
        aria-label="Новая карточка"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" d="M12 5v14M5 12h14" />
        </svg>
      </RouterLink>
      <button type="button" class="btn btn-icon" aria-label="Переименовать колоду" @click="openRename">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.5 3.5l4 4L8 20H4v-4L16.5 3.5zM12.5 7.5l4 4"
          />
        </svg>
      </button>
      <button type="button" class="btn danger btn-icon" aria-label="Удалить колоду" @click="removeDeck">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 7h16M10 11v6m4-6v6M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7h12l-1 14H7L6 7z"
          />
        </svg>
      </button>
    </div>

    <p v-if="loadingCards" class="empty">Загрузка карточек…</p>
    <p v-else-if="deck.cards.length === 0" class="empty">Пока пусто — добавьте карточку.</p>
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
        <div class="row-actions modal-btns">
          <button type="button" class="btn primary btn-icon" aria-label="Сохранить" @click="saveRename">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5" />
            </svg>
          </button>
          <button type="button" class="btn btn-icon" aria-label="Отмена" @click="renameOpen = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.title {
  font-family: var(--font-hanzi), var(--sans);
}
.deck-nav {
  margin: 0 0 0.5rem;
}
.deck-actions {
  align-items: center;
}
.modal-btns {
  justify-content: flex-start;
}
.error {
  color: #c62828;
  font-size: 1rem;
  margin-bottom: 0.75rem;
}
.hz {
  font-family: var(--font-hanzi), var(--sans);
  font-size: 1.45rem;
  margin-right: 0.5rem;
}
.py {
  color: var(--text);
  font-size: 1rem;
}
</style>
