<template>
  <div v-if="hasAccess" class="settings-container">
    <h1>{{ $t('manage_accounts.title') }}</h1>
    <form @submit.prevent="createAccount" class="settings-form">
      <div class="form-group">
        <label for="username">{{ $t('manage_accounts.username') }}</label>
        <input v-model="newAccount.username" id="username" type="text" class="form-control" />
      </div>
      <div class="form-group">
        <label for="role">{{ $t('manage_accounts.role') }}</label>
        <select v-model="newAccount.role" id="role" class="form-control">
          <option v-for="role in roles" :key="role.value" :value="role.value">
            {{ $t(`manage_accounts.roles.${role.key}`) }}
          </option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary">{{ $t('manage_accounts.create_button') }}</button>
    </form>
    <div v-if="accountInfo" class="result">
      <h3>{{ $t('manage_accounts.account_created') }}</h3>
      <p>{{ $t('manage_accounts.username') }} {{ accountInfo.username }}</p>
      <p>{{ $t('manage_accounts.password') }} {{ accountInfo.password }}</p>
      <p>{{ $t('manage_accounts.role') }} {{ $t(`manage_accounts.roles.${getRoleKey(accountInfo.role)}`) }}</p>
    </div>
    <hr class="section-divider" />
    <div class="form-group">
      <label for="accountList">{{ $t('manage_accounts.account_list') }}</label>
      <select v-model="selectedAccount" id="accountList" class="form-control">
        <option v-for="account in accountList" :key="account.username" :value="account.username">
          {{ account.username }} - {{ $t(`manage_accounts.roles.${getRoleKey(account.role)}`) }}
        </option>
      </select>
    </div>
    <button @click="deleteAccount" class="btn btn-danger">{{ $t('manage_accounts.delete_button') }}</button>

    <!-- Use Notification Component -->
    <notification ref="notification"></notification>
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
          this.$refs.notification.showNotification('Account created successfully.', 'success');
        } else {
          const errorData = await response.json();
          this.$refs.notification.showNotification(errorData.message || 'Failed to create account', 'error');
        }
      } catch (error) {
        this.$refs.notification.showNotification('Error creating account: ' + error.message, 'error');
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
          this.$refs.notification.showNotification(errorData.message || 'Failed to fetch account list', 'error');
        }
      } catch (error) {
        this.$refs.notification.showNotification('Error fetching account list: ' + error.message, 'error');
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
              'Deleted!',
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
.settings-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.settings-form {
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 15px;
}

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
}

.section-divider {
  margin: 20px 0;
  border: 0;
  border-top: 1px solid #ccc;
}
</style>
