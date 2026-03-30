<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  submit: [payload: { email: string; password: string }]
}>()

const email = ref('')
const password = ref('')

function onSubmit() {
  emit('submit', { email: email.value.trim(), password: password.value })
}

defineProps<{
  loading?: boolean
  error?: string | null
}>()
</script>

<template>
  <form class="auth-form" @submit.prevent="onSubmit">
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="field">
      <label for="login-email">Email</label>
      <input
        id="login-email"
        v-model="email"
        type="email"
        autocomplete="email"
        required
        :disabled="loading"
      />
    </div>

    <div class="field">
      <label for="login-password">Пароль</label>
      <input
        id="login-password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
        minlength="8"
        :disabled="loading"
      />
    </div>

    <button type="submit" class="primary" :disabled="loading">
      {{ loading ? 'Вход…' : 'Войти' }}
    </button>
  </form>
</template>

<style scoped>
.auth-form {
  max-width: 22rem;
}
.error {
  color: var(--danger);
  font-size: 0.9rem;
  margin: 0 0 1rem;
}
</style>
