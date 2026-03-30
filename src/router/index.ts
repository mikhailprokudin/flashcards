import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
    },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/deck/:deckId', name: 'deck', component: () => import('@/views/DeckView.vue') },
    {
      path: '/deck/:deckId/card/new',
      name: 'card-new',
      component: () => import('@/views/CardEditView.vue'),
    },
    {
      path: '/deck/:deckId/card/:cardId',
      name: 'card-edit',
      component: () => import('@/views/CardEditView.vue'),
    },
    {
      path: '/deck/:deckId/study',
      name: 'study',
      component: () => import('@/views/StudyView.vue'),
    },
  ],
})

export default router
