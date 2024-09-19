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
const viewCount = ref(0);
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

    // Function to ping viewer count
    const pingViewerCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${backendUrl}/livestream/ping-viewer-count/${streamData.uuid}`,{
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        viewCount.value = response.data.viewer_count;
      } catch (error) {``
        console.error('Error pinging viewer count:', error);
      }
    };

    // Poll for viewer count every 5 seconds
    setInterval(pingViewerCount, 5000);
    pingViewerCount();

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
  background-color: #f0f2f5;
  font-family: 'Arial', sans-serif;
}

.stream-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  padding: 10px;
  border-bottom: 1px solid #ddd;
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
  font-size: 0.9em;
  color: #666;
}

.stream-content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  padding: 20px;
}

.stream-video {
  flex: 5; /* 70% height */
  padding: 10px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stream-video video {
  width: 100%;
  height: auto;
  border-radius: 10px;
}

.chatroom {
  flex: 2; /* 30% height */
  padding: 10px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  margin-top: 0; /* Remove margin to connect with stream-video */
}

.chatroom ul {
  list-style-type: none;
  padding: 0;
}

.chatroom li {
  margin-bottom: 10px;
  background-color: #e9ecef;
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
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .chatroom {
    flex: 2; /* 30% width */
    margin-top: 0;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 10px;
  }
}

@media (max-width: 767px) {
  .stream-content {
    flex-direction: column;
  }

  .stream-video {
    flex: 4; /* 70% height */
    padding-bottom: 0;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .chatroom {
    flex: 6; /* 30% height */
    margin-top: 0;
    padding-top: 0;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  .stream-details {
    margin-bottom: 0;
  }
}
</style>
