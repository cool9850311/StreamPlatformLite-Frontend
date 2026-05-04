import { test, expect } from '@playwright/test';
import { StreamPage } from '../page-objects/stream-page';
import { JWTHelper } from '../helpers/jwt-helper';
import Redis from 'ioredis';
import { COOKIE_DOMAIN, REDIS_PORT, API_BASE, AUTH_BASE } from '../helpers/test-config';

/**
 * Comprehensive E2E Tests for Rate Limiting
 *
 * Test Objectives:
 * - Verify rate limiting works correctly for all 6 rate-limited endpoints
 * - Verify 429 status codes are returned after exceeding limits
 * - Verify response headers (Retry-After, X-RateLimit-*)
 * - Verify frontend error notifications display correctly
 *
 * Rate Limits (Backend):
 * IP-based:
 *   - Login: 5 requests/min
 *   - OAuth init: 5 requests/min
 *   - Logout: 10 requests/min
 * UserID-based:
 *   - Chat post: 10 requests/min
 *   - Chat delete: 10 requests/min
 *   - Password change: 10 requests/hour
 *
 * Pre-conditions:
 * - Backend running on localhost:8080
 * - Frontend running on localhost:3000
 * - Public livestream exists
 */

// Helper function to clear rate limits
async function clearRateLimits() {
  const redis = new Redis({
    host: 'localhost',
    port: REDIS_PORT,
    db: 0,
  });
  try {
    const keys = await redis.keys('rate_limit:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } finally {
    await redis.quit();
  }
}

test.describe('Rate Limiting - IP-based endpoints', () => {
  // Clear rate limits after each IP-based test to prevent interference
  test.afterEach(async () => {
    await clearRateLimits();
  });
  test('Login returns 429 after 5 requests', async ({ page }) => {
    const loginUrl = `${AUTH_BASE}/origin-account/login`;
    const responses: any[] = [];

    // Navigate to page to establish context
    await page.goto('/native-login');
    await page.waitForLoadState('domcontentloaded');

    // Make 6 login requests quickly via direct API calls
    // Use same username to avoid different error messages
    for (let i = 0; i < 6; i++) {
      const response = await page.evaluate(async (authBase) => {
        const res = await fetch(`${authBase}/origin-account/login`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: 'testuser',
            password: 'wrongpassword',
          }),
        });
        return {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        };
      }, AUTH_BASE);

      responses.push(response);
    }

    // Verify first 5 requests did not hit rate limit (any status except 429)
    for (let i = 0; i < 5; i++) {
      expect(responses[i].status).not.toBe(429);
    }

    // Verify 6th request returns 429
    expect(responses[5].status).toBe(429);

    // Verify Retry-After header exists
    expect(responses[5].headers['retry-after']).toBeDefined();
    const retryAfter = parseInt(responses[5].headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);

    // Verify X-RateLimit headers
    expect(responses[5].headers['x-ratelimit-limit']).toBe('5');
    expect(responses[5].headers['x-ratelimit-remaining']).toBe('0');
    expect(responses[5].headers['x-ratelimit-reset']).toBeDefined();
  });

  test('OAuth init returns 429 after 5 requests', async ({ page }) => {
    const oauthUrl = `${AUTH_BASE}/oauth/discord/init`;
    const responses: any[] = [];

    // Navigate to page to establish context
    await page.goto('/native-login');
    await page.waitForLoadState('domcontentloaded');

    // Make 6 OAuth init requests quickly via direct API calls
    for (let i = 0; i < 6; i++) {
      const response = await page.evaluate(async (authBase) => {
        const res = await fetch(`${authBase}/oauth/discord/init`, {
          method: 'GET',
          credentials: 'include',
          redirect: 'manual', // Don't follow redirects
        });
        return {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        };
      }, AUTH_BASE);

      responses.push(response);
    }

    // Verify first 5 requests did not hit rate limit (any status except 429)
    for (let i = 0; i < 5; i++) {
      expect(responses[i].status).not.toBe(429);
    }

    // Verify 6th request returns 429
    expect(responses[5].status).toBe(429);

    // Verify Retry-After header exists
    expect(responses[5].headers['retry-after']).toBeDefined();

    // Verify X-RateLimit headers
    expect(responses[5].headers['x-ratelimit-limit']).toBe('5');
    expect(responses[5].headers['x-ratelimit-remaining']).toBe('0');
    expect(responses[5].headers['x-ratelimit-reset']).toBeDefined();
  });

  test('Logout returns 429 after 10 requests', async ({ context, page }) => {
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: COOKIE_DOMAIN,
      path: '/',
    }]);

    const logoutUrl = `${AUTH_BASE}/logout`;
    const responses: any[] = [];

    // Navigate to a page where logout is available
    await page.goto('/stream');
    await page.waitForLoadState('domcontentloaded');

    // Make 11 logout requests quickly
    for (let i = 0; i < 11; i++) {
      const responsePromise = page.waitForResponse(
        response => response.url() === logoutUrl,
        { timeout: 5000 }
      );

      // Trigger logout via API call
      const response = await page.evaluate(async (authBase) => {
        const res = await fetch(`${authBase}/logout`, {
          method: 'POST',
          credentials: 'include',
        });
        return {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        };
      }, AUTH_BASE);

      responses.push(response);
      await page.waitForTimeout(100);
    }

    // Verify first 10 requests succeeded (200)
    for (let i = 0; i < 10; i++) {
      expect(responses[i].status).toBe(200);
    }

    // Verify 11th request returns 429
    expect(responses[10].status).toBe(429);

    // Verify Retry-After header exists
    expect(responses[10].headers['retry-after']).toBeDefined();

    // Verify X-RateLimit headers
    expect(responses[10].headers['x-ratelimit-limit']).toBe('10');
    expect(responses[10].headers['x-ratelimit-remaining']).toBe('0');
    expect(responses[10].headers['x-ratelimit-reset']).toBeDefined();
  });
});

