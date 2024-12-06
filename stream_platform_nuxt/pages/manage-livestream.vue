<template>
  <div v-if="hasAccess" class="livestream-container">
    <h1>Manage Livestream</h1>
    <form @submit.prevent="isLivestreamExist ? deleteLivestream() : createLivestream()" class="livestream-form">
      <div class="form-group">
        <label for="name">Name:</label>
        <input v-model="livestream.name" id="name" type="text" class="form-control" :disabled="isLivestreamExist" />
      </div>
      <div class="form-group">
        <label for="title">Title:</label>
        <input v-model="livestream.title" id="title" type="text" class="form-control" :disabled="isLivestreamExist" />
      </div>
      <div class="form-group">
        <label for="information">Information:</label>
        <textarea v-model="livestream.information" id="information" class="form-control" :disabled="isLivestreamExist"></textarea>
      </div>
      <div class="form-group">
        <label for="visibility">Visibility:</label>
        <input v-model="livestream.visibility" id="visibility" type="text" class="form-control" :disabled=true />
      </div>
      <div class="form-group">
        <label for="streamPushURL">Stream Push URL:</label>
        <input v-model="livestream.streamPushURL" id="streamPushURL" type="text" class="form-control" :disabled=true />
      </div>
      <div class="form-group">
        <label for="banList">Ban List:</label>
        <textarea v-model="banListString" id="banList" class="form-control" :disabled=true></textarea>
      </div>
      <div class="form-group">
        <label for="muteList">Mute List:</label>
        <textarea v-model="muteListString" id="muteList" class="form-control" :disabled=true></textarea>
      </div>
      <button v-if="!isLivestreamExist" type="submit" class="btn btn-primary">Create</button>
      <button v-if="isLivestreamExist" type="button" @click="deleteLivestream" class="btn btn-danger">Delete</button>
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
        muteList: []
      },
      banListString: '',
      muteListString: '',
      hasAccess: false,
      isLivestreamExist: false,
      notification: {
        message: '',
        type: ''
      }
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
    this.fetchLivestream(decodedToken.UserID);
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
    async fetchLivestream(userId) {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      try {
        // First request to get the UUID
        const initialResponse = await fetch(`${backendUrl}/livestream/one`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!initialResponse.ok) {
          console.error('Failed to fetch initial livestream data');
          return;
        }

        const initialData = await initialResponse.json();
        const uuid = initialData.uuid;

        // Second request to get full data using the UUID
        const response = await fetch(`${backendUrl}/livestream/${uuid}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
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
        information: this.livestream.information
      };

      try {
        const response = await fetch(`${backendUrl}/livestream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(livestreamData)
        });
        if (!response.ok) {
          const errorData = await response.json();
          this.$refs.notification.showNotification(errorData.message || 'Failed to create livestream', 'error');
        } else {
          const data = await response.json();
          this.livestream = data;
          this.isLivestreamExist = true;
          const token = localStorage.getItem('token');
          const decodedToken = this.decodeJWT(token);
          this.fetchLivestream(decodedToken.UserID);
          this.$refs.notification.showNotification('Livestream created successfully.', 'success');
        }
      } catch (error) {
        this.$refs.notification.showNotification('Error creating livestream: ' + error.message, 'error');
      }
    },
    async deleteLivestream() {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      try {
        const response = await fetch(`${backendUrl}/livestream/${this.livestream.uuid}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!response.ok) {
          const errorData = await response.json();
          this.$refs.notification.showNotification(errorData.message || 'Failed to delete livestream', 'error');
        } else {
          this.livestream = {
            uuid: '',
            name: '',
            visibility: 'member_only',
            title: '',
            information: '',
            streamPushURL: '',
            banList: [],
            muteList: []
          };
          this.isLivestreamExist = false;
          this.$refs.notification.showNotification('Livestream deleted successfully.', 'success');
        }
      } catch (error) {
        this.$refs.notification.showNotification('Error deleting livestream: ' + error.message, 'error');
      }
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
</style>
