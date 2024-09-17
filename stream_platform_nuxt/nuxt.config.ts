// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },

  runtimeConfig: {
    public: {
      DISCORD_URL: process.env.DISCORD_URL,
      BACKEND_URL: process.env.BACKEND_URL
    }
  },
})