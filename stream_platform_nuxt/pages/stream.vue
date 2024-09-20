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
          <p v-html="formattedStreamDescription" class="stream-description"></p>
        </div>
      </div>
      <div class="chatroom" ref="chatroom">
        <!-- Dynamic chatroom -->
        <div class="messages">
          <ul>
            <li v-for="message in messages" :key="message.id" @click="showOptions(message, $event)">
              <div class="username">{{ message.username }}</div>
              <div class="message">{{ message.message }}</div>
            </li>
          </ul>
        </div>
        <!-- Chat input and send button -->
        <div class="chat-input">
          <input v-model="newMessage" maxlength="100" placeholder="Type your message..." @keyup.enter="sendMessage" />
          <button @click="sendMessage">Send</button>
        </div>
      </div>
    </main>
    <!-- Context menu for message options -->
    <div v-if="showContextMenu" class="context-menu" :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }">
      <button @click="deleteMessage(selectedMessage)">Delete</button>
      <button @click="muteUser(selectedMessage)">Mute</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import Hls from 'hls.js';
import axios from 'axios';
import { computed } from 'vue';

// Reactive variables
const streamData = ref({});
const streamTitle = ref('Stream Title');
const streamDescription = ref('This is a description of the stream.');
const viewCount = ref(0);
const messages = ref([]);
const lastMessageId = ref('-1');
const newMessage = ref('');
const chatroom = ref(null);
const showContextMenu = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const selectedMessage = ref(null);

