<template>
  <div v-if="hasAccess" class="settings-page">
    <div class="settings-container">
      <div class="settings-card">
        <div class="settings-header">
          <div class="header-icon">⚙️</div>
          <div class="header-content">
            <h1 class="settings-title">{{ $t('system_settings.title') }}</h1>
          </div>
        </div>

        <notification ref="notificationComponent" />

        <form @submit.prevent="saveSettings" class="settings-form">
          <div class="form-section">
            <div class="form-group">
              <label for="editorRoleId" class="form-label">
                <span class="label-icon">👑</span>
                {{ $t('system_settings.moderator_role_id') }}
              </label>
              <input
                v-model="settings.editorRoleId"
                id="editorRoleId"
                type="text"
                class="form-control"
                placeholder="Moderator Role ID"
              />
            </div>

            <div class="form-group">
              <label for="streamAccessRoleIds" class="form-label">
                <span class="label-icon">🎫</span>
                {{ $t('system_settings.stream_access_role_ids') }}
              </label>
              <textarea
                v-model="streamAccessRoleIdsString"
                id="streamAccessRoleIds"
                class="form-control textarea-control"
                :placeholder="$t('system_settings.role_ids_hint')"
                rows="5"
              ></textarea>
              <p class="form-hint">{{ $t('system_settings.role_ids_hint') }}</p>
            </div>
          </div>

          <button type="submit" class="submit-button">
            <span class="btn-icon">💾</span>
            {{ $t('system_settings.save_button') }}
          </button>
        </form>
      </div>
    </div>
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
  async mounted() {
    try {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      const response = await fetch(`${backendUrl}/system-settings`, {
        credentials: 'include'
      });

      if (!response.ok) {
        return this.$router.push('/stream');
      }

      this.hasAccess = true;
      this.fetchSettings();
    } catch (error) {
      this.$router.push('/stream');
    }
  },
  methods: {
    async fetchSettings() {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      try {
        const response = await fetch(`${backendUrl}/system-settings`, {
          credentials: 'include'
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
            'Content-Type': 'application/json'
          },
          credentials: 'include',
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
* {
  box-sizing: border-box;
}

.settings-page {
  min-height: calc(100vh - 72px);
  padding: 40px 20px;
}

.settings-container {
  max-width: 720px;
  margin: 0 auto;
}

.settings-card {
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

.settings-header {
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

.settings-title {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
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

.textarea-control {
  resize: vertical;
  min-height: 120px;
}

.form-control:focus {
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.form-control::placeholder {
  color: #94a3b8;
}

.form-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}

.form-hint::before {
  content: 'ℹ';
  color: #3b82f6;
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

/* Responsive */
@media (max-width: 640px) {
  .settings-card {
    padding: 28px 20px;
  }

  .settings-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .header-icon {
    width: 56px;
    height: 56px;
    font-size: 28px;
  }

  .settings-title {
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
