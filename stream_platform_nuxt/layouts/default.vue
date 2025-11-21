<template>
  <div>
    <header class="main-header">
      <nav>
        <ul>
          <!-- Other navigation items -->
        </ul>
        <div class="right-nav">
          <LanguageSwitcher />
          <Menu as="div" class="relative">
            <MenuButton class="dropdown-button">
              <p class="icon">☰</p>
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
                  <a href="/stream" class="dropdown-item">{{ $t('navigation.stream') }}</a>
                </MenuItem>
    
                <MenuItem v-if="isAdmin">
                  <a href="/system-settings" class="dropdown-item">{{ $t('navigation.system_settings') }}</a>
                </MenuItem>
                <MenuItem v-if="isAdmin">
                  <a href="/manage-livestream" class="dropdown-item">{{ $t('navigation.manage_livestreams') }}</a>
                </MenuItem>
                <MenuItem v-if="isAdmin">
                  <a href="/manage-accounts" class="dropdown-item">{{ $t('navigation.manage_accounts') }}</a>
                </MenuItem>
                <MenuItem v-if="isNative">
                  <a href="/account" class="dropdown-item">{{ $t('navigation.account') }}</a>
                </MenuItem>
                <MenuItem>
                  <a href="#" @click="logout" class="dropdown-item">{{ $t('navigation.logout') }}</a>
                </MenuItem>
              </MenuItems>
            </transition>
          </Menu>
        </div>
      </nav>
    </header>
    <NuxtPage />
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
      isAdmin: false,
      isNative: false
    };
  },
  async mounted() {
    // Check auth by trying to access a protected endpoint
    const runtimeConfig = useRuntimeConfig();
    const backendUrl = runtimeConfig.public.BACKEND_URL;

    try {
      await axios.get(`${backendUrl}/livestream/one`, {
        withCredentials: true
      });
    } catch (error) {
      // Only redirect to login if unauthorized (401)
      // 404 means user is logged in but no livestream exists
      if (error.response && error.response.status === 401) {
        this.$router.push('/');
        return; // Don't continue if redirecting
      }
    }

    // Check admin status (should work regardless of livestream existence)
    try {
      await axios.get(`${backendUrl}/system-settings`, {
        withCredentials: true
      });
      this.isAdmin = true;
    } catch {
      this.isAdmin = false;
    }

    // Check if native by checking identity provider
    try {
      const meResponse = await axios.get(`${backendUrl}/me`, {
        withCredentials: true
      });
      this.isNative = meResponse.data.identity_provider === 'Origin';
    } catch {
      this.isNative = false;
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
.main-header {
  background-color: #333;
  color: white;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

nav {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

nav ul {
  list-style: none;
  display: flex;
  gap: 10px;
}

nav ul li {
  display: inline;
}

nav ul li a {
  color: white;
  text-decoration: none;
}

nav ul li a:hover {
  text-decoration: underline;
}

.dropdown-button {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.dropdown-menu {
  position: absolute;
  right: 0;
  background-color: #444;
  list-style: none;
  padding: 10px;
  margin: 0;
  border: 1px solid #555;
  border-radius: 5px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 1000; /* Ensure the dropdown is above other elements */
}

.dropdown-item {
  color: white;
  padding: 8px 12px;
  text-decoration: none;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: #555;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .dropdown-menu {
    right: 10px; /* Adjust position for smaller screens */
    width: 90vw; /* Make the dropdown wider on small screens */
  }
}

.right-nav {
  display: flex;
  align-items: center;
  gap: 20px;
}
</style>
