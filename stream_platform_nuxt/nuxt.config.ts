// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'url'
import VueI18nVitePlugin from '@intlify/unplugin-vue-i18n/vite'

// Security headers (CSP, X-Frame-Options, HSTS, etc.) are managed exclusively
// by the reverse proxy (Caddy/Nginx) for both development and production.
// Use the local Caddy stack (`docker-compose.caddy.yml`) in development to get
// the same security headers as production. There is no nuxt-level CSP config.

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  sourcemap: {
    server: true,
    client: true
  },
  runtimeConfig: {
    public: {
      BACKEND_URL: process.env.BACKEND_URL || '',
      AUTH_URL: process.env.AUTH_URL || '',
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
    ],
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
    }
  }
})
