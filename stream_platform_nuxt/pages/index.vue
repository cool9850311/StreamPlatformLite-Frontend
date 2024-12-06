<template>
  <div class="login-page">
    <h1>Login with Discord</h1>
    <a :href="discordOAuthUrl" class="login-button">Login with Discord</a>
    <a href="/native-login" class="native-login-link">Native Account Login</a>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';

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
