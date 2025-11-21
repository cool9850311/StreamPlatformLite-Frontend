<template>
  <div v-if="hasAccess" class="livestream-page">
    <div class="livestream-container">
      <div class="livestream-card">
        <div class="livestream-header">
          <div class="header-icon">📡</div>
          <div class="header-content">
            <h1 class="livestream-title">{{ $t('manage_livestream.title') }}</h1>
            <p class="livestream-subtitle">{{ isLivestreamExist ? $t('manage_livestream.subtitle_manage') : $t('manage_livestream.subtitle_create') }}</p>
          </div>
        </div>

        <Notification ref="notification" />

        <form @submit.prevent="isLivestreamExist ? deleteLivestream() : createLivestream()" class="livestream-form">
          <div class="form-section">
            <div class="form-group">
              <label for="name" class="form-label">
                <span class="label-icon">🏷️</span>
                {{ $t('manage_livestream.name') }}
              </label>
              <input
                v-model="livestream.name"
                id="name"
                type="text"
                class="form-control"
                :disabled="isLivestreamExist"
                :placeholder="$t('manage_livestream.name')"
              />
            </div>

            <div class="form-group">
              <label for="title" class="form-label">
                <span class="label-icon">📝</span>
                {{ $t('manage_livestream.title_field') }}
              </label>
              <input
                v-model="livestream.title"
                id="title"
                type="text"
                class="form-control"
                :disabled="isLivestreamExist"
                :placeholder="$t('manage_livestream.title_field')"
              />
            </div>

            <div class="form-group">
              <label for="information" class="form-label">
                <span class="label-icon">📋</span>
                {{ $t('manage_livestream.information') }}
              </label>
              <textarea
                v-model="livestream.information"
                id="information"
                class="form-control textarea-control"
                :disabled="isLivestreamExist"
                :placeholder="$t('manage_livestream.information')"
                rows="4"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="visibility" class="form-label">
                <span class="label-icon">👁️</span>
                {{ $t('manage_livestream.visibility') }}
              </label>
              <input
                v-model="livestream.visibility"
                id="visibility"
                type="text"
                class="form-control form-control-readonly"
                :disabled="true"
              />
            </div>

            <div v-if="isLivestreamExist" class="form-group">
              <label for="streamPushURL" class="form-label">
                <span class="label-icon">🔗</span>
                {{ $t('manage_livestream.stream_push_url') }}
              </label>
              <input
                v-model="livestream.streamPushURL"
                id="streamPushURL"
                type="text"
                class="form-control form-control-readonly"
                :disabled="true"
              />
            </div>

            <div v-if="isLivestreamExist" class="form-group">
              <label for="banList" class="form-label">
                <span class="label-icon">🚫</span>
                {{ $t('manage_livestream.ban_list') }}
              </label>
              <textarea
                v-model="banListString"
                id="banList"
                class="form-control textarea-control form-control-readonly"
                :disabled="true"
                rows="3"
              ></textarea>
            </div>

            <div v-if="isLivestreamExist" class="form-group">
              <label for="muteList" class="form-label">
                <span class="label-icon">🔇</span>
                {{ $t('manage_livestream.mute_list') }}
              </label>
              <textarea
                v-model="muteListString"
                id="muteList"
                class="form-control textarea-control form-control-readonly"
                :disabled="true"
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-icon">🎥</span>
                {{ $t('manage_livestream.record_stream') }}
              </label>
              <div class="toggle-wrapper">
                <label class="switch">
                  <input v-model="livestream.is_record" id="is_record" type="checkbox" :disabled="isLivestreamExist">
                  <span class="slider round"></span>
                </label>
                <span class="toggle-label">{{ livestream.is_record ? $t('manage_livestream.recording_enabled') : $t('manage_livestream.recording_disabled') }}</span>
              </div>
            </div>
          </div>

          <div class="button-group">
            <button
              v-if="isLivestreamExist && livestream.is_record"
              type="button"
              @click="downloadRecording"
              class="btn btn-download"
            >
              <span class="btn-icon">📥</span>
              {{ $t('manage_livestream.download_recording') }}
            </button>

            <button
              v-if="!isLivestreamExist"
              type="submit"
              class="btn btn-primary"
            >
              <span class="btn-icon">✨</span>
              {{ $t('manage_livestream.create') }}
            </button>

            <button
              v-if="isLivestreamExist"
              type="button"
              @click="deleteLivestream"
              class="btn btn-danger"
            >
              <span class="btn-icon">🗑️</span>
              {{ $t('manage_livestream.delete') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div v-else-if="isLivestreamExist" class="viewer-container">
    <h2>{{ livestream.title }}</h2>
    <p>{{ livestream.information }}</p>
  </div>
</template>

<script>
import Notification from '@/components/notification.vue';
import { useNuxtApp } from '#app';

export default {
  components: {
    Notification
  },
  data() {
    return {
      livestream: {
        uuid: '',
        name: '',
        visibility: 'member_only',
        title: '',
        information: '',
        streamPushURL: '',
        banList: [],
        muteList: [],
        is_record: true
      },
      banListString: '',
      muteListString: '',
      hasAccess: false,
      isLivestreamExist: false,
      notification: {
        message: '',
        type: ''
      },
      downloadInterval: null,
      isDownloading: false,
    };
  },
  async mounted() {
    try {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      // Check admin status by calling system-settings endpoint
      const adminCheckResponse = await fetch(`${backendUrl}/system-settings`, {
        credentials: 'include'
      });

      if (!adminCheckResponse.ok) {
        // User is not admin, redirect to stream page
        return this.$router.push('/stream');
      }

      this.hasAccess = true;
      await this.fetchLivestream();
    } catch (error) {
      this.$router.push('/stream');
    }
  },
  methods: {

    async fetchLivestream() {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      try {
        // First request to get the UUID
        const initialResponse = await fetch(`${backendUrl}/livestream/one`, {
          credentials: 'include'
        });

        if (!initialResponse.ok) {
          console.error('Failed to fetch initial livestream data');
          return;
        }

        const initialData = await initialResponse.json();
        const uuid = initialData.uuid;

        // Second request to get full data using the UUID
        const response = await fetch(`${backendUrl}/livestream/${uuid}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          this.livestream = data;
          this.banListString = data.ban_list.join('\n');
          this.muteListString = data.mute_list.join('\n');
          this.isLivestreamExist = true;
        } else {
          console.error('Failed to fetch livestream data');
        }
      } catch (error) {
        console.error('Error fetching livestream data:', error);
      }
    },
    async createLivestream() {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      const livestreamData = {
        name: this.livestream.name,
        visibility: this.livestream.visibility,
        title: this.livestream.title,
        information: this.livestream.information,
        is_record: this.livestream.is_record
      };

      try {
        const response = await fetch(`${backendUrl}/livestream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(livestreamData)
        });
        if (!response.ok) {
          const errorData = await response.json();
          this.$refs.notification.showNotification(errorData.message || this.$t('manage_livestream.error.create'), 'error');
        } else {
          const data = await response.json();
          this.livestream = data;
          this.isLivestreamExist = true;
          this.fetchLivestream();
          this.$refs.notification.showNotification(this.$t('manage_livestream.success.create'), 'success');
        }
      } catch (error) {
        this.$refs.notification.showNotification(this.$t('manage_livestream.error.create_general') + ': ' + error.message, 'error');
      }
    },
    async deleteLivestream() {
      const nuxtApp = useNuxtApp();
      
      // Show confirmation dialog
      const result = await nuxtApp.$swal.fire({
        title: this.$t('manage_livestream.confirm_delete.title'),
        text: this.$t('manage_livestream.confirm_delete.text'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: this.$t('manage_livestream.confirm_delete.confirm_button'),
        cancelButtonText: this.$t('manage_livestream.confirm_delete.cancel_button')
      });

      // If user confirms deletion
      if (result.isConfirmed) {
        const runtimeConfig = useRuntimeConfig();
        const backendUrl = runtimeConfig.public.BACKEND_URL;

        try {
          const response = await fetch(`${backendUrl}/livestream/${this.livestream.uuid}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          if (!response.ok) {
            const errorData = await response.json();
            this.$refs.notification.showNotification(errorData.message || this.$t('manage_livestream.error.delete'), 'error');
          } else {
            this.livestream = {
              uuid: '',
              name: '',
              visibility: 'member_only',
              title: '',
              information: '',
              streamPushURL: '',
              banList: [],
              muteList: [],
              is_record: true
            };
            this.isLivestreamExist = false;
            nuxtApp.$swal.fire(
              this.$t('manage_livestream.success.deleted_title'),
              this.$t('manage_livestream.success.delete'),
              'success'
            );
          }
        } catch (error) {
          this.$refs.notification.showNotification(this.$t('manage_livestream.error.delete') + ': ' + error.message, 'error');
        }
      }
    },
    async downloadRecording() {
      if (this.isDownloading) return;
      this.isDownloading = true;
      
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;
      const nuxtApp = useNuxtApp();
      
      let processingAlertShown = false;  // Add flag to track if alert is shown

      const checkAndDownload = async () => {
        try {
          const response = await fetch(`${backendUrl}/livestream/record/${this.livestream.uuid}`, {
            credentials: 'include'
          });

          if (response.status === 401) {
            nuxtApp.$swal.close();
            this.$refs.notification.showNotification(this.$t('manage_livestream.error.auth_failed'), 'error');
            if (this.downloadInterval) {
              clearInterval(this.downloadInterval);
              this.downloadInterval = null;
            }
            this.isDownloading = false;
            return true;
          }

          if (response.status === 404) {
            if (!processingAlertShown) {  // Only show alert if not already shown
              processingAlertShown = true;
              nuxtApp.$swal.fire({
                title: this.$t('manage_livestream.processing_recording.title'),
                text: this.$t('manage_livestream.processing_recording.text'),
                icon: 'info',
                allowOutsideClick: false,
                showConfirmButton: false
              });
            }
            return false;
          }

          if (response.ok) {
            nuxtApp.$swal.close();
            processingAlertShown = false;  // Reset flag after alert is closed

            // Get filename from Content-Disposition header with UTF-8 support
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'recording.mp4';

            if (contentDisposition) {
              // Check for UTF-8 encoded filename
              const filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
              if (filenameMatch) {
                filename = decodeURIComponent(filenameMatch[1]);
              } else {
                // Fallback to regular filename
                const regularMatch = contentDisposition.match(/filename="?([^";\n]*)"?/);
                if (regularMatch) {
                  filename = regularMatch[1];
                }
              }
            }

            // Create blob and trigger download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            // Add stopPropagation to fix Chrome download attribute being ignored
            a.addEventListener('click', function(e) {
              e.stopPropagation();
            }, { once: true });
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            if (this.downloadInterval) {
              clearInterval(this.downloadInterval);
              this.downloadInterval = null;
            }
            this.isDownloading = false;
            return true;
          }
          return false;
        } catch (error) {
          nuxtApp.$swal.close();
          console.error('Error downloading recording:', error);
          this.$refs.notification.showNotification(this.$t('manage_livestream.error.download'), 'error');
          if (this.downloadInterval) {
            clearInterval(this.downloadInterval);
            this.downloadInterval = null;
          }
          this.isDownloading = false;
          return true;
        }
      };

      // First attempt
      const downloaded = await checkAndDownload();
      if (!downloaded) {
        // If not downloaded, start polling
        this.downloadInterval = setInterval(async () => {
          const success = await checkAndDownload();
          if (success && this.downloadInterval) {
            clearInterval(this.downloadInterval);
            this.downloadInterval = null;
          }
        }, 1000);
      }
    },
  },
  beforeUnmount() {
    if (this.downloadInterval) {
      clearInterval(this.downloadInterval);
    }
  }
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.livestream-page {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  min-height: calc(100vh - 72px);
  padding: 40px 20px;
}

.livestream-container {
  max-width: 800px;
  margin: 0 auto;
}

.livestream-card {
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

.livestream-header {
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

.livestream-title {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
}

.livestream-subtitle {
  color: #64748b;
  font-size: 14px;
  margin: 0;
  line-height: 1.6;
}

.livestream-form {
  display: flex;
  flex-direction: column;
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
  min-height: 100px;
}

.form-control:focus {
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.form-control::placeholder {
  color: #94a3b8;
}

.form-control:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.form-control-readonly {
  background: #f1f5f9;
  color: #64748b;
}

.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
}

.toggle-label {
  font-size: 14px;
  color: #475569;
  font-weight: 500;
}

.switch {
  position: relative;
  display: inline-block;
  width: 56px;
  height: 30px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.4s;
  border-radius: 30px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

input:focus + .slider {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

input:checked + .slider:before {
  transform: translateX(26px);
}

input:disabled + .slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn {
  padding: 16px 24px;
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
  width: 100%;
}

.btn-icon {
  font-size: 20px;
  display: inline-block;
  transition: transform 0.3s ease;
}

.btn:hover .btn-icon {
  transform: scale(1.2);
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
}

.btn-danger:active {
  transform: translateY(0);
}

.btn-download {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-download:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
}

.btn-download:active {
  transform: translateY(0);
}

.viewer-container {
  max-width: 800px;
  margin: 40px auto;
  padding: 40px;
  background: white;
  border-radius: 24px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.viewer-container h2 {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
}

.viewer-container p {
  color: #64748b;
  line-height: 1.6;
}

/* Responsive Design */
@media (max-width: 768px) {
  .livestream-page {
    padding: 24px 16px;
  }

  .livestream-card {
    padding: 28px 20px;
    border-radius: 20px;
  }

  .livestream-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
  }

  .header-icon {
    width: 56px;
    height: 56px;
    font-size: 28px;
  }

  .livestream-title {
    font-size: 24px;
  }

  .form-control {
    padding: 12px 14px;
    font-size: 15px;
  }

  .btn {
    padding: 14px 20px;
    font-size: 15px;
  }

  .viewer-container {
    padding: 28px 20px;
    margin: 24px 16px;
  }
}

@media (max-width: 480px) {
  .livestream-card {
    padding: 20px 16px;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }

  .livestream-title {
    font-size: 20px;
  }

  .toggle-wrapper {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
