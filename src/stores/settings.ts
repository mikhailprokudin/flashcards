import { defineStore } from 'pinia'
import { loadSettings, saveSettings, type AppSettings } from '@/lib/storage'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    requireHandwritingInStudy: loadSettings().requireHandwritingInStudy,
  }),
  actions: {
    persist() {
      const s: AppSettings = {
        requireHandwritingInStudy: this.requireHandwritingInStudy,
      }
      saveSettings(s)
    },
    setRequireHandwriting(v: boolean) {
      this.requireHandwritingInStudy = v
      this.persist()
    },
  },
})
