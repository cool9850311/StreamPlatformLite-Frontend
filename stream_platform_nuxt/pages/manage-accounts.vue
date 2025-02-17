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
  mounted() {
    const token = localStorage.getItem('token');
    if (!token) {
      return this.$router.push('/stream');
    }

    const decodedToken = this.decodeJWT(token);
    if (decodedToken.Role !== 0) {
      return this.$router.push('/stream');
    }

    this.hasAccess = true;
    this.fetchAccountList();
  },
  methods: {
    decodeJWT(token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    },
    async createAccount() {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      try {
        const response = await fetch(`${backendUrl}/origin-account/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
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
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
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
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      try {
        const response = await fetch(`${backendUrl}/origin-account/delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ username: this.selectedAccount })
        });
        if (response.ok) {
          this.$refs.notification.showNotification('Account deleted successfully.', 'success');
          this.selectedAccount = '';
          this.fetchAccountList();
        } else {
          const errorData = await response.json();
          this.$refs.notification.showNotification(errorData.message || 'Failed to delete account', 'error');
        }
      } catch (error) {
        this.$refs.notification.showNotification('Error deleting account: ' + error.message, 'error');
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
