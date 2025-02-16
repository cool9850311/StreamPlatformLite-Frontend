// https://nuxt.com/docs/api/configuration/nuxt-config
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
    '~/plugins/sweetalert.ts'
  ],
})
