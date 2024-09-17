<template>
  <div class="stream-page">
    <main class="stream-content">
      <div class="stream-video">
        <!-- HLS.js video player -->
        <video id="video" controls></video>
        <!-- Stream details -->
        <div class="stream-details">
          <div class="stream-header">
            <h2>{{ streamTitle }}</h2>
            <p class="view-count">Viewers: {{ viewCount }}</p>
          </div>
          <p>{{ streamDescription }}</p>
        </div>
      </div>
      <div class="chatroom">
        <!-- Dynamic chatroom -->
        <ul>
          <li v-for="message in messages" :key="message.id">{{ message.text }}</li>
        </ul>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Hls from 'hls.js';
import axios from 'axios';

const userIcon = ref('path_to_user_icon');
const streamTitle = ref('Stream Title');
const streamDescription = ref('This is a description of the stream.');
const viewCount = ref(143); // Example view count
const messages = ref([]);



onMounted(async () => {
  try {
    // Retrieve token from localStorage
    const token = localStorage.getItem('token');
    const runtimeConfig = useRuntimeConfig()
    const backendUrl = runtimeConfig.public.BACKEND_URL;
    // Fetch stream details with Bearer token
    const response = await axios.get(`${backendUrl}/livestream/one`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const streamData = response.data;
    streamTitle.value = streamData.title;
    streamDescription.value = streamData.information;
    const streamURL = streamData.streamURL;

    // Initialize HLS.js
    const video = document.getElementById('video');
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(streamURL);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
      });
    }

    // Fetch chat messages
    const fetchMessages = async () => {
      try {
        // const response = await axios.get('https://api.yourdomain.com/chat/messages');
        messages.value = [{text: 'Hello World'}, {text: 'Hello World'}, {text: 'Hello World'}];
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    // Poll for new messages every 5 seconds
    setInterval(fetchMessages, 5000);
    fetchMessages();
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // Redirect to notAllowed page
      window.location.href = '/notAllowed';
    } else {
      console.error('Error fetching stream details:', error);
    }
  }
});
</script>

<style scoped>
.stream-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.stream-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.stream-title {
  flex-grow: 1;
  text-align: center;
}

.view-count {
  margin-left: 10px;
}

.stream-content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.stream-video {
  flex: 5; /* 70% width */
  padding: 10px;
}

.stream-video video {
  width: 100%;
  height: auto;
}

.chatroom {
  flex: 2; /* 20% width */
  padding: 10px;
  overflow-y: auto;
}

.chatroom ul {
  list-style-type: none;
  padding: 0;
}

.chatroom li {
  margin-bottom: 10px;
  background-color: #f1f1f1;
  padding: 10px;
  border-radius: 5px;
}

.stream-details {
  margin-top: 10px;
  color: #333;
}

.stream-header h2 {
  margin: 0;
  font-size: 1.5em;
}

.stream-details p {
  margin: 5px 0;
}

@media (min-width: 768px) {
  .stream-content {
    flex-direction: row;
  }

  .stream-video {
    flex: 5; /* 70% width */
  }

  .chatroom {
    flex: 2; /* 20% width */
  }
}
</style>
