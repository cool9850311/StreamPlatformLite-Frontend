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
            <p class="view-count">{{ $t('stream.viewers') }}: {{ viewCount }}</p>
          </div>
          <p v-html="formattedStreamDescription" class="stream-description"></p>
        </div>
      </div>
      <div class="chatroom" ref="chatroom">
        <!-- Dynamic chatroom -->
        <div class="messages">
          <ul>
            <li v-for="message in messages" :key="message.id" @click="showOptions(message, $event)" class="message-item">
              <img 
                :src="message.avatar ? `https://cdn.discordapp.com/avatars/${message.user_id}/${message.avatar}.png` : ''" 
                alt="User Avatar" 
                class="user-avatar" 
                :class="{ 'empty-avatar': !message.avatar }" 
                v-if="message.avatar"
              />
              <div v-else class="user-avatar empty-avatar"></div>
              <div class="message-content">
                <div class="username">{{ message.username }}</div>
                <div class="message">{{ message.message }}</div>
              </div>
            </li>
          </ul>
        </div>
        <!-- Chat input and send button -->
        <div class="chat-input">
          <input 
            v-model="newMessage" 
            maxlength="100" 
            :placeholder="$t('stream.chat.placeholder')" 
            @keyup.enter="sendMessage" 
          />
          <button @click="sendMessage">{{ $t('stream.chat.send') }}</button>
        </div>
      </div>
    </main>
    <!-- Context menu for message options -->
    <div v-if="showContextMenu" class="context-menu" :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }">
      <button @click="deleteMessage(selectedMessage)">{{ $t('stream.chat.delete') }}</button>
      <button @click="muteUser(selectedMessage)">{{ $t('stream.chat.mute') }}</button>
    </div>
    <!-- Use the Notification Component -->
    <Notification ref="notification" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import Hls from 'hls.js';
import axios from 'axios';
import { computed } from 'vue';
import Notification from '~/components/notification.vue';
import { useI18n } from 'vue-i18n';
import DOMPurify from 'dompurify';

const { t: $t } = useI18n();

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
const notification = ref(null);
let retryInterval = null;

