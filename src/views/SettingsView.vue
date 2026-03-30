<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const { requireHandwritingInStudy } = storeToRefs(settings)
</script>

<template>
  <div>
    <h1>Настройки</h1>

    <label class="toggle">
      <input
        type="checkbox"
        :checked="requireHandwritingInStudy"
        @change="settings.setRequireHandwriting(($event.target as HTMLInputElement).checked)"
      />
      <span>Требовать рукописный ввод (笔顺) при повторении</span>
    </label>
    <p class="note">
      После переворота карточки нужно правильно написать каждый иероглиф слова по чертам. Данные черт
      подгружаются из сети (CDN), если локальных файлов нет.
    </p>
  </div>
</template>

<style scoped>
.toggle {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  cursor: pointer;
  color: var(--text-h);
}
.toggle input {
  margin-top: 0.25rem;
  width: auto;
}
.note {
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--text);
}
</style>
