<template>
  <div class="not-allowed-page">
    <div class="content-card">
      <div class="error-icon">🚫</div>
      <h1 class="error-title">{{ $t('not_allowed.title') }}</h1>
      <p class="error-message">{{ $t('not_allowed.message') }}</p>
      <a href="/stream" class="back-button">
        <span class="btn-icon">←</span>
        {{ $t('navigation.stream') }}
      </a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotAllowed'
}
</script>

<style scoped>
.not-allowed-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 20px;
}

.content-card {
  background: white;
  border-radius: 24px;
  padding: 48px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 480px;
  width: 100%;
  text-align: center;
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

.error-icon {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-radius: 20px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
}

.error-title {
  font-size: 32px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 16px 0;
}

.error-message {
  font-size: 16px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 32px 0;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.back-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.btn-icon {
  font-size: 20px;
  display: inline-block;
  transition: transform 0.3s ease;
}

.back-button:hover .btn-icon {
  transform: translateX(-4px);
}

@media (max-width: 480px) {
  .content-card {
    padding: 32px 24px;
  }

  .error-icon {
    width: 80px;
    height: 80px;
    font-size: 40px;
  }

  .error-title {
    font-size: 24px;
  }

  .error-message {
    font-size: 14px;
  }

  .back-button {
    padding: 14px 20px;
    font-size: 15px;
  }
}
</style>
