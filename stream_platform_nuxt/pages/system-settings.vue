<template>
  <div v-if="hasAccess" class="settings-container">
    <h1>{{ $t('system_settings.title') }}</h1>
    <form @submit.prevent="saveSettings" class="settings-form">
      <div class="form-group">
        <label for="editorRoleId">{{ $t('system_settings.moderator_role_id') }}</label>
        <input v-model="settings.editorRoleId" id="editorRoleId" type="text" class="form-control" />
      </div>
      <div class="form-group">
        <label for="streamAccessRoleIds">{{ $t('system_settings.stream_access_role_ids') }}</label>
        <textarea v-model="streamAccessRoleIdsString" id="streamAccessRoleIds" class="form-control"></textarea>
      </div>
      <button type="submit" class="btn btn-primary">{{ $t('system_settings.save_button') }}</button>
    </form>

    <notification ref="notificationComponent" />
  </div>
</template>

<script>
import { useI18n } from 'vue-i18n';

export default {
  components: {
    Notification: () => import('@/components/notification.vue')
  },
  setup() {
    const { t } = useI18n();
    return { t };
  },
  data() {
    return {
      settings: {
        editorRoleId: '',
        streamAccessRoleIds: []
      },
      streamAccessRoleIdsString: '',
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
    this.fetchSettings();
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
    async fetchSettings() {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      try {
        const response = await fetch(`${backendUrl}/system-settings`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          this.settings.editorRoleId = data.editor_role_id;
          this.settings.streamAccessRoleIds = data.stream_access_role_ids;
          this.streamAccessRoleIdsString = data.stream_access_role_ids.join('\n');
        } else {
          console.error(this.$t('system_settings.error.fetch'));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    },
    async saveSettings() {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      this.settings.streamAccessRoleIds = this.streamAccessRoleIdsString.split('\n').map(id => id.trim()).filter(id => id);

      try {
        const response = await fetch(`${backendUrl}/system-settings`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            editor_role_id: this.settings.editorRoleId,
            stream_access_role_ids: this.settings.streamAccessRoleIds
          })
        });
        if (response.ok) {
          this.$refs.notificationComponent.showNotification(this.$t('system_settings.success'), 'success');
        } else {
          const errorData = await response.json();
          this.$refs.notificationComponent.showNotification(
            errorData.message || this.$t('system_settings.error.save'), 
            'error'
          );
        }
      } catch (error) {
        this.$refs.notificationComponent.showNotification(
          this.$t('system_settings.error.general', { message: error.message }), 
          'error'
        );
      }
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
</style>
