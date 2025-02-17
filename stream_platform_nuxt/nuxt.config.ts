// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'url'
import VueI18nVitePlugin from '@intlify/unplugin-vue-i18n/vite'

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  sourcemap: {
    server: true,
    client: true
  },
  runtimeConfig: {
    public: {
      DISCORD_URL: '',
      BACKEND_URL: ''
    }
  },
  plugins: [
    '~/plugins/sweetalert.ts',
    '~/plugins/i18n.ts'
  ],
  vite: {
    plugins: [
      VueI18nVitePlugin({
        include: [
          fileURLToPath(new URL('./i18n/locales/**', import.meta.url))
        ]
      })
    ]
  }
})
