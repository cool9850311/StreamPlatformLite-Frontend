<template>
  <div>
    <header class="main-header">
      <nav>
        <ul>
          <!-- Other navigation items -->
        </ul>
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
                <a href="/stream" class="dropdown-item">Stream</a>
              </MenuItem>
  
              <MenuItem v-if="isAdmin">
                <a href="/system-settings" class="dropdown-item">System Settings</a>
              </MenuItem>
              <MenuItem v-if="isAdmin">
                <a href="/manage-livestream" class="dropdown-item">Manage Livestreams</a>
              </MenuItem>
              <MenuItem>
                <a href="#" @click="logout" class="dropdown-item">Logout</a>
              </MenuItem>
            </MenuItems>
          </transition>
        </Menu>
      </nav>
    </header>
    <NuxtPage />
  </div>
</template>

<script>
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';

export default {
  components: {
    Menu,
    MenuButton,
    MenuItems,
    MenuItem
  },
  data() {
    return {
      isAdmin: false
    };
  },
  mounted() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.$router.push('/');
      return;
    }
    const decodedToken = this.decodeJWT(token);
    this.isAdmin = decodedToken.Role === 0;
  },
  methods: {
    logout() {
      localStorage.removeItem('token');
      window.location.href = '/';
    },
    decodeJWT(token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
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
</style>
