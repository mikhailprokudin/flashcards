<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import { ApiError } from '@/lib/api/auth'
import { useAuthStore } from '@/stores/auth'
import { useDecksStore } from '@/stores/decks'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const decks = useDecksStore()

const loading = ref(false)
const error = ref<string | null>(null)

async function onRegister(payload: { email: string; password: string }) {
  error.value = null
  loading.value = true
  try {
    await auth.register(payload.email, payload.password)
    await decks.fetchList().catch(() => {})
    const redir = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    await router.replace(redir && redir.startsWith('/') ? redir : '/')
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      error.value = 'Этот email уже зарегистрирован'
    } else {
      error.value = e instanceof ApiError ? e.message : 'Не удалось зарегистрироваться'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1>Регистрация</h1>
    <p class="lead">
      Уже есть аккаунт?
      <RouterLink :to="{ name: 'login', query: route.query }">Войти</RouterLink>
    </p>

    <RegisterForm :loading="loading" :error="error" @submit="onRegister" />
  </div>
</template>

<style scoped>
.lead {
  margin: 0 0 1.25rem;
  font-size: 1.05rem;
}
</style>
