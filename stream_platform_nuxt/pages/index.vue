<template>
  <div class="login-page">
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

      <h2 class="welcome-title">{{ $t('login.title') }}</h2>

      <a :href="discordLoginUrl" class="btn-modern btn-discord">
        <span class="btn-icon">🎮</span>
        {{ $t('login.discord_button') }}
      </a>

      <div class="divider">
        <span>{{ $t('login.or') }}</span>
      </div>

      <a href="/native-login" class="btn-modern btn-native">
        <span class="btn-icon">🔑</span>
        {{ $t('login.native_login') }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import LanguageSwitcher from '~/components/LanguageSwitcher.vue';
import { useI18n } from 'vue-i18n';

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const backendUrl = runtimeConfig.public.BACKEND_URL
const discordLoginUrl = `${backendUrl}/oauth/discord/init`

const { $swal } = useNuxtApp()
const { t } = useI18n()

onMounted(() => {
  // Check for error parameter in URL
  const error = route.query.error as string

  if (error === 'invalid_state') {
    $swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: t('login.error.invalid_state'),
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false
    })

    // Clean up URL parameters after showing toast
    setTimeout(() => {
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.pathname)
    }, 100)
  }
})

definePageMeta({
  layout: false
})
</script>

<style>
/* Global styles for login page */
body {
  margin: 0;
  padding: 0;
}

html {
  margin: 0;
  padding: 0;
}
</style>

<style scoped>
* {
  box-sizing: border-box;
}

.login-page {
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
  margin: 0;
}

.login-page::before {
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
  max-width: 420px;
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
  margin-bottom: 40px;
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
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
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

.btn-modern {
  width: 100%;
  padding: 16px 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
}

.btn-icon {
  font-size: 20px;
  display: inline-block;
  transition: transform 0.3s ease;
}

.btn-modern:hover .btn-icon {
  transform: scale(1.2);
}

.btn-discord {
  background: linear-gradient(135deg, #5865F2 0%, #7289DA 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(88, 101, 242, 0.3);
  margin-bottom: 16px;
}

.btn-discord:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(88, 101, 242, 0.4);
}

.btn-discord:active {
  transform: translateY(0);
}

.btn-native {
  background: white;
  color: #3b82f6;
  border: 2px solid #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.btn-native:hover {
  background: #3b82f6;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
}

.btn-native:active {
  transform: translateY(0);
}

.divider {
  text-align: center;
  margin: 24px 0;
  color: #64748b;
  font-size: 14px;
  position: relative;
}

.divider span {
  background: rgba(255, 255, 255, 0.95);
  padding: 0 16px;
  position: relative;
  z-index: 1;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e2e8f0;
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

  .btn-modern {
    padding: 14px 20px;
    font-size: 15px;
  }
}
</style>
