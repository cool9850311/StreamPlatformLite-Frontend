<template>
  <div class="stream-page">
    <main class="stream-content">
      <div class="stream-video">
        <!-- Plyr + HLS.js video player -->
        <div class="video-container" :class="{ 'hidden': !hasActiveStream }">
          <video id="video"></video>
        </div>
        <!-- No stream placeholder -->
        <div v-if="!hasActiveStream" class="no-stream-placeholder">
          <div class="placeholder-content">
            <h3 class="placeholder-title">{{ $t('stream.no_stream.title') }}</h3>
            <p class="placeholder-message">{{ $t('stream.no_stream.message') }}</p>
          </div>
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
        <!-- Chat filter options -->
        <div class="chat-filter">
          <label>
            <input type="radio" v-model="filterMode" value="all" />
            <span>{{ $t('stream.chat.filter.all') }}</span>
          </label>
          <label>
            <input type="radio" v-model="filterMode" value="admin-only" />
            <span>{{ $t('stream.chat.filter.adminOnly') }}</span>
          </label>
        </div>
        <!-- Dynamic chatroom -->
        <div class="messages">
          <ul>
            <li v-for="message in filteredMessages" :key="message.id" @click="showOptions(message, $event)" class="message-item">
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
      <button v-if="!isOwnMessage" @click="muteUser(selectedMessage)" class="context-menu-item mute-item">
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
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
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
const hasActiveStream = ref(true);
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
const currentUserId = ref(null);
const currentUserRole = ref(null);
const isOwnMessage = ref(false);
const filterMode = ref('all'); // 'all' or 'admin-only'
let retryInterval = null;
let playerInstance = null;

// Computed property for filtered messages
const filteredMessages = computed(() => {
  if (filterMode.value === 'all') {
    return messages.value;
  }
  // Only show own messages + Admin/Streamer (role <= 1)
  return messages.value.filter(msg =>
    msg.user_id === currentUserId.value || msg.role <= 1
  );
});

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
  // Check if this is the user's own message
  if (currentUserId.value && message.user_id === currentUserId.value) {
    // User's own message - always show menu
    isOwnMessage.value = true;
    selectedMessage.value = message;
    contextMenuX.value = event.clientX;
    contextMenuY.value = event.clientY;
    showContextMenu.value = true;
    return;
  }

  // Not user's own message - check if user has admin/editor rights (role <= 2)
  if (currentUserRole.value !== null && currentUserRole.value <= 2) {
    // Admin or Editor can delete any message
    isOwnMessage.value = false;
    selectedMessage.value = message;
    contextMenuX.value = event.clientX;
    contextMenuY.value = event.clientY;
    showContextMenu.value = true;
  }
  // If role > 2 (User or Guest), don't show menu for other users' messages
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
  // Initialize Plyr with basic controls
  const player = new Plyr(video, {
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'duration',
      'mute',
      'volume',
      'pip',
      'fullscreen'
    ],
    settings: [],
    speed: { selected: 1, options: [] },
    quality: { default: 'auto', options: [] },
    tooltips: {
      controls: false,  // 不顯示控制按鈕的tooltip
      seek: true        // 保留進度條的時間提示
    },
    autoplay: false
  });

  if (Hls.isSupported()) {
    const hls = new Hls({
      xhrSetup: (xhr, url) => {
        xhr.withCredentials = true;
      },
      enableWorker: true,
      backBufferLength: Infinity,  // 保留所有已播放片段，允许无限回放
      autoStartLoad: false         // 关闭自动载入，避免竞态条件
    });

    // 正确的初始化顺序：先 attachMedia，等待 MEDIA_ATTACHED，再 loadSource
    player.on('ready', () => {
      console.log('🎬 Plyr ready, waiting before attaching media...');
      // 延迟一下，确保所有东西都准备好
      setTimeout(() => {
        console.log('🔗 Attaching media to HLS...');
        hls.attachMedia(video);
      }, 100);
    });

    // 等待 HLS 与 video 绑定完成后，再载入来源
    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      console.log('✅ HLS: MEDIA_ATTACHED - now loading source');
      hls.loadSource(streamURL);
      // 手动开始载入
      hls.startLoad();
    });

    // Debug: Log all HLS events
    hls.on(Hls.Events.MANIFEST_LOADING, () => {
      console.log('🔵 HLS: MANIFEST_LOADING');
    });

    hls.on(Hls.Events.MANIFEST_LOADED, (event, data) => {
      console.log('🟢 HLS: MANIFEST_LOADED', data);
    });

    // Clear retry interval when manifest is successfully parsed
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('✅ HLS: MANIFEST_PARSED - ready to play');
      // 成功載入manifest，顯示播放器
      hasActiveStream.value = true;
      if (retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
      }
      // Don't auto-play, let user click play button
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      // 出现 bufferAppendError 时通知用户刷新页面
      if (data.details === 'bufferAppendError') {
        console.warn('⚠️ bufferAppendError detected! Notifying user to refresh...');
        if (notification.value) {
          notification.value.showNotification($t('stream.player.reload_required'), 'error');
        }
        return;
      }

      console.error('❌ HLS ERROR:', data);

      if (data.fatal) {
        console.error('💀 HLS FATAL ERROR:', data.type, data.details);
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            // Check if it's specifically a 404 error
            if (data.response && data.response.code === 404) {
              console.error('404 error encountered. Showing placeholder and scheduling retry...');
              // 顯示佔位畫面
              hasActiveStream.value = false;
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

    // Store hls instance for cleanup
    player.hls = hls;
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = streamURL;
    video.addEventListener('loadedmetadata', () => {
      video.play();
    });
  }

  return player;
};

