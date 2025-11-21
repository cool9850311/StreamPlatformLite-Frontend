<template>
  <div class="native-login-page">
    <div class="language-switcher-container">
      <LanguageSwitcher />
    </div>

    <div class="login-card">
      <div class="brand-header">
        <div class="logo">📺</div>
        <h1 class="brand-name">
          StreamPlatform<span class="lite">Lite</span>
        </h1>
      </div>

      <h2 class="welcome-title">{{ $t('native_login.title') }}</h2>

      <Notification ref="notification" />

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username" class="form-label">
            <span class="label-icon">👤</span>
            {{ $t('native_login.username') }}
          </label>
          <input
            id="username"
            type="text"
            v-model="username"
            :placeholder="$t('native_login.username')"
            required
            class="form-control"
          />
        </div>

        <div class="form-group">
          <label for="password" class="form-label">
            <span class="label-icon">🔒</span>
            {{ $t('native_login.password') }}
          </label>
          <input
            id="password"
            type="password"
            v-model="password"
            :placeholder="$t('native_login.password')"
            required
            class="form-control"
          />
        </div>

        <button type="submit" class="btn-submit">
          <span class="btn-icon">🚀</span>
          {{ $t('native_login.login_button') }}
        </button>
      </form>

      <div class="back-link-container">
        <a href="/" class="back-link">
          <span>←</span>
          {{ $t('native_login.back_to_home') }}
        </a>
      </div>
    </div>
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
    }, {
      withCredentials: true // Enable cookies
    });

    if (response.status === 200) {
      notification.value.showNotification(t('native_login.success'), 'success');
      router.push('/stream');
    } else {
      console.error('Unexpected response:', response);
      notification.value.showNotification(t('native_login.error.invalid_response'), 'error');
    }
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    console.error('Error logging in:', axiosError);
    const errorMessage = axiosError.response?.data?.message ||
                        axiosError.message ||
                        t('native_login.error.unexpected');
    notification.value.showNotification(`${t('native_login.error.failed')}: ${errorMessage}`, 'error');
  }
}

definePageMeta({
  layout: false
});
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.native-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-image:
    radial-gradient(at 40% 20%, rgba(59, 130, 246, 0.3) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(139, 92, 246, 0.3) 0px, transparent 50%),
    radial-gradient(at 0% 50%, rgba(59, 130, 246, 0.2) 0px, transparent 50%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.native-login-page::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 50%);
  animation: rotate 30s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.language-switcher-container {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 48px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 440px;
  width: 100%;
  position: relative;
  z-index: 1;
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.brand-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 20px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
}

.brand-name {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  text-align: center;
  display: inline-block;
}

.brand-name .lite {
  font-weight: 300;
}

.welcome-title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 32px;
  text-align: center;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #334155;
  margin-bottom: 8px;
}

.label-icon {
  font-size: 16px;
}

.form-control {
  width: 100%;
  padding: 14px 16px;
  font-size: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  transition: all 0.3s ease;
  outline: none;
  font-family: inherit;
}

.form-control:focus {
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.form-control::placeholder {
  color: #94a3b8;
}

.btn-submit {
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  margin-top: 8px;
}

.btn-icon {
  font-size: 20px;
  display: inline-block;
  transition: transform 0.3s ease;
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.btn-submit:hover .btn-icon {
  transform: scale(1.2);
}

.btn-submit:active {
  transform: translateY(0);
}

.back-link-container {
  margin-top: 24px;
  text-align: center;
}

.back-link {
  color: #64748b;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  padding: 8px 16px;
  border-radius: 8px;
}

.back-link:hover {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

/* 響應式設計 */
@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
  }

  .logo {
    width: 64px;
    height: 64px;
    font-size: 32px;
  }

  .brand-name {
    font-size: 24px;
  }

  .welcome-title {
    font-size: 20px;
  }

  .form-control {
    padding: 12px 14px;
    font-size: 15px;
  }

  .btn-submit {
    padding: 14px 20px;
    font-size: 15px;
  }
}
</style>
