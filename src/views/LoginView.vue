<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import LoginForm from '@/components/auth/LoginForm.vue'
import { ApiError } from '@/lib/api/auth'
import { useAuthStore } from '@/stores/auth'
import { useDecksStore } from '@/stores/decks'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const decks = useDecksStore()

const loading = ref(false)
const error = ref<string | null>(null)

async function onLogin(payload: { email: string; password: string }) {
  error.value = null
  loading.value = true
  try {
    await auth.login(payload.email, payload.password)
    await decks.fetchList().catch(() => {})
    const redir = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    await router.replace(redir && redir.startsWith('/') ? redir : '/')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Не удалось войти'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1>Вход</h1>
    <p class="lead">
      Нет аккаунта?
      <RouterLink :to="{ name: 'register', query: route.query }">Зарегистрироваться</RouterLink>
    </p>

    <LoginForm :loading="loading" :error="error" @submit="onLogin" />
  </div>
</template>

<style scoped>
.lead {
  margin: 0 0 1.25rem;
  font-size: 1.05rem;
}
</style>
