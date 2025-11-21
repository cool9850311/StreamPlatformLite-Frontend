<template>
  <div class="login-page">
    <div class="language-switcher-container">
      <LanguageSwitcher />
    </div>
    <h1>{{ $t('login.title') }}</h1>
    <a :href="discordOAuthUrl" class="login-button">{{ $t('login.discord_button') }}</a>
    <a href="/native-login" class="native-login-link">{{ $t('login.native_login') }}</a>
  </div>
</template>

<script setup lang="ts">
import LanguageSwitcher from '~/components/LanguageSwitcher.vue';

const runtimeConfig = useRuntimeConfig()
const discordOAuthUrl = runtimeConfig.public.DISCORD_URL;

definePageMeta({
  layout: false
})
</script>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  position: relative;
}

.language-switcher-container {
  position: absolute;
  top: 20px;
  right: 20px;
}

.login-button {
  padding: 10px 20px;
  background-color: #7289da;
  color: white;
  text-decoration: none;
  border-radius: 5px;
}

.native-login-link {
  margin-top: 10px;
  color: #7289da;
  text-decoration: underline;
}
</style>
