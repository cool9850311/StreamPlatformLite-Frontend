<template>
  <div v-if="hasAccess" class="livestream-container">
    <h1>{{ $t('manage_livestream.title') }}</h1>
    <form @submit.prevent="isLivestreamExist ? deleteLivestream() : createLivestream()" class="livestream-form">
      <div class="form-group">
        <label for="name">{{ $t('manage_livestream.name') }}</label>
        <input v-model="livestream.name" id="name" type="text" class="form-control" :disabled="isLivestreamExist" />
      </div>
      <div class="form-group">
        <label for="title">{{ $t('manage_livestream.title_field') }}</label>
        <input v-model="livestream.title" id="title" type="text" class="form-control" :disabled="isLivestreamExist" />
      </div>
      <div class="form-group">
        <label for="information">{{ $t('manage_livestream.information') }}</label>
        <textarea v-model="livestream.information" id="information" class="form-control" :disabled="isLivestreamExist"></textarea>
      </div>
      <div class="form-group">
        <label for="visibility">{{ $t('manage_livestream.visibility') }}</label>
        <input v-model="livestream.visibility" id="visibility" type="text" class="form-control" :disabled=true />
      </div>
      <div class="form-group">
        <label for="streamPushURL">{{ $t('manage_livestream.stream_push_url') }}</label>
        <input v-model="livestream.streamPushURL" id="streamPushURL" type="text" class="form-control" :disabled=true />
      </div>
      <div class="form-group">
        <label for="banList">{{ $t('manage_livestream.ban_list') }}</label>
        <textarea v-model="banListString" id="banList" class="form-control" :disabled=true></textarea>
      </div>
      <div class="form-group">
        <label for="muteList">{{ $t('manage_livestream.mute_list') }}</label>
        <textarea v-model="muteListString" id="muteList" class="form-control" :disabled=true></textarea>
      </div>
      <div class="form-group">
        <label for="is_record">{{ $t('manage_livestream.record_stream') }}</label><br>
        <label class="switch">
          <input v-model="livestream.is_record" id="is_record" type="checkbox" :disabled="isLivestreamExist">
          <span class="slider round"></span>
        </label>
      </div>
      <div v-if="isLivestreamExist && livestream.is_record" class="form-group">
        <button type="button" @click="downloadRecording" class="btn btn-success">{{ $t('manage_livestream.download_recording') }}</button>
      </div>
      <button v-if="!isLivestreamExist" type="submit" class="btn btn-primary">{{ $t('manage_livestream.create') }}</button>
      <button v-if="isLivestreamExist" type="button" @click="deleteLivestream" class="btn btn-danger">{{ $t('manage_livestream.delete') }}</button>
    </form>
  </div>
  <div v-else-if="isLivestreamExist">
    <h2>{{ livestream.title }}</h2>
    <p>{{ livestream.information }}</p>
  </div>
  <Notification ref="notification" />
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

      // Check auth by trying to fetch livestream
      const response = await fetch(`${backendUrl}/livestream/one`, {
        credentials: 'include'
      });

      // Only redirect if unauthorized (401), not if livestream doesn't exist (404)
      if (response.status === 401) {
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
          this.$refs.notification.showNotification(errorData.message || 'Failed to create livestream', 'error');
        } else {
          const data = await response.json();
          this.livestream = data;
          this.isLivestreamExist = true;
          this.fetchLivestream();
          this.$refs.notification.showNotification(this.$t('manage_livestream.success.create'), 'success');
        }
      } catch (error) {
        this.$refs.notification.showNotification('Error creating livestream: ' + error.message, 'error');
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
              'Deleted!',
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
          this.$refs.notification.showNotification('Error downloading recording', 'error');
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
.livestream-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.livestream-form {
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

.btn-success {
  background-color: #28a745;
  color: white;
  margin-bottom: 15px;
}

.btn-success:hover {
  background-color: #218838;
}

.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
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
  background-color: #ccc;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: #007bff;
}

input:focus + .slider {
  box-shadow: 0 0 1px #007bff;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>
