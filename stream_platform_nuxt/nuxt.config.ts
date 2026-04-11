// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'url'
import VueI18nVitePlugin from '@intlify/unplugin-vue-i18n/vite'

// Runtime config for production deployment
// Set ENABLE_STRICT_CSP=false in development environment to disable strict CSP
const enableStrictCSP = process.env.ENABLE_STRICT_CSP !== 'false'
const isDevelopment = process.env.NODE_ENV === 'development'

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },

  // Add nuxt-security module
  modules: [
    'nuxt-security'
  ],

  // Security configuration
  // Static headers (X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Powered-By)
  // are managed by the reverse proxy (Caddy/Nginx) for centralized Defense in Depth.
  // Only the dynamic CSP (with nonce) is managed here at the app layer.
  security: {
    headers: {
      // Content Security Policy
      // Default: Strict mode with 'strict-dynamic' (Production)
      // Can be disabled with ENABLE_STRICT_CSP=false (Development)
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'script-src': enableStrictCSP
          ? ["'self'", "'strict-dynamic'", "'nonce-{{nonce}}'", "blob:"]  // Prod: Strict CSP with nonce
          : ["'self'", "'unsafe-inline'", "blob:"],  // Dev: Allow inline scripts
        // style-src: 'unsafe-inline' is intentional for both modes.
        // Nonce mechanism cannot reach runtime-injected <style> tags (SPA limitation),
        // and CSS-injection attacks are far less severe than script injection.
        // style-src-attr: 'none' surgically blocks the CSS if()-based exfiltration attack
        // (PortSwigger 2025) which is the only meaningful CSS attack vector.
        'style-src': ["'self'", "'unsafe-inline'"],
        'style-src-attr': ["'none'"],
        'img-src': [
          "'self'",
          'data:',
          'https://cdn.discordapp.com',
        ],
        'connect-src': [
          "'self'",
          ...(isDevelopment ? ['ws://localhost:24678', 'ws://localhost:3000'] : []),
        ],
        'media-src': ["'self'", "blob:"],
        'font-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': enableStrictCSP,  // Only in production (HTTPS)
      },
    },

    // Nonce configuration - enabled when strict CSP is enabled
    nonce: enableStrictCSP,
  },

  sourcemap: {
    server: true,
    client: true
  },
  runtimeConfig: {
    public: {
      BACKEND_URL: process.env.BACKEND_URL || ''
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
