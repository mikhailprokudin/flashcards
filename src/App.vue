<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { user } = storeToRefs(auth)

function logout() {
  auth.logout()
}
</script>

<template>
  <div class="app-shell">
    <header class="top-bar">
      <RouterLink to="/" class="logo">汉字卡</RouterLink>
      <nav class="nav">
        <RouterLink to="/">Колоды</RouterLink>
        <RouterLink to="/settings">Настройки</RouterLink>
        <template v-if="user">
          <span class="user-email" :title="user.email">{{ user.email }}</span>
          <button type="button" class="linkish" @click="logout">Выйти</button>
        </template>
        <template v-else>
          <RouterLink :to="{ name: 'login' }">Вход</RouterLink>
          <RouterLink :to="{ name: 'register' }">Регистрация</RouterLink>
        </template>
      </nav>
    </header>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
}
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  box-shadow: 0 1px 0 0 color-mix(in srgb, var(--gold) 35%, transparent);
  background: var(--surface);
}
.logo {
  font-family: var(--font-hanzi), var(--sans);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-h);
  text-decoration: none;
  padding-left: 0.6rem;
  border-left: 3px solid var(--gold);
}
.nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
}
.user-email {
  font-size: 0.85rem;
  color: var(--text);
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.linkish {
  background: transparent;
  border: none;
  padding: 0;
  color: var(--accent);
  text-decoration: underline;
  font: inherit;
  cursor: pointer;
}
.linkish:hover {
  color: var(--accent-hover);
}
.nav a {
  color: var(--text);
  text-decoration: none;
  font-size: 0.95rem;
}
.nav a:hover {
  color: var(--gold-muted);
}
.nav a.router-link-active {
  color: var(--accent);
  font-weight: 500;
}
.main {
  flex: 1;
  padding: 1rem;
  max-width: 40rem;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}
</style>