const formattedStreamDescription = computed(() => {
  const withBreaks = streamDescription.value.replace(/\n/g, '<br>');

  // Only sanitize on client-side
  if (process.client) {
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

// Watch filterMode and save to localStorage
watch(filterMode, (newValue) => {
  localStorage.setItem('chatFilterMode', newValue);
});

onMounted(async () => {
  // Load filter mode from localStorage
  const savedFilterMode = localStorage.getItem('chatFilterMode');
  if (savedFilterMode) {
    filterMode.value = savedFilterMode;
  }

  try {
    const runtimeConfig = useRuntimeConfig();
    const backendUrl = runtimeConfig.public.BACKEND_URL;

    // Fetch current user ID and role
    try {
      const meResponse = await axios.get(`${backendUrl}/me`, {
        withCredentials: true
      });
      currentUserId.value = meResponse.data.user_id;
      currentUserRole.value = meResponse.data.role;
    } catch (error) {
      console.error('Error fetching current user:', error);
    }

    const response = await axios.get(`${backendUrl}/livestream/one`, {
      withCredentials: true
    });
    streamData.value = response.data;
    streamTitle.value = streamData.value.title;
    streamDescription.value = streamData.value.information;
    const streamURL = streamData.value.streamURL;

    // Initialize player - start with placeholder until manifest loads
    hasActiveStream.value = false;
    const video = document.getElementById('video');
    playerInstance = initializeHls(video, streamURL);

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
      // No livestream configuration found, show placeholder
      hasActiveStream.value = false;
      console.log('No active livestream configuration found');

      // Initialize chat functionality with empty uuid
      document.addEventListener('click', handleClickOutside);
    } else {
      console.error('Error fetching stream details:', error);
    }
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);

  // Cleanup player and hls instance - 确保彻底销毁
  if (playerInstance) {
    if (playerInstance.hls) {
      console.log('🧹 Cleaning up: detaching media and destroying HLS instance');
      try {
        // 先 detach 再 destroy，确保清理干净
        playerInstance.hls.detachMedia();
        playerInstance.hls.destroy();
      } catch (err) {
        console.error('Error destroying HLS:', err);
      }
    }
    try {
      playerInstance.destroy();
    } catch (err) {
      console.error('Error destroying Plyr:', err);
    }
  }

  // Clear retry interval
  if (retryInterval) {
    clearInterval(retryInterval);
  }
});
</script>

<style scoped>
/* Plyr Custom Theme - Modern Minimalist */
:deep(.plyr) {
  --plyr-color-main: #3b82f6;
  --plyr-video-background: #000;
  --plyr-menu-background: rgba(255, 255, 255, 0.95);
  --plyr-menu-color: #334155;
  --plyr-control-icon-size: 18px;
  --plyr-control-spacing: 10px;
  --plyr-font-size-base: 14px;
  --plyr-font-size-small: 13px;
  --plyr-font-size-large: 16px;
  --plyr-range-thumb-height: 13px;
  --plyr-range-track-height: 5px;
  border-radius: 0;
}

:deep(.plyr__control:hover) {
  background: rgba(59, 130, 246, 0.1);
}

:deep(.plyr__control.plyr__tab-focus) {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}

:deep(.plyr__control--overlaid) {
  background: rgba(59, 130, 246, 0.9);
  padding: 18px;
}

:deep(.plyr__control--overlaid:hover) {
  background: #3b82f6;
}

:deep(.plyr__progress__buffer) {
  background: rgba(255, 255, 255, 0.25);
}

:deep(.plyr--video .plyr__controls) {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  padding: 20px;
}

:deep(.plyr__tooltip) {
  background: rgba(0, 0, 0, 0.9);
  border-radius: 6px;
  font-size: 13px;
  padding: 5px 10px;
}

:deep(.plyr--video .plyr__control.plyr__tab-focus),
:deep(.plyr--video .plyr__control:hover),
:deep(.plyr--video .plyr__control[aria-expanded="true"]) {
  background: rgba(59, 130, 246, 0.8);
}

:deep(.plyr__volume input[type="range"]::-webkit-slider-thumb) {
  background: #3b82f6;
}

:deep(.plyr__volume input[type="range"]::-moz-range-thumb) {
  background: #3b82f6;
}

:deep(.plyr__progress input[type="range"]::-webkit-slider-thumb) {
  background: #3b82f6;
}

:deep(.plyr__progress input[type="range"]::-moz-range-thumb) {
  background: #3b82f6;
}

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

.video-container.hidden {
  display: none;
}

.video-container video {
  width: 100%;
  height: auto;
  display: block;
}

.no-stream-placeholder {
  width: 100%;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 24px 24px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px;
}

.placeholder-content {
  text-align: center;
  color: white;
}

.placeholder-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: #f1f5f9;
}

.placeholder-message {
  font-size: 16px;
  color: #cbd5e1;
  margin: 0;
  line-height: 1.6;
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

.chat-filter {
  display: flex;
  gap: 20px;
  padding: 12px 24px;
  background: rgba(59, 130, 246, 0.1);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.chat-filter label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #1f2937;
  transition: color 0.2s;
}

.chat-filter label:hover {
  color: #3b82f6;
}

.chat-filter input[type="radio"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
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

  .no-stream-placeholder {
    border-radius: 24px 0 0 0;
    flex: 1;
    min-height: 0;
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
    height: calc(100vh - 72px - 24px);
    min-height: 0;
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

  .no-stream-placeholder {
    border-radius: 24px 24px 0 0;
    aspect-ratio: 16 / 9;
    min-height: 250px;
  }

  .placeholder-title {
    font-size: 22px;
  }

  .placeholder-message {
    font-size: 14px;
  }

  .chatroom {
    flex: 1;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    min-height: 0;
    overflow: hidden;
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

  .no-stream-placeholder {
    border-radius: 20px 20px 0 0;
    min-height: 200px;
    padding: 30px 20px;
  }

  .placeholder-title {
    font-size: 20px;
    margin-bottom: 10px;
  }

  .placeholder-message {
    font-size: 13px;
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