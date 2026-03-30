<script setup lang="ts">
import { computed, ref } from 'vue'

const emit = defineEmits<{
  submit: [payload: { email: string; password: string }]
}>()

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')

const passwordsMismatch = computed(
  () =>
    passwordConfirm.value.length > 0 && password.value !== passwordConfirm.value,
)

function onSubmit() {
  if (passwordsMismatch.value) return
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
      <label for="reg-email">Email</label>
      <input
        id="reg-email"
        v-model="email"
        type="email"
        autocomplete="email"
        required
        :disabled="loading"
      />
    </div>

    <div class="field">
      <label for="reg-password">Пароль</label>
      <input
        id="reg-password"
        v-model="password"
        type="password"
        autocomplete="new-password"
        required
        minlength="8"
        maxlength="256"
        :disabled="loading"
      />
      <p class="hint">Не менее 8 символов (как на сервере).</p>
    </div>

    <div class="field">
      <label for="reg-password2">Пароль ещё раз</label>
      <input
        id="reg-password2"
        v-model="passwordConfirm"
        type="password"
        autocomplete="new-password"
        required
        minlength="8"
        :disabled="loading"
        :aria-invalid="passwordsMismatch"
      />
      <p v-if="passwordsMismatch" class="error inline">Пароли не совпадают.</p>
    </div>

    <button type="submit" class="primary" :disabled="loading || passwordsMismatch">
      {{ loading ? 'Регистрация…' : 'Зарегистрироваться' }}
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
.error.inline {
  margin: 0.35rem 0 0;
}
.hint {
  font-size: 0.8rem;
  color: var(--text);
  margin: 0.35rem 0 0;
}
</style>
