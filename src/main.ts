import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'
import { useDecksStore } from '@/stores/decks'

registerSW({ immediate: true })

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

const auth = useAuthStore()
const decks = useDecksStore()
auth.hydrateFromStorage()
void auth.fetchMeIfNeeded().then(() => {
  if (auth.token) {
    void decks.fetchList().catch(() => {})
  }
})

app.mount('#app')
