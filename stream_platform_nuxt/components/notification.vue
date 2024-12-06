<template>
    <div v-if="visible" :class="['notification', type]">
      {{ message }}
      <button @click="closeNotification" class="close-btn">&times;</button>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        message: '',
        type: '',
        visible: false
      };
    },
    methods: {
      showNotification(message, type) {
        this.message = message;
        this.type = type;
        this.visible = true;
        setTimeout(() => {
          this.visible = false;
        }, 3000); // Hide notification after 3 seconds
      },
      closeNotification() {
        this.visible = false;
      }
    }
  };
  </script>
  
  <style scoped>
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    border-radius: 4px;
    color: white;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .notification.error {
    background-color: #dc3545;
  }
  
  .notification.success {
    background-color: #28a745;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    margin-left: 10px;
  }
  </style>