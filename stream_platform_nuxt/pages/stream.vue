<template>
  <div class="stream-page">
    <main class="stream-content">
      <div class="stream-video">
        <!-- HLS.js video player -->
        <div class="video-container">
          <video id="video" controls></video>
        </div>
        <!-- Stream details -->
        <div class="stream-details">
          <div class="stream-header">
            <div class="stream-title-wrapper">
              <h2 class="stream-title">{{ streamTitle }}</h2>
            </div>
            <div class="view-count-badge">
              <span class="viewer-icon">👥</span>
              <span class="viewer-count">{{ viewCount }}</span>
              <span class="viewer-label">{{ $t('stream.viewers') }}</span>
            </div>
          </div>
          <div class="description-wrapper">
            <div v-html="formattedStreamDescription" class="stream-description" :class="{ 'expanded': isDescriptionExpanded }"></div>
            <button v-if="streamDescription.length > 40" @click="toggleDescription" class="show-more-btn">
              {{ isDescriptionExpanded ? $t('stream.show_less') : $t('stream.show_more') }}
            </button>
          </div>
        </div>
      </div>
      <div class="chatroom" ref="chatroom">
        <!-- Chat header -->
        <div class="chat-header">
          <span class="chat-icon">💬</span>
          <h3 class="chat-title">{{ $t('stream.chat.title') }}</h3>
        </div>
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
              <div v-else class="user-avatar empty-avatar">
                <span class="avatar-placeholder">👤</span>
              </div>
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
            class="chat-input-field"
          />
          <button @click="sendMessage" class="send-button">
            <span class="send-icon">📤</span>
            <span class="send-text">{{ $t('stream.chat.send') }}</span>
          </button>
        </div>
      </div>
    </main>
    <!-- Context menu for message options -->
    <div v-if="showContextMenu" class="context-menu" :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }">
      <button @click="deleteMessage(selectedMessage)" class="context-menu-item delete-item">
        <span class="menu-icon">🗑️</span>
        {{ $t('stream.chat.delete') }}
      </button>
      <button @click="muteUser(selectedMessage)" class="context-menu-item mute-item">
        <span class="menu-icon">🔇</span>
        {{ $t('stream.chat.mute') }}
      </button>
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
const isDescriptionExpanded = ref(false);
let retryInterval = null;

const toggleDescription = () => {
  isDescriptionExpanded.value = !isDescriptionExpanded.value;
};

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

    // Debug: Log all HLS events
    hls.on(Hls.Events.MANIFEST_LOADING, () => {
      console.log('🔵 HLS: MANIFEST_LOADING');
    });

    hls.on(Hls.Events.MANIFEST_LOADED, (event, data) => {
      console.log('🟢 HLS: MANIFEST_LOADED', data);
    });

    // Clear retry interval if we successfully parse the manifest and start playing
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('✅ HLS: MANIFEST_PARSED - trying to play');
      if (retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
      }
      video.play().catch(err => {
        console.error('❌ Video play() failed:', err);
      });
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error('❌ HLS ERROR:', data);
      if (data.fatal) {
        console.error('💀 HLS FATAL ERROR:', data.type, data.details);
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

  // Only sanitize on client-side
  if (process.client) {
    // DOMPurify will be available on client
    const DOMPurify = require('dompurify');
    return DOMPurify.sanitize(withBreaks, {
      ALLOWED_TAGS: ['br', 'b', 'i', 'u', 'em', 'strong', 'p'],
      ALLOWED_ATTR: []
    });
  }

  // On server-side, just return the text with breaks (without tags for security)
  return withBreaks.replace(/<[^>]*>/g, '');
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
* {
  box-sizing: border-box;
}

.stream-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-family: 'Arial', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.stream-content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  padding: 20px;
  gap: 20px;
  overflow: hidden;
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

/* Video Section */
.stream-video {
  background: white;
  border-radius: 24px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.video-container {
  width: 100%;
  background: #000;
  border-radius: 24px 24px 0 0;
  overflow: hidden;
  position: relative;
}

.video-container video {
  width: 100%;
  height: auto;
  display: block;
}

.stream-details {
  padding: 24px;
}

.stream-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
  flex-wrap: wrap;
  gap: 12px;
}

.stream-title-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.stream-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.view-count-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  padding: 8px 16px;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.viewer-icon {
  font-size: 18px;
}

.viewer-count {
  font-size: 18px;
  font-weight: 700;
}

.viewer-label {
  font-size: 14px;
  opacity: 0.9;
}

.stream-description {
  color: #475569;
  line-height: 1.6;
  font-size: 15px;
  overflow-y: auto;
  max-height: 6em;
  padding-right: 8px;
}

.stream-description::-webkit-scrollbar {
  width: 6px;
}

.stream-description::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.stream-description::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.stream-description::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Chatroom Section */
.chatroom {
  display: flex;
  flex-direction: column;
  flex: 2;
  background: white;
  border-radius: 24px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
}

.chat-icon {
  font-size: 24px;
}

.chat-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.messages::-webkit-scrollbar {
  width: 8px;
}

.messages::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.messages::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.messages ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 14px 16px;
  border-radius: 16px;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
}