test.describe('Rate Limiting - UserID-based endpoints', () => {
  // Clear rate limits after each test to prevent interference
  test.afterEach(async () => {
    await clearRateLimits();
  });

  test('Chat post returns 429 after 10 requests', async ({ browser }) => {
    const jwtHelper = new JWTHelper();

    // Create User context
    const userContext = await browser.newContext();
    await userContext.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: COOKIE_DOMAIN,
      path: '/',
    }]);

    const userPage = await userContext.newPage();
    const streamPage = new StreamPage(userPage);
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    const responses: any[] = [];

    // Send 11 chat messages quickly
    for (let i = 0; i < 11; i++) {
      const responsePromise = userPage.waitForResponse(
        response => response.url().includes('/livestream/chat') && response.request().method() === 'POST',
        { timeout: 5000 }
      );

      const message = `Rate limit test message ${i} ${Date.now()}`;
      await streamPage.sendMessage(message);

      const response = await responsePromise;
      responses.push({
        status: response.status(),
        headers: response.headers(),
      });

      await userPage.waitForTimeout(100);
    }

    // Verify first 10 requests did not hit rate limit (any status except 429)
    for (let i = 0; i < 10; i++) {
      expect(responses[i].status).not.toBe(429);
    }

    // Verify 11th request returns 429
    expect(responses[10].status).toBe(429);

    // Verify Retry-After header exists
    expect(responses[10].headers['retry-after']).toBeDefined();

    // Verify X-RateLimit headers
    expect(responses[10].headers['x-ratelimit-limit']).toBe('10');
    expect(responses[10].headers['x-ratelimit-remaining']).toBe('0');
    expect(responses[10].headers['x-ratelimit-reset']).toBeDefined();

    // Verify frontend shows error notification
    await userPage.waitForTimeout(500);
    const notification = userPage.locator('.notification.error');
    await expect(notification).toBeVisible({ timeout: 3000 });
    const notificationText = await notification.textContent();
    expect(notificationText).toContain('Please try again later');

    // Clean up
    await userContext.close();
  });

  test('Chat delete returns 429 after 10 requests', async ({ browser }) => {
    const jwtHelper = new JWTHelper();

    // Create Editor context (has delete permissions)
    const editorContext = await browser.newContext();
    await editorContext.addCookies([{
      name: 'token',
      value: jwtHelper.generateEditorToken(),
      domain: COOKIE_DOMAIN,
      path: '/',
    }]);

    const editorPage = await editorContext.newPage();
    const streamPage = new StreamPage(editorPage);
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // Create two User contexts to send messages (avoid chat post rate limit)
    const user1Context = await browser.newContext();
    await user1Context.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken('test-user-1'),
      domain: COOKIE_DOMAIN,
      path: '/',
    }]);

    const user2Context = await browser.newContext();
    await user2Context.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken('test-user-2'),
      domain: COOKIE_DOMAIN,
      path: '/',
    }]);

    const user1Page = await user1Context.newPage();
    const user1StreamPage = new StreamPage(user1Page);
    await user1StreamPage.navigate();
    await user1StreamPage.waitForStreamData();

    const user2Page = await user2Context.newPage();
    const user2StreamPage = new StreamPage(user2Page);
    await user2StreamPage.navigate();
    await user2StreamPage.waitForStreamData();

    // User1 sends 6 messages, User2 sends 5 messages (total 11)
    const messages: string[] = [];
    for (let i = 0; i < 6; i++) {
      const message = `Delete test ${i} ${Date.now()}`;
      messages.push(message);
      await user1StreamPage.sendMessage(message);
      await user1StreamPage.waitForMessage(message);
      await editorPage.waitForTimeout(100);
    }

    for (let i = 6; i < 11; i++) {
      const message = `Delete test ${i} ${Date.now()}`;
      messages.push(message);
      await user2StreamPage.sendMessage(message);
      await user2StreamPage.waitForMessage(message);
      await editorPage.waitForTimeout(100);
    }

    // Editor deletes 11 messages quickly
    const responses: any[] = [];
    for (let i = 0; i < 11; i++) {
      const responsePromise = editorPage.waitForResponse(
        response => response.url().includes('/livestream/chat/') &&
                    response.request().method() === 'DELETE',
        { timeout: 5000 }
      );

      // Wait for message to appear in Editor's view
      await streamPage.waitForMessage(messages[i]);

      // Delete the message
      const messageElement = editorPage.locator(`.message-item:has-text("${messages[i]}")`);
      await messageElement.click();
      await editorPage.waitForTimeout(200);

      const deleteButton = editorPage.locator('.context-menu-item.delete-item');
      await deleteButton.click();

      const response = await responsePromise;
      responses.push({
        status: response.status(),
        headers: response.headers(),
      });

      await editorPage.waitForTimeout(100);
    }

    // Verify first 10 requests succeeded (200)
    for (let i = 0; i < 10; i++) {
      expect(responses[i].status).toBe(200);
    }

    // Verify 11th request returns 429
    expect(responses[10].status).toBe(429);

    // Verify Retry-After header exists
    expect(responses[10].headers['retry-after']).toBeDefined();

    // Verify X-RateLimit headers
    expect(responses[10].headers['x-ratelimit-limit']).toBe('10');
    expect(responses[10].headers['x-ratelimit-remaining']).toBe('0');
    expect(responses[10].headers['x-ratelimit-reset']).toBeDefined();

    // Clean up
    await user1Context.close();
    await user2Context.close();
    await editorContext.close();
  });

  test('Password change returns 429 after 10 requests in 1 hour', async ({ browser }) => {
    // Note: Test runs quickly - just sends 11 requests and checks 11th returns 429
    // Does not need to wait for 1-hour window to reset
    const jwtHelper = new JWTHelper();

    const userContext = await browser.newContext();
    await userContext.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: COOKIE_DOMAIN,
      path: '/',
    }]);

    const userPage = await userContext.newPage();
    await userPage.goto('/settings');
    await userPage.waitForLoadState('domcontentloaded');

    // Get CSRF token from /me before making state-changing requests
    const csrfToken = await userPage.evaluate(async (authBase) => {
      const meRes = await fetch(`${authBase}/me`, { credentials: 'include' });
      const meData = await meRes.json();
      return meData.csrf_token ?? '';
    }, AUTH_BASE);

    const responses: any[] = [];

    // Make 11 password change requests
    for (let i = 0; i < 11; i++) {
      const response = await userPage.evaluate(async ({ authBase, csrfToken }) => {
        const res = await fetch(`${authBase}/origin-account/change-password`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': csrfToken,
          },
          body: JSON.stringify({
            old_password: 'oldpass123',
            new_password: 'newpass456',
          }),
        });
        return {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        };
      }, { authBase: AUTH_BASE, csrfToken });

      responses.push(response);
      await userPage.waitForTimeout(100);
    }

    // Verify first 10 requests did not hit rate limit (any status except 429)
    for (let i = 0; i < 10; i++) {
      expect(responses[i].status).not.toBe(429);
    }

    // Verify 11th request returns 429
    expect(responses[10].status).toBe(429);

    // Verify Retry-After header exists
    expect(responses[10].headers['retry-after']).toBeDefined();

    // Verify X-RateLimit headers
    expect(responses[10].headers['x-ratelimit-limit']).toBe('10');
    expect(responses[10].headers['x-ratelimit-remaining']).toBe('0');
    expect(responses[10].headers['x-ratelimit-reset']).toBeDefined();

    await userContext.close();
  });
});

