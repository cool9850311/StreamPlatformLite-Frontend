<template>
  <div class="not-allowed">
    <h1>{{ $t('not_allowed.title') }}</h1>
    <p>{{ $t('not_allowed.message') }}</p>
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
