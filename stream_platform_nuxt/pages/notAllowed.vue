<template>
  <div class="not-allowed">
    <h1>Access Denied</h1>
    <p>You are not allowed to watch this stream.</p>
  </div>
</template>

<script>
export default {
  name: 'NotAllowed'
}
</script>

<style scoped>
.not-allowed {
  text-align: center;
  margin-top: 50px;
}

.not-allowed h1 {
  color: red;
}

.not-allowed p {
  font-size: 18px;
}
</style>
