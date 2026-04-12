import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi, type AuthUser } from '@/lib/api/auth'

const TOKEN_KEY = 'hanzi-flashcards-auth-token-v1'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)
  const preferenceSaving = ref(false)

  function setSession(nextToken: string, nextUser: AuthUser) {
    token.value = nextToken
    user.value = nextUser
    try {
      localStorage.setItem(TOKEN_KEY, nextToken)
    } catch {
      /* ignore */
    }
  }

  function clearSession() {
    token.value = null
    user.value = null
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  }

  function hydrateFromStorage() {
    try {
      const t = localStorage.getItem(TOKEN_KEY)
      token.value = t && t.length > 0 ? t : null
    } catch {
      token.value = null
    }
  }

  async function fetchMeIfNeeded() {
    const t = token.value
    if (!t) return
    try {
      user.value = await authApi.me(t)
    } catch {
      clearSession()
    }
  }

  async function login(email: string, password: string) {
    const res = await authApi.login({ email, password })
    setSession(res.token, res.user)
  }

  async function register(email: string, password: string) {
    const res = await authApi.register({ email, password })
    setSession(res.token, res.user)
  }

  type PreferencePatch = Partial<Pick<AuthUser, 'requireHandwritingInStudy' | 'studyTripleMode'>>

  async function patchPreferences(body: PreferencePatch) {
    const t = token.value
    if (!t || !user.value) return
    preferenceSaving.value = true
    try {
      user.value = await authApi.patchMe(t, body)
    } finally {
      preferenceSaving.value = false
    }
  }

  async function setRequireHandwritingInStudy(value: boolean) {
    await patchPreferences({ requireHandwritingInStudy: value })
  }

  async function setStudyTripleMode(value: boolean) {
    await patchPreferences({ studyTripleMode: value })
  }

  function logout() {
    clearSession()
  }

  return {
    token,
    user,
    preferenceSaving,
    setSession,
    clearSession,
    hydrateFromStorage,
    fetchMeIfNeeded,
    login,
    register,
    setRequireHandwritingInStudy,
    setStudyTripleMode,
    logout,
  }
})
