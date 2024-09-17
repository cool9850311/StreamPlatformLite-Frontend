<template>
  <div>
    <header class="main-header">
      <nav>
        <ul>
          
        </ul>
        <div class="dropdown">
          <button @click="toggleDropdown" class="dropdown-button">
            <p class="icon">☰</p>
          </button>
          <ul v-if="dropdownVisible" class="dropdown-menu">
            <li><a href="#" @click="logout">Logout</a></li>
          </ul>
        </div>
      </nav>
    </header>
    <NuxtPage />
  </div>
</template>

<script>
export default {
  data() {
    return {
      dropdownVisible: false
    };
  },
  mounted() {
    if (!localStorage.getItem('token')) {
      this.$router.push('/');
    }
  },
  methods: {
    toggleDropdown() {
      this.dropdownVisible = !this.dropdownVisible;
    },
    logout() {
      localStorage.removeItem('token'); // Remove the token from localStorage
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

.dropdown {
  position: relative;
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
  background-color: #333;
  list-style: none;
  padding: 10px;
  margin: 0;
  border: 1px solid #444;
}

.dropdown-menu li {
  margin: 5px 0;
}

.dropdown-menu li a {
  color: white;
  text-decoration: none;
}

.dropdown-menu li a:hover {
  text-decoration: underline;
}
</style>
