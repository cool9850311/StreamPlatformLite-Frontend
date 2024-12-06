<template>
  <div class="native-login-page">
    <Notification ref="notification" />
    <h1>Native Account Login</h1>
    <form @submit.prevent="handleLogin">
      <input type="text" v-model="username" placeholder="Username" required />
      <input type="password" v-model="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios, { AxiosError } from 'axios';

const router = useRouter();
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
      notification.value.showNotification('Login successful!', 'success');
      router.push('/stream');
    } else {
      console.error('Unexpected response or missing token:', response);
      notification.value.showNotification('Login failed: Invalid response from server', 'error');
    }
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    console.error('Error logging in:', axiosError);
    const errorMessage = axiosError.response?.data?.message || 
                        axiosError.message || 
                        'An unexpected error occurred';
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
</style>
