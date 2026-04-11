import { defineConfig, devices } from '@playwright/test';

const TEST_MODE = process.env.TEST_MODE || 'development';

// Allow Node.js fetch() in test workers to trust mkcert self-signed certs
if (TEST_MODE === 'production-https') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: TEST_MODE === 'production-https' ? 'https://localtest.me' : 'http://localhost:3000',
    ignoreHTTPSErrors: TEST_MODE === 'production-https',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'admin-manage-tests',
      testMatch: [
        '**/e2e/admin-navigation.spec.ts',
        '**/e2e/admin-manage-livestream.spec.ts'
      ],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-public',
      testMatch: '**/e2e/public-setup.ts',
      dependencies: ['admin-manage-tests'],
    },
    {
      name: 'public-stream-tests',
      testMatch: [
        '**/e2e/anonymous-public-stream.spec.ts',
        '**/e2e/guest-public-stream.spec.ts',
        '**/e2e/user-public-stream.spec.ts',
        '**/e2e/editor-public-stream.spec.ts',
        '**/e2e/admin-public-stream.spec.ts',
        '**/e2e/stream-chat-permissions.spec.ts'
      ],
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup-public'],
    },
    {
      name: 'setup-member-only',
      testMatch: '**/e2e/member-only-setup.ts',
      dependencies: ['public-stream-tests'],
    },
    {
      name: 'member-only-stream-tests',
      testMatch: [
        '**/e2e/anonymous-member-only-stream.spec.ts',
        '**/e2e/guest-member-only-stream.spec.ts',
        '**/e2e/user-member-only-stream.spec.ts',
        '**/e2e/editor-member-only-stream.spec.ts'
      ],
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup-member-only'],
    },
    {
      name: 'rate-limit-setup',
      testMatch: '**/e2e/rate-limit-setup.ts',
      dependencies: ['setup-public'],
    },
    {
      name: 'rate-limit-tests',
      testMatch: '**/e2e/rate-limit.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['rate-limit-setup'],
    },
    {
      name: 'security-headers-tests',
      testMatch: '**/security/security-headers.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: TEST_MODE === 'production-https' ? 'https://localtest.me' : 'http://localhost:3000',
        ignoreHTTPSErrors: TEST_MODE === 'production-https',
      },
    },
  ],
  webServer: TEST_MODE === 'production-https' ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
