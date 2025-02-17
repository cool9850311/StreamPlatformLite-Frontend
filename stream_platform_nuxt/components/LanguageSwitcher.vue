<template>
  <select v-model="currentLocale" @change="changeLanguage" class="language-switcher">
    <option value="en">English</option>
    <option value="zh">中文</option>
    <option value="ja">日本語</option>
  </select>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const currentLocale = ref(locale.value)

const changeLanguage = () => {
  locale.value = currentLocale.value
  localStorage.setItem('userLocale', currentLocale.value)
}

// Initialize locale from localStorage
onMounted(() => {
  const savedLocale = localStorage.getItem('userLocale')
  if (savedLocale) {
    currentLocale.value = savedLocale
    locale.value = savedLocale
  }
})
</script>

<style scoped>
.language-switcher {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background-color: #444;
  color: white;
  cursor: pointer;
}

.language-switcher:hover {
  background-color: #555;
}
</style> 