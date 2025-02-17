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
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';
import LanguageSwitcher from '~/components/LanguageSwitcher.vue';

const router = useRouter();
const runtimeConfig = useRuntimeConfig()
const discordOAuthUrl = runtimeConfig.public.DISCORD_URL;

definePageMeta({
  layout: false
})

// Function to get URL parameter
function getUrlParameter(name: string): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Check for token in URL parameters and store it in localStorage
const token = getUrlParameter('token');
if (token) {
  localStorage.setItem('token', token);
  router.push('/stream');
}

// Check if token exists in localStorage on component mount
onMounted(() => {
  if (localStorage.getItem('token')) {
    router.push('/stream');
  }
});
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
