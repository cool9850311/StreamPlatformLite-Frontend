import { createI18n } from 'vue-i18n'
import en from '../i18n/locales/en_US.json'
import zh from '../i18n/locales/zh_TW.json'
import ja from '../i18n/locales/ja_JP.json'

export default defineNuxtPlugin(({ vueApp }) => {
  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
      en,
      zh,
      ja
    }
  })

  vueApp.use(i18n)
}) 