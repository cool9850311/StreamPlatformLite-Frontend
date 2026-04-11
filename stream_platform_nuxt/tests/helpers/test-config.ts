const TEST_MODE = process.env.TEST_MODE || 'development';

export const COOKIE_DOMAIN = TEST_MODE === 'production-https' ? 'localtest.me' : 'localhost';

export const API_BASE = TEST_MODE === 'production-https'
  ? 'https://localtest.me/api'
  : 'http://localhost:8080';

// In HTTPS mode, caddy stack Redis is exposed on 6380 (6379 is the dev stack)
export const REDIS_PORT = TEST_MODE === 'production-https' ? 6380 : 6379;