test.describe('Rate Limiting - Response validation', () => {
  // Clear rate limits after each test to prevent interference
  test.afterEach(async () => {
    await clearRateLimits();
  });

  test('429 response includes Retry-After header', async ({ page }) => {
    const loginUrl = `${AUTH_BASE}/origin-account/login`;

    // Navigate to page to establish context
    await page.goto('/native-login');
    await page.waitForLoadState('domcontentloaded');

    // Make 6 login requests to trigger rate limit
    for (let i = 0; i < 6; i++) {
      const response = await page.evaluate(async ({ index, authBase }) => {
        const res = await fetch(`${authBase}/origin-account/login`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: `testuser${index}`,
            password: 'testpass123',
          }),
        });
        return {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        };
      }, { index: i, authBase: AUTH_BASE });

      if (response.status === 429) {
        // Verify Retry-After header exists and is a valid number
        const retryAfter = response.headers['retry-after'];
        expect(retryAfter).toBeDefined();

        const retryAfterNumber = parseInt(retryAfter);
        expect(retryAfterNumber).toBeGreaterThan(0);
        expect(retryAfterNumber).toBeLessThanOrEqual(3600);
        break;
      }
    }
  });

  test('429 response includes X-RateLimit headers', async ({ page }) => {
    const loginUrl = `${AUTH_BASE}/origin-account/login`;

    // Navigate to page to establish context
    await page.goto('/native-login');
    await page.waitForLoadState('domcontentloaded');

    // Make 6 login requests to trigger rate limit
    for (let i = 0; i < 6; i++) {
      const response = await page.evaluate(async ({ index, authBase }) => {
        const res = await fetch(`${authBase}/origin-account/login`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: `testuser${index}`,
            password: 'testpass123',
          }),
        });
        return {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        };
      }, { index: i, authBase: AUTH_BASE });

      if (response.status === 429) {
        const headers = response.headers;

        // Verify X-RateLimit-Limit header
        expect(headers['x-ratelimit-limit']).toBeDefined();
        const limit = parseInt(headers['x-ratelimit-limit']);
        expect(limit).toBeGreaterThan(0);

        // Verify X-RateLimit-Remaining header (should be 0)
        expect(headers['x-ratelimit-remaining']).toBeDefined();
        expect(headers['x-ratelimit-remaining']).toBe('0');

        // Verify X-RateLimit-Reset header
        expect(headers['x-ratelimit-reset']).toBeDefined();
        const reset = parseInt(headers['x-ratelimit-reset']);
        expect(reset).toBeGreaterThan(Date.now() / 1000);
        break;
      }
    }
  });
});

