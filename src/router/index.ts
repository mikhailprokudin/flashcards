import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    {
      path: '/login',
      name: 'login',
      meta: { guestOnly: true },
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      meta: { guestOnly: true },
      component: () => import('@/views/RegisterView.vue'),
    },
    {
      path: '/decks',
      name: 'decks',
      meta: { requiresAuth: true },
      component: () => import('@/views/DecksView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      meta: { requiresAuth: true },
      component: () => import('@/views/SettingsView.vue'),
    },
    {
      path: '/study',
      name: 'study',
      meta: { requiresAuth: true },
      component: () => import('@/views/StudyView.vue'),
    },
    {
      path: '/deck/:deckId',
      name: 'deck',
      meta: { requiresAuth: true },
      component: () => import('@/views/DeckView.vue'),
    },
    {
      path: '/deck/:deckId/card/new',
      name: 'card-new',
      meta: { requiresAuth: true },
      component: () => import('@/views/CardEditView.vue'),
    },
    {
      path: '/deck/:deckId/card/:cardId',
      name: 'card-edit',
      meta: { requiresAuth: true },
      component: () => import('@/views/CardEditView.vue'),
    },
    {
      path: '/deck/:deckId/study',
      name: 'study-deck',
      meta: { requiresAuth: true },
      component: () => import('@/views/StudyView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.token) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }
  if (to.meta.guestOnly && auth.token) {
    return { name: 'home' }
  }
  return true
})

export default router