const scrollToBottom = () => {
  nextTick(() => {
    const messagesContainer = chatroom.value.querySelector('.messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
};

const sendMessage = async () => {
  if (newMessage.value.trim() === '') return;
  
  try {
    const token = localStorage.getItem('token');
    const runtimeConfig = useRuntimeConfig();
    const backendUrl = runtimeConfig.public.BACKEND_URL;
    const streamUUID = streamData.value.uuid;

    await axios.post(`${backendUrl}/livestream/chat`, {
      stream_uuid: streamUUID,
      message: newMessage.value
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    newMessage.value = ''; // Clear the input after sending
  } catch (error) {
    if (error.response && error.response.status === 403) {
      // Handle 403 Forbidden error
      console.error('You are not allowed to send messages in this chat.');
      alert('You are not allowed to send messages in this chat. You may be muted or banned.');
    }
    console.error('Error sending message:', error);
  }
};

const decodeJWT = (token) => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
};

const showOptions = (message, event) => {
  const token = localStorage.getItem('token');
  const decodedToken = decodeJWT(token); // Use decodeJWT to parse the token
  if (decodedToken && decodedToken.Role <= 2) {
    selectedMessage.value = message;
    contextMenuX.value = event.clientX;
    contextMenuY.value = event.clientY;
    showContextMenu.value = true;
  }
};

const deleteMessage = async (message) => {
  try {
    const token = localStorage.getItem('token');
    const runtimeConfig = useRuntimeConfig();
    const backendUrl = runtimeConfig.public.BACKEND_URL;

    await axios.delete(`${backendUrl}/livestream/chat/${streamData.value.uuid}/${message.id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    messages.value = messages.value.filter(m => m.id !== message.id);
    showContextMenu.value = false;
    alert('Message deleted successfully.');
  } catch (error) {
    console.error('Error deleting message:', error);
    alert('Failed to delete message.');
  }
};

const muteUser = async (message) => {
  try {
    const token = localStorage.getItem('token');
    const runtimeConfig = useRuntimeConfig();
    const backendUrl = runtimeConfig.public.BACKEND_URL;

    await axios.post(`${backendUrl}/livestream/mute-user`, {
      stream_uuid: streamData.value.uuid,
      user_id: message.user_id
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    showContextMenu.value = false;
    alert('User muted successfully.');
  } catch (error) {
    console.error('Error muting user:', error);
    alert('Failed to mute user.');
  }
};

// Function to poll for deleted messages
const pollDeletedMessages = async () => {
  try {
    const token = localStorage.getItem('token');
    const runtimeConfig = useRuntimeConfig();
    const backendUrl = runtimeConfig.public.BACKEND_URL;

    const response = await axios.get(`${backendUrl}/livestream/chat/delete/${streamData.value.uuid}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const deletedMessageIds = response.data;
    if (deletedMessageIds.length > 0) {
      messages.value = messages.value.filter(message => !deletedMessageIds.includes(message.id));
    }
  } catch (error) {
    console.error('Error fetching deleted messages:', error);
  }
};

const initializeHls = (video, streamURL) => {
  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(streamURL);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play();
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            // Try to recover network error
            console.error('Network error encountered, trying to recover...');
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            // Try to recover media error
            console.error('Media error encountered, trying to recover...');
            hls.recoverMediaError();
            break;
          default:
            // Cannot recover
            console.error('Fatal error encountered, destroying HLS instance...');
            hls.destroy();
            break;
        }
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = streamURL;
    video.addEventListener('loadedmetadata', () => {
      video.play();
    });
  }
};

const formattedStreamDescription = computed(() => {
  return streamDescription.value.replace(/\n/g, '<br>');
});

const handleClickOutside = (event) => {
  const contextMenu = document.querySelector('.context-menu');
  const messageElements = document.querySelectorAll('.messages li');
  const isClickOnMessage = Array.from(messageElements).some(el => el.contains(event.target));

  if (contextMenu && !contextMenu.contains(event.target) && !isClickOnMessage) {
    showContextMenu.value = false;
  }
};

onMounted(async () => {
  try {
    // Retrieve token from localStorage
    const token = localStorage.getItem('token');
    const decodedToken = decodeJWT(token); // Use decodeJWT to parse the token
    const runtimeConfig = useRuntimeConfig();
    const backendUrl = runtimeConfig.public.BACKEND_URL;

    // Fetch stream details with Bearer token
    const response = await axios.get(`${backendUrl}/livestream/one`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    streamData.value = response.data;
    streamTitle.value = streamData.value.title;
    streamDescription.value = streamData.value.information;
    const streamURL = streamData.value.streamURL;

    // Initialize HLS.js with retry logic
    const video = document.getElementById('video');
    initializeHls(video, streamURL);

    // Function to ping viewer count
    const pingViewerCount = async () => {
      try {
        const response = await axios.get(`${backendUrl}/livestream/ping-viewer-count/${streamData.value.uuid}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        viewCount.value = response.data.viewer_count;
      } catch (error) {
        console.error('Error pinging viewer count:', error);
      }
    };

    // Poll for viewer count every 5 seconds
    setInterval(pingViewerCount, 5000);
    pingViewerCount();

    // Fetch chat messages
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${backendUrl}/livestream/chat/${streamData.value.uuid}/${lastMessageId.value}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const newMessages = response.data;
        if (newMessages.length > 0) {
          messages.value.push(...newMessages);
          lastMessageId.value = newMessages[newMessages.length - 1].id;
          scrollToBottom();
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    // Poll for new messages every half second
    setInterval(fetchMessages, 500);
    fetchMessages();

    // Poll for deleted messages every 2 seconds
    setInterval(pollDeletedMessages, 2000);
    pollDeletedMessages();

    document.addEventListener('click', handleClickOutside);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // Redirect to notAllowed page
      window.location.href = '/notAllowed';
    } else {
      console.error('Error fetching stream details:', error);
    }
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
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
  overflow: hidden; /* Prevent content from overflowing */
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
  display: flex;
  flex-direction: column;
  flex: 2; /* 30% height */
  padding: 10px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 0; /* Remove margin to connect with stream-video */
  overflow: hidden; /* Prevent content from overflowing */
}

.messages {
  flex: 1;
  overflow-y: auto;
  max-height: 80%; /* 80% of the chatroom height */
}

.chatroom ul {
  list-style-type: none;
  padding: 0;
  margin: 0; /* Ensure no extra margin */
}

.chatroom li {
  margin-bottom: 10px;
  background-color: #e9ecef;
  padding: 10px;
  border-radius: 5px;
}

.username {
  font-weight: bold;
  margin-bottom: 5px;
}

.message {
  word-wrap: break-word;
  flex: 1;
  overflow-y: scroll;
}

.chat-input {
  display: flex;
  margin-top: 10px;
  flex-shrink: 0;
  max-height: 20%; /* 20% of the chatroom height */
}

.chat-input input {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px 0 0 5px;
}

.chat-input button {
  padding: 10px 20px;
  border: none;
  background-color: #007bff;
  color: white;
  border-radius: 0 5px 5px 0;
  cursor: pointer;
}

.chat-input button:hover {
  background-color: #0056b3;
}

@media (min-width: 768px) {
  .stream-content {
    flex-direction: row;
  }

  .stream-video {
    flex: 3; /* 70% width */
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  .stream-description {
    overflow-y: scroll; /* Make it scrollable */
    max-height: 5.5em; /* Approx. 3 lines */
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

  .stream-description {
    max-height: 4.5em; /* Approx. 3 lines */
    overflow-y: scroll; /* Make it scrollable */
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

.context-menu {
  position: absolute;
  background-color: white;
  border: 1px solid #ccc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.context-menu button {
  display: block;
  width: 100%;
  padding: 10px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}

.context-menu button:hover {
  background-color: #f0f0f0;
}
</style>