test.describe('Rate Limiting - Frontend error display', () => {
  // Clear rate limits after each test to prevent interference
  test.afterEach(async () => {
    await clearRateLimits();
  });

  test('Frontend shows error notification on chat 429', async ({ browser }) => {
    const jwtHelper = new JWTHelper();

    // Create User context
    const userContext = await browser.newContext();
    await userContext.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: COOKIE_DOMAIN,
      path: '/',
    }]);

    const userPage = await userContext.newPage();
    const streamPage = new StreamPage(userPage);
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // Send 11 messages to trigger rate limit
    for (let i = 0; i < 11; i++) {
      const message = `Notification test ${i} ${Date.now()}`;
      await streamPage.sendMessage(message);
      await userPage.waitForTimeout(100);
    }

    // Wait for error notification to appear
    const notification = userPage.locator('.notification.error');
    await expect(notification).toBeVisible({ timeout: 3000 });

    // Verify notification type is 'error'
    await expect(notification).toHaveClass(/error/);

    // Verify notification text contains rate limit message
    const notificationText = await notification.textContent();
    expect(notificationText?.toLowerCase()).toMatch(/please try again later|rate limit|too many requests/);

    // Clean up
    await userContext.close();
  });

  test('Frontend shows error notification on login 429', async ({ page }) => {
    // Navigate to login page
    await page.goto('/native-login');
    await page.waitForLoadState('domcontentloaded');

    // Make 5 login requests first to consume the rate limit
    for (let i = 0; i < 5; i++) {
      await page.evaluate(async (authBase) => {
        await fetch(`${authBase}/origin-account/login`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: 'testuser',
            password: 'wrongpassword',
          }),
        });
      }, AUTH_BASE);
    }

    // Now try to login via the actual login form, which should trigger 429 and show notification
    const usernameInput = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');
    const loginButton = page.locator('button:has-text("Login")');

    await usernameInput.fill('testuser');
    await passwordInput.fill('testpass');
    await loginButton.click();

    // Wait for error notification to appear
    const notification = page.locator('.notification.error');
    await expect(notification).toBeVisible({ timeout: 3000 });

    // Verify notification contains rate limit message
    const notificationText = await notification.textContent();
    expect(notificationText?.toLowerCase()).toMatch(/please try again later|rate limit|too many requests/);
  });
});
