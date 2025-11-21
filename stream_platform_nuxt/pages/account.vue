<template>
  <!-- ... existing code ... -->
  <div v-if="hasAccess" class="change-password-container">
    <h2>{{ $t('account.change_password') }}</h2>
    <form @submit.prevent="changePassword" class="change-password-form">
      <div class="form-group">
        <label for="old_password">{{ $t('account.old_password') }}</label>
        <input v-model="changePasswordRequest.old_password" id="old_password" type="password" class="form-control" />
      </div>
      <div class="form-group">
        <label for="newPassword">{{ $t('account.new_password') }}</label>
        <input v-model="changePasswordRequest.new_password" id="new_password" type="password" class="form-control" />
      </div>
      <button type="submit" class="btn btn-primary">{{ $t('account.submit') }}</button>
    </form>
    <!-- Use Notification Component -->
    <Notification ref="notificationRef" />
  </div>
  <!-- ... existing code ... -->
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
.change-password-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.change-password-form {
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
</style>
