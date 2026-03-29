import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'admin-manage-tests',
      testMatch: [
        '**/admin-navigation.spec.ts',
        '**/admin-manage-livestream.spec.ts'
      ],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-public',
      testMatch: '**/public-setup.ts',
      dependencies: ['admin-manage-tests'],
    },
    {
      name: 'public-stream-tests',
      testMatch: [
        '**/anonymous-public-stream.spec.ts',
        '**/guest-public-stream.spec.ts',
        '**/user-public-stream.spec.ts',
        '**/editor-public-stream.spec.ts',
        '**/admin-public-stream.spec.ts',
        '**/stream-chat-permissions.spec.ts'
      ],
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup-public'],
    },
    {
      name: 'setup-member-only',
      testMatch: '**/member-only-setup.ts',
      dependencies: ['public-stream-tests'],
    },
    {
      name: 'member-only-stream-tests',
      testMatch: [
        '**/anonymous-member-only-stream.spec.ts',
        '**/guest-member-only-stream.spec.ts',
        '**/user-member-only-stream.spec.ts',
        '**/editor-member-only-stream.spec.ts'
      ],
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup-member-only'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
