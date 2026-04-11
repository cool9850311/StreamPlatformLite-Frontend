import { createI18n } from 'vue-i18n'
import en from '../i18n/locales/en_US.json'
import zh from '../i18n/locales/zh_TW.json'
import ja from '../i18n/locales/ja_JP.json'

export default defineNuxtPlugin((nuxtApp) => {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
      en,
      zh,
      ja
    }
  })

  nuxtApp.vueApp.use(i18n)
})