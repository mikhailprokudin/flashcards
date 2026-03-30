<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView } from 'vue-router'
import AppTabBar from '@/components/AppTabBar.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { user } = storeToRefs(auth)
</script>

<template>
  <div class="app-shell">
    <header class="top-bar">
      <RouterLink to="/" class="logo">汉字卡</RouterLink>
    </header>
    <main class="main" :class="{ 'with-tab-bar': user }">
      <RouterView />
    </main>
    <AppTabBar v-if="user" />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
}
.top-bar {
  position: relative;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  box-shadow: 0 1px 0 0 color-mix(in srgb, var(--gold) 35%, transparent);
  background: var(--surface);
}
.logo {
  font-family: var(--font-hanzi), var(--sans);
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-h);
  text-decoration: none;
  padding-left: 0.6rem;
  border-left: 3px solid var(--gold);
}
.main {
  flex: 1;
  padding: 1.1rem;
  max-width: 42rem;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}
.main.with-tab-bar {
  padding-bottom: calc(4.65rem + env(safe-area-inset-bottom, 0px));
}
</style>
