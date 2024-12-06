<template>
  <!-- ... existing code ... -->
  <div v-if="hasAccess" class="change-password-container">
    <h2>Change Password</h2>
    <form @submit.prevent="changePassword" class="change-password-form">
      <div class="form-group">
        <label for="old_password">Old Password:</label>
        <input v-model="changePasswordRequest.old_password" id="old_password" type="password" class="form-control" />
      </div>
      <div class="form-group">
        <label for="newPassword">New Password:</label>
        <input v-model="changePasswordRequest.new_password" id="new_password" type="password" class="form-control" />
      </div>
      <button type="submit" class="btn btn-primary">Change Password</button>
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
  mounted() {
    const token = localStorage.getItem('token');
    if (!token) {
      return this.$router.push('/stream');
    }

    const decodedToken = this.decodeJWT(token);
    if (decodedToken.IdentityProvider !== 'Origin') {
      return this.$router.push('/stream');
    }

    this.hasAccess = true;
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
    async changePassword() {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      try {
        const response = await fetch(`${backendUrl}/origin-account/change-password`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(this.changePasswordRequest)
        });
        if (response.ok) {
          this.$refs.notificationRef.showNotification('Password changed successfully.', 'success');
        } else {
          const errorData = await response.json();
          this.$refs.notificationRef.showNotification(errorData.message || 'Failed to change password', 'error');
        }
      } catch (error) {
        this.$refs.notificationRef.showNotification('Error changing password: ' + error.message, 'error');
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
