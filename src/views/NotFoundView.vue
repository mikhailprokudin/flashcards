<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="not-found">
    <h1>Страница не найдена</h1>
    <p class="lead">Проверьте адрес или вернитесь на главную.</p>
    <RouterLink :to="{ name: 'home' }" class="btn primary">На главную</RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 1rem 0;
}
.lead {
  margin: 0 0 1.25rem;
  font-size: 1.05rem;
  color: var(--text-h);
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 1.2rem;
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
</style>