const scrollToBottom = () => {
  nextTick(() => {
    const messagesContainer = chatroom.value.querySelector('.messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
};

const sendMessage = async () => {
  if (newMessage.value.trim() === '') return;
  
  try {
    const runtimeConfig = useRuntimeConfig();
    const backendUrl = runtimeConfig.public.BACKEND_URL;
    const streamUUID = streamData.value.uuid;

    await axios.post(`${backendUrl}/livestream/chat`, {
      stream_uuid: streamUUID,
      message: newMessage.value
    }, {
      withCredentials: true
    });

    newMessage.value = '';
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.error('You are not allowed to send messages in this chat.');
      notification.value.showNotification($t('stream.chat.not_allowed'), 'error');
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

const showOptions = async (message, event) => {
  try {
    const runtimeConfig = useRuntimeConfig();
    const backendUrl = runtimeConfig.public.BACKEND_URL;
    // Check auth by making a request - if authorized (admin/editor), show menu
    const response = await axios.get(`${backendUrl}/system-settings`, {
      withCredentials: true
    });
    // If request succeeds, user has admin/editor rights
    selectedMessage.value = message;
    contextMenuX.value = event.clientX;
    contextMenuY.value = event.clientY;
    showContextMenu.value = true;
  } catch (error) {
    // User doesn't have permissions, don't show menu
  }
};

const deleteMessage = async (message) => {
  try {
    const runtimeConfig = useRuntimeConfig();
    const backendUrl = runtimeConfig.public.BACKEND_URL;

    const response = await axios.delete(`${backendUrl}/livestream/chat/${streamData.value.uuid}/${message.id}`, {
      withCredentials: true
    });

    if (response.status === 200) {
      messages.value = messages.value.filter(m => m.id !== message.id);
      showContextMenu.value = false;
      notification.value.showNotification($t('stream.chat.message_deleted'), 'success');
    } else {
      notification.value.showNotification($t('stream.chat.delete_failed'), 'error');
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    notification.value.showNotification($t('stream.chat.delete_failed'), 'error');
  }
};

const muteUser = async (message) => {
  const nuxtApp = useNuxtApp();
  
  // Show confirmation dialog
  const result = await nuxtApp.$swal.fire({
    title: $t('stream.chat.confirm_mute.title'),
    text: $t('stream.chat.confirm_mute.text', { username: message.username }),
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: $t('stream.chat.confirm_mute.confirm_button'),
    cancelButtonText: $t('stream.chat.confirm_mute.cancel_button')
  });

  // If user confirms mute
  if (result.isConfirmed) {
    try {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      const response = await axios.post(`${backendUrl}/livestream/mute-user`, {
        stream_uuid: streamData.value.uuid,
        user_id: message.user_id
      }, {
        withCredentials: true
      });

      if (response.status === 200) {
        showContextMenu.value = false;
        notification.value.showNotification($t('stream.chat.user_muted'), 'success');
      } else {
        notification.value.showNotification($t('stream.chat.mute_failed'), 'error');
      }
    } catch (error) {
      console.error('Error muting user:', error);
      notification.value.showNotification($t('stream.chat.mute_failed'), 'error');
    }
  }
};

const pollDeletedMessages = async () => {
  try {
    const runtimeConfig = useRuntimeConfig();
    const backendUrl = runtimeConfig.public.BACKEND_URL;

    const response = await axios.get(`${backendUrl}/livestream/chat/delete/${streamData.value.uuid}`, {
      withCredentials: true
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
    const hls = new Hls({
      xhrSetup: (xhr, url) => {
        xhr.withCredentials = true;
      }
    });

    hls.loadSource(streamURL);
    hls.attachMedia(video);

    // Clear retry interval if we successfully parse the manifest and start playing
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
      }
      video.play();
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            // Check if it's specifically a 404 error
            if (data.response && data.response.code === 404) {
              console.error('404 error encountered. Scheduling retry every second...');
              if (!retryInterval) {
                retryInterval = setInterval(() => {
                  console.log('Retrying to load source...');
                  hls.loadSource(streamURL);
                  hls.startLoad();
                }, 1000);
              }
            } else {
              console.error('Network error encountered, trying to recover...');
              hls.startLoad();
            }
            break;

          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('Media error encountered, trying to recover...');
            hls.recoverMediaError();
            break;

          default:
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
  const withBreaks = streamDescription.value.replace(/\n/g, '<br>');
  return DOMPurify.sanitize(withBreaks, {
    ALLOWED_TAGS: ['br', 'b', 'i', 'u', 'em', 'strong', 'p'],
    ALLOWED_ATTR: []
  });
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
    const runtimeConfig = useRuntimeConfig();
    const backendUrl = runtimeConfig.public.BACKEND_URL;

    const response = await axios.get(`${backendUrl}/livestream/one`, {
      withCredentials: true
    });
    streamData.value = response.data;
    streamTitle.value = streamData.value.title;
    streamDescription.value = streamData.value.information;
    const streamURL = streamData.value.streamURL;

    const video = document.getElementById('video');
    initializeHls(video, streamURL);

    const pingViewerCount = async () => {
      try {
        const response = await axios.get(`${backendUrl}/livestream/ping-viewer-count/${streamData.value.uuid}`, {
          withCredentials: true
        });
        viewCount.value = response.data.viewer_count;
      } catch (error) {
        console.error('Error pinging viewer count:', error);
      }
    };

    setInterval(pingViewerCount, 5000);
    pingViewerCount();

    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${backendUrl}/livestream/chat/${streamData.value.uuid}/${lastMessageId.value}`, {
          withCredentials: true
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

    setInterval(fetchMessages, 500);
    fetchMessages();

    setInterval(pollDeletedMessages, 2000);
    pollDeletedMessages();

    document.addEventListener('click', handleClickOutside);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      window.location.href = '/notAllowed';
    } else if (error.response && error.response.status === 404) {
      // No livestream currently active, show friendly message
      streamTitle.value = 'No Stream Active';
      streamDescription.value = 'There is currently no livestream available. Please check back later!';
      console.log('No active livestream found');
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
  overflow: hidden;
}

.stream-video {
  flex: 5;
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
  flex: 2;
  padding: 10px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 0;
  overflow: hidden;
}

.messages {
  flex: 1;
  overflow-y: auto;
  max-height: 80%;
}

.chatroom ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
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
}

.chat-input {
  display: flex;
  margin-top: 10px;
  flex-shrink: 0;
  max-height: 20%;
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
    flex: 3;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  .stream-description {
    overflow-y: scroll;
    max-height: 5.5em;
  }

  .chatroom {
    flex: 2;
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
    flex: 4;
    padding-bottom: 0;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    
  }

  .stream-description {
    max-height: 4.5em;
    overflow-y: scroll;
  }

  .chatroom {
    flex: 6;
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

.message-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  background-color: #e9ecef;
  padding: 10px;
  border-radius: 5px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
}

.message-content {
  display: flex;
  flex-direction: column;
}

.empty-avatar {
  background-color: #e9ecef;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
</style>