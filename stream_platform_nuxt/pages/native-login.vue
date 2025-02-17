<template>
  <div class="native-login-page">
    <div class="language-switcher-container">
      <LanguageSwitcher />
    </div>
    <Notification ref="notification" />
    <h1>{{ $t('native_login.title') }}</h1>
    <form @submit.prevent="handleLogin">
      <input 
        type="text" 
        v-model="username" 
        :placeholder="$t('native_login.username')" 
        required 
      />
      <input 
        type="password" 
        v-model="password" 
        :placeholder="$t('native_login.password')" 
        required 
      />
      <button type="submit">{{ $t('native_login.login_button') }}</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios, { AxiosError } from 'axios';
import LanguageSwitcher from '~/components/LanguageSwitcher.vue';

const router = useRouter();
const { t } = useI18n();
const username = ref('');
const password = ref('');
const runtimeConfig = useRuntimeConfig();
const backendUrl = runtimeConfig.public.BACKEND_URL;
const notification = ref<any>(null);

async function handleLogin() {
  try {
    const response = await axios.post(`${backendUrl}/origin-account/login`, {
      username: username.value,
      password: password.value
    });

    if (response.status === 200 && response.data.token) {
      localStorage.setItem('token', response.data.token);
      notification.value.showNotification(t('native_login.success'), 'success');
      router.push('/stream');
    } else {
      console.error('Unexpected response or missing token:', response);
      notification.value.showNotification(t('native_login.error.invalid_response'), 'error');
    }
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    console.error('Error logging in:', axiosError);
    const errorMessage = axiosError.response?.data?.message || 
                        axiosError.message || 
                        t('native_login.error.unexpected');
    notification.value.showNotification(`Login failed: ${errorMessage}`, 'error');
  }
}

definePageMeta({
  layout: false
});
</script>

<style scoped>
.native-login-page {
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

form {
  display: flex;
  flex-direction: column;
  align-items: center;
}

input {
  margin: 5px 0;
  padding: 10px;
  width: 200px;
}

button {
  padding: 10px 20px;
  background-color: #7289da;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #5b6eae;
}
</style>
