<template>
  <div v-if="hasAccess" class="manage-accounts-page">
    <div class="manage-accounts-container">
      <div class="manage-accounts-card">
        <!-- Header Section -->
        <div class="manage-accounts-header">
          <div class="header-icon">👥</div>
          <div class="header-content">
            <h1 class="manage-accounts-title">{{ $t('manage_accounts.title') }}</h1>
          </div>
        </div>

        <notification ref="notification"></notification>

        <!-- Create Account Section -->
        <form @submit.prevent="createAccount" class="create-account-form">
          <div class="form-section">
            <h2 class="section-title">
              <span class="section-icon">➕</span>
              {{ $t('manage_accounts.create_button') }}
            </h2>

            <div class="form-group">
              <label for="username" class="form-label">
                <span class="label-icon">👤</span>
                {{ $t('manage_accounts.username') }}
              </label>
              <input
                v-model="newAccount.username"
                id="username"
                type="text"
                class="form-control"
                :placeholder="$t('manage_accounts.username')"
                required
              />
            </div>

            <div class="form-group">
              <label for="role" class="form-label">
                <span class="label-icon">🎭</span>
                {{ $t('manage_accounts.role') }}
              </label>
              <select v-model="newAccount.role" id="role" class="form-control select-control">
                <option v-for="role in roles" :key="role.value" :value="role.value">
                  {{ $t(`manage_accounts.roles.${role.key}`) }}
                </option>
              </select>
            </div>
          </div>

          <button type="submit" class="submit-button">
            <span class="btn-icon">✨</span>
            {{ $t('manage_accounts.create_button') }}
          </button>
        </form>

        <!-- Account Created Info -->
        <div v-if="accountInfo" class="result-card">
          <div class="result-header">
            <span class="result-icon">✅</span>
            <h3 class="result-title">{{ $t('manage_accounts.account_created') }}</h3>
          </div>
          <div class="result-content">
            <div class="result-item">
              <span class="result-label">{{ $t('manage_accounts.username') }}</span>
              <span class="result-value">{{ accountInfo.username }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">{{ $t('manage_accounts.password') }}</span>
              <span class="result-value password-value">{{ accountInfo.password }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">{{ $t('manage_accounts.role') }}</span>
              <span class="result-value">{{ $t(`manage_accounts.roles.${getRoleKey(accountInfo.role)}`) }}</span>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="section-divider"></div>

        <!-- Delete Account Section -->
        <div class="delete-section">
          <h2 class="section-title">
            <span class="section-icon">🗑️</span>
            {{ $t('manage_accounts.delete_button') }}
          </h2>

          <div class="form-group">
            <label for="accountList" class="form-label">
              <span class="label-icon">📋</span>
              {{ $t('manage_accounts.account_list') }}
            </label>
            <select v-model="selectedAccount" id="accountList" class="form-control select-control">
              <option v-for="account in accountList" :key="account.username" :value="account.username">
                {{ account.username }} - {{ $t(`manage_accounts.roles.${getRoleKey(account.role)}`) }}
              </option>
            </select>
          </div>

          <button @click="deleteAccount" class="delete-button" :disabled="!selectedAccount">
            <span class="btn-icon">🗑️</span>
            {{ $t('manage_accounts.delete_button') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useNuxtApp } from '#app';
import Notification from '@/components/notification.vue';

export default {
  components: {
    Notification
  },
  data() {
    return {
      newAccount: {
        username: '',
        role: ''
      },
      roles: [
        { value: 2, key: 'moderator' },
        { value: 3, key: 'user' },
        // Add more roles as needed
      ],
      accountInfo: null,
      accountList: [],
      selectedAccount: '',
      hasAccess: false
    };
  },
  async mounted() {
    try {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      // Check admin status by calling system-settings endpoint
      const response = await fetch(`${backendUrl}/system-settings`, {
        credentials: 'include'
      });

      if (!response.ok) {
        // User is not admin, redirect to stream page
        return this.$router.push('/stream');
      }

      this.hasAccess = true;
      await this.fetchAccountList();
    } catch (error) {
      // If fetch fails due to auth, redirect
      this.$router.push('/stream');
    }
  },
  methods: {

    async createAccount() {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      try {
        const response = await fetch(`${backendUrl}/origin-account/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(this.newAccount)
        });
        if (response.ok) {
          this.accountInfo = await response.json();
          this.fetchAccountList();
          this.$refs.notification.showNotification(this.$t('manage_accounts.success.create'), 'success');
        } else {
          const errorData = await response.json();
          this.$refs.notification.showNotification(errorData.message || this.$t('manage_accounts.error.create'), 'error');
        }
      } catch (error) {
        this.$refs.notification.showNotification(this.$t('manage_accounts.error.create_general') + ': ' + error.message, 'error');
      }
    },
    async fetchAccountList() {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      try {
        const response = await fetch(`${backendUrl}/origin-account/list`, {
          credentials: 'include'
        });
        if (response.ok) {
          this.accountList = await response.json();
        } else {
          const errorData = await response.json();
          this.$refs.notification.showNotification(errorData.message || this.$t('manage_accounts.error.fetch'), 'error');
        }
      } catch (error) {
        this.$refs.notification.showNotification(this.$t('manage_accounts.error.fetch_general') + ': ' + error.message, 'error');
      }
    },
    async deleteAccount() {
      const nuxtApp = useNuxtApp();
      
      // Show confirmation dialog
      const result = await nuxtApp.$swal.fire({
        title: this.$t('manage_accounts.confirm_delete.title'),
        text: this.$t('manage_accounts.confirm_delete.text'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: this.$t('manage_accounts.confirm_delete.confirm_button'),
        cancelButtonText: this.$t('manage_accounts.confirm_delete.cancel_button')
      });

      // If user confirms deletion
      if (result.isConfirmed) {
        const runtimeConfig = useRuntimeConfig();
        const backendUrl = runtimeConfig.public.BACKEND_URL;

        try {
          const response = await fetch(`${backendUrl}/origin-account/delete`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username: this.selectedAccount })
          });
          if (response.ok) {
            this.selectedAccount = '';
            this.fetchAccountList();
            nuxtApp.$swal.fire(
              this.$t('manage_accounts.success.deleted_title'),
              this.$t('manage_accounts.success.delete'),
              'success'
            );
          } else {
            const errorData = await response.json();
            this.$refs.notification.showNotification(errorData.message || this.$t('manage_accounts.error.delete'), 'error');
          }
        } catch (error) {
          this.$refs.notification.showNotification(this.$t('manage_accounts.error.delete') + ': ' + error.message, 'error');
        }
      }
    },
    getRoleKey(roleValue) {
      const role = this.roles.find(r => r.value === roleValue);
      return role ? role.key : 'unknown';
    }
  }
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.manage-accounts-page {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  min-height: 100vh;
  padding: 40px 20px;
}

.manage-accounts-container {
  max-width: 720px;
  margin: 0 auto;
}

.manage-accounts-card {
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

/* Header Section */
.manage-accounts-header {
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

.manage-accounts-title {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

/* Form Sections */
.form-section {
  margin-bottom: 32px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 20px 0;
}

.section-icon {
  font-size: 20px;
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

.select-control {
  cursor: pointer;
}

.form-control:focus {
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.form-control::placeholder {
  color: #94a3b8;
}

/* Submit Button */
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

/* Result Card */
.result-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 2px solid #86efac;
  border-radius: 16px;
  padding: 24px;
  margin-top: 24px;
  margin-bottom: 32px;
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.result-icon {
  font-size: 24px;
}

.result-title {
  font-size: 18px;
  font-weight: 700;
  color: #166534;
  margin: 0;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-label {
  font-size: 12px;
  font-weight: 600;
  color: #166534;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.result-value {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  padding: 10px 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #86efac;
  word-break: break-all;
}

.password-value {
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}

/* Section Divider */
.section-divider {
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
  margin: 40px 0;
}

/* Delete Section */
.delete-section {
  margin-top: 32px;
}

.delete-button {
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.delete-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
}

.delete-button:hover:not(:disabled) .btn-icon {
  transform: scale(1.2);
}

.delete-button:active:not(:disabled) {
  transform: translateY(0);
}

.delete-button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Responsive Design */
@media (max-width: 640px) {
  .manage-accounts-page {
    padding: 20px 16px;
  }

  .manage-accounts-card {
    padding: 28px 20px;
  }

  .manage-accounts-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .header-icon {
    width: 56px;
    height: 56px;
    font-size: 28px;
  }

  .manage-accounts-title {
    font-size: 24px;
  }

  .section-title {
    font-size: 16px;
  }

  .form-control {
    padding: 12px 14px;
    font-size: 15px;
  }

  .submit-button,
  .delete-button {
    padding: 14px 20px;
    font-size: 15px;
  }

  .result-card {
    padding: 20px 16px;
  }

  .result-value {
    font-size: 14px;
    padding: 8px 10px;
  }
}
</style>
