<template>
  <div class="app-container">
    <header class="main-header">
      <nav>
        <a href="/stream" class="brand-section">
          <div class="logo-icon">
            <img src="/logo.png" alt="StreamPlatform Logo" class="logo-image" />
          </div>
          <h1 class="brand-title">StreamPlatform<span class="lite">Lite</span></h1>
        </a>

        <div class="right-nav">
          <LanguageSwitcher />

          <!-- 未登录：显示登录按钮 -->
          <a v-if="!isLoggedIn" href="/" class="btn-nav-login">
            {{ $t('navigation.login') }}
          </a>

          <!-- 已登录：显示用户菜单 -->
          <Menu v-else as="div" class="relative">
            <MenuButton class="dropdown-button">
              <span class="menu-icon">☰</span>
            </MenuButton>
            <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <MenuItems class="dropdown-menu">
                <MenuItem>
                  <a href="/stream" class="dropdown-item">
                    {{ $t('navigation.stream') }}
                  </a>
                </MenuItem>

                <MenuItem v-if="isAdmin">
                  <a href="/system-settings" class="dropdown-item">
                    {{ $t('navigation.system_settings') }}
                  </a>
                </MenuItem>
                <MenuItem v-if="isAdmin">
                  <a href="/manage-livestream" class="dropdown-item">
                    {{ $t('navigation.manage_livestreams') }}
                  </a>
                </MenuItem>
                <MenuItem v-if="isAdmin">
                  <a href="/manage-accounts" class="dropdown-item">
                    {{ $t('navigation.manage_accounts') }}
                  </a>
                </MenuItem>
                <MenuItem v-if="isNative">
                  <a href="/account" class="dropdown-item">
                    {{ $t('navigation.account') }}
                  </a>
                </MenuItem>
                <MenuItem>
                  <a href="#" @click="logout" class="dropdown-item">
                    {{ $t('navigation.logout') }}
                  </a>
                </MenuItem>
              </MenuItems>
            </transition>
          </Menu>
        </div>
      </nav>
    </header>
    <main class="main-content">
      <NuxtPage />
    </main>
  </div>
</template>

<script>
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';
import LanguageSwitcher from '~/components/LanguageSwitcher.vue';
import axios from 'axios';

export default {
  components: {
    Menu,
    MenuButton,
    MenuItems,
    MenuItem,
    LanguageSwitcher
  },
  data() {
    return {
      isLoggedIn: false,
      isAdmin: false,
      isNative: false
    };
  },
  async mounted() {
    const runtimeConfig = useRuntimeConfig();
    const backendUrl = runtimeConfig.public.BACKEND_URL;

    // 检查登录状态（不强制重定向）
    try {
      const meResponse = await axios.get(`${backendUrl}/me`, {
        withCredentials: true
      });

      this.isLoggedIn = true;
      this.isNative = meResponse.data.identity_provider === 'Origin';
      // Role 是數字: Admin=0, Streamer=1, Editor=2, User=3, Guest=4, Anonymous=5
      this.isAdmin = meResponse.data.role === 0;
    } catch (error) {
      // 未登录，显示登录按钮
      this.isLoggedIn = false;
    }
  },
  methods: {
    async logout() {
      const runtimeConfig = useRuntimeConfig();
      const backendUrl = runtimeConfig.public.BACKEND_URL;

      try {
        // Call backend logout API to clear HTTP-only cookie
        await axios.post(`${backendUrl}/logout`, {}, {
          withCredentials: true
        });
      } catch (error) {
        console.error('Logout error:', error);
      }

      // Redirect to login page regardless of API result
      window.location.href = '/';
    }
  }
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 16px 32px;
  position: sticky;
  top: 0;
  z-index: 100;
}

nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.brand-section:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.logo-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-image {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.brand-title {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0;
  display: inline-block;
}

.brand-title .lite {
  font-weight: 300;
  opacity: 0.9;
}

.right-nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dropdown-button {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown-button:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.dropdown-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
}

.menu-icon {
  display: block;
  line-height: 1;
}

.dropdown-menu {
  position: absolute;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 12px;
  padding: 8px;
  min-width: 220px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.dropdown-item {
  color: #334155;
  padding: 12px 16px;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: block;
  font-weight: 500;
  font-size: 14px;
}

.dropdown-item:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateX(4px);
}

.main-content {
  flex: 1;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .main-header {
    padding: 12px 16px;
  }

  .brand-title {
    font-size: 18px;
  }

  .logo-icon {
    width: 36px;
    height: 36px;
  }

  .logo-image {
    width: 36px;
    height: 36px;
  }

  .dropdown-menu {
    right: 0;
    min-width: 200px;
  }
}

@media (max-width: 480px) {
  .brand-title {
    font-size: 16px;
  }

  .logo-icon {
    width: 32px;
    height: 32px;
  }

  .logo-image {
    width: 32px;
    height: 32px;
  }

  .dropdown-menu {
    min-width: 90vw;
    max-width: 90vw;
  }
}

.btn-nav-login {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s;
}

.btn-nav-login:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}
</style>