.message-item:nth-child(even) {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.message-item:hover {
  transform: translateX(4px);
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.user-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-avatar {
  background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-placeholder {
  font-size: 20px;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.username {
  font-weight: 700;
  color: #0f172a;
  font-size: 14px;
}

.message {
  word-wrap: break-word;
  overflow-wrap: break-word;
  color: #475569;
  font-size: 14px;
  line-height: 1.5;
}

/* Chat Input */
.chat-input {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  background: #f8fafc;
  border-top: 2px solid #e2e8f0;
}

.chat-input-field {
  flex: 1;
  padding: 14px 16px;
  font-size: 15px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  transition: all 0.3s ease;
  outline: none;
  font-family: inherit;
}

.chat-input-field:focus {
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.chat-input-field::placeholder {
  color: #94a3b8;
}

.send-button {
  padding: 14px 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.send-icon {
  font-size: 18px;
  display: inline-block;
  transition: transform 0.3s ease;
}

.send-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.send-button:hover .send-icon {
  transform: scale(1.2);
}

.send-button:active {
  transform: translateY(0);
}

/* Context Menu */
.context-menu {
  position: absolute;
  background: white;
  border-radius: 16px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.15),
    0 10px 10px -5px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  overflow: hidden;
  min-width: 180px;
  animation: menuFadeIn 0.2s ease-out;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
}

.context-menu-item:last-child {
  border-bottom: none;
}

.menu-icon {
  font-size: 16px;
}

.context-menu-item:hover {
  background: #f8fafc;
}

.delete-item:hover {
  background: #fef2f2;
  color: #dc2626;
}

.mute-item:hover {
  background: #fef3c7;
  color: #d97706;
}

/* Responsive Design */
@media (min-width: 768px) {
  .stream-content {
    flex-direction: row;
    height: calc(100vh - 72px - 40px);
  }

  .stream-video {
    flex: 7;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .video-container {
    border-radius: 24px 0 0 0;
    flex: 1;
    min-height: 0;
  }

  .video-container video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .stream-details {
    flex-shrink: 0;
  }

  .chatroom {
    flex: 3;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    height: 100%;
  }

  .stream-description {
    max-height: 5.5em;
  }

  .send-text {
    display: inline;
  }

  .show-more-btn {
    display: none;
  }

  .stream-description {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: unset;
  }
}

@media (max-width: 767px) {
  .stream-content {
    flex-direction: column;
    padding: 12px;
    gap: 12px;
  }

  .stream-video {
    flex: 0 0 auto;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .video-container {
    border-radius: 24px 24px 0 0;
    aspect-ratio: 16 / 9;
  }

  .video-container video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .chatroom {
    flex: 1;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  .stream-details {
    padding: 20px 20px 8px 20px;
  }

  .stream-header {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 10px;
    padding-bottom: 10px;
  }

  .stream-title-wrapper {
    width: 100%;
  }

  .stream-title {
    font-size: 20px;
  }

  .view-count-badge {
    align-self: flex-start;
  }

  .description-wrapper {
    position: relative;
    margin-bottom: 0;
  }

  .stream-description {
    max-height: 1.2em;
    font-size: 13px;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    overflow: hidden;
    transition: max-height 0.3s ease;
    margin-bottom: 0;
  }

  .stream-description.expanded {
    max-height: 100em;
    -webkit-line-clamp: unset;
  }

  .show-more-btn {
    background: none;
    border: none;
    color: #3b82f6;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 2px 0 0 0;
    margin-top: 2px;
    margin-bottom: 0;
    transition: color 0.2s ease;
  }

  .show-more-btn:hover {
    color: #2563eb;
    text-decoration: underline;
  }

  .chat-header {
    padding: 16px 20px;
  }

  .chat-title {
    font-size: 18px;
  }

  .messages {
    padding: 12px 16px;
  }

  .chat-input {
    padding: 16px;
  }

  .send-text {
    display: none;
  }

  .send-button {
    padding: 14px 18px;
  }

  .message-item {
    padding: 12px;
  }

  .user-avatar {
    width: 36px;
    height: 36px;
  }

  .avatar-placeholder {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .stream-content {
    padding: 8px;
  }

  .stream-video {
    border-radius: 20px 20px 0 0;
  }

  .video-container {
    border-radius: 20px 20px 0 0;
  }

  .chatroom {
    border-radius: 0 0 20px 20px;
  }

  .stream-details {
    padding: 16px 16px 6px 16px;
  }

  .stream-title {
    font-size: 18px;
  }

  .viewer-count,
  .viewer-label {
    font-size: 13px;
  }

  .chat-input {
    padding: 12px;
    gap: 8px;
  }

  .chat-input-field {
    padding: 12px 14px;
    font-size: 14px;
  }

  .send-button {
    padding: 12px 16px;
  }
}
</style>