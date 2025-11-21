<template>
  <div v-if="hasAccess" class="account-page">
    <div class="account-container">
      <div class="account-card">
        <div class="account-header">
          <div class="header-icon">🔐</div>
          <div class="header-content">
            <h2 class="account-title">{{ $t('account.change_password') }}</h2>
            <p class="account-subtitle">{{ $t('account.subtitle') }}</p>
          </div>
        </div>

        <Notification ref="notificationRef" />

        <form @submit.prevent="changePassword" class="change-password-form">
          <div class="form-section">
            <div class="form-group">
              <label for="old_password" class="form-label">
                <span class="label-icon">🔒</span>
                {{ $t('account.old_password') }}
              </label>
              <input
                v-model="changePasswordRequest.old_password"
                id="old_password"
                type="password"
                class="form-control"
                :placeholder="$t('account.old_password')"
                required
              />
            </div>

            <div class="form-group">
              <label for="new_password" class="form-label">
                <span class="label-icon">✨</span>
                {{ $t('account.new_password') }}
              </label>
              <input
                v-model="changePasswordRequest.new_password"
                id="new_password"
                type="password"
                class="form-control"
                :class="{ 'invalid': changePasswordRequest.new_password.length > 0 && !isPasswordValid, 'valid': isPasswordValid }"
                :placeholder="$t('account.new_password')"
                required
                minlength="8"
              />
              <p class="form-hint" :class="{ 'hint-error': changePasswordRequest.new_password.length > 0 && !isPasswordValid, 'hint-success': isPasswordValid }">
                {{ $t('account.password_hint') }}
              </p>
            </div>
          </div>

          <button type="submit" class="submit-button" :disabled="!canSubmit">
            <span class="btn-icon">🚀</span>
            {{ $t('account.submit') }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import Notification from '@/components/notification.vue';

export default {
  components: {
    Notification
  },
  data() {
    return {
      changePasswordRequest: {
        old_password: '',
        new_password: ''
      },
      hasAccess: false
    };
  },
  computed: {
    isPasswordValid() {
      return this.changePasswordRequest.new_password.length >= 8;
    },
    canSubmit() {
      return this.changePasswordRequest.old_password.length > 0 && this.isPasswordValid;
    }
  },
  async mounted() {
    try {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      // Check if user is logged in with Origin (native) account
      const response = await fetch(`${backendUrl}/me`, {
        credentials: 'include'
      });

      if (!response.ok) {
        return this.$router.push('/stream');
      }

      const userData = await response.json();

      // Only allow Origin account users to access this page
      if (userData.identity_provider !== 'Origin') {
        return this.$router.push('/stream');
      }

      this.hasAccess = true;
    } catch (error) {
      this.$router.push('/stream');
    }
  },
  methods: {
    async changePassword() {
      // Validate password before submitting
      if (!this.canSubmit) {
        this.$refs.notificationRef.showNotification(this.$t('account.password_hint'), 'error');
        return;
      }

      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      try {
        const response = await fetch(`${backendUrl}/origin-account/change-password`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(this.changePasswordRequest)
        });
        if (response.ok) {
          this.$refs.notificationRef.showNotification(this.$t('account.success'), 'success');
          // Clear form
          this.changePasswordRequest.old_password = '';
          this.changePasswordRequest.new_password = '';
        } else {
          const errorData = await response.json();
          this.$refs.notificationRef.showNotification(errorData.message || this.$t('account.error'), 'error');
        }
      } catch (error) {
        this.$refs.notificationRef.showNotification(this.$t('account.error') + ': ' + error.message, 'error');
      }
    }
  }
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.account-page {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  min-height: 100vh;
  padding: 40px 20px;
}

.account-container {
  max-width: 640px;
  margin: 0 auto;
}

.account-card {
  background: white;
  border-radius: 24px;
  padding: 40px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
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

.account-header {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #e2e8f0;
}

.header-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
  flex-shrink: 0;
}

.header-content {
  flex: 1;
}

.account-title {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
}

.account-subtitle {
  color: #64748b;
  font-size: 14px;
  margin: 0;
  line-height: 1.6;
}

.form-section {
  margin-bottom: 32px;
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

.form-control.invalid {
  border-color: #ef4444;
  background: #fef2f2;
}

.form-control.invalid:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}

.form-control.valid {
  border-color: #22c55e;
  background: #f0fdf4;
}

.form-control.valid:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
}

.form-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
}

.form-hint::before {
  content: 'ℹ';
  color: #3b82f6;
}

.form-hint.hint-error {
  color: #ef4444;
}

.form-hint.hint-error::before {
  content: '⚠';
  color: #ef4444;
}

.form-hint.hint-success {
  color: #22c55e;
}

.form-hint.hint-success::before {
  content: '✓';
  color: #22c55e;
}

.submit-button {
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
}

.btn-icon {
  font-size: 20px;
  display: inline-block;
  transition: transform 0.3s ease;
}

.submit-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.submit-button:hover .btn-icon {
  transform: scale(1.2);
}

.submit-button:active {
  transform: translateY(0);
}

.submit-button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 響應式設計 */
@media (max-width: 640px) {
  .account-card {
    padding: 28px 20px;
  }

  .account-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .header-icon {
    width: 56px;
    height: 56px;
    font-size: 28px;
  }

  .account-title {
    font-size: 24px;
  }

  .form-control {
    padding: 12px 14px;
    font-size: 15px;
  }

  .submit-button {
    padding: 14px 20px;
    font-size: 15px;
  }
}
</style>
