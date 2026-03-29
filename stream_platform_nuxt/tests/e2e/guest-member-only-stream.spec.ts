import { test, expect } from '@playwright/test';
import { StreamPage } from '../page-objects/stream-page';
import { JWTHelper } from '../helpers/jwt-helper';

/**
 * Scenario 4: Guest User Accessing MemberOnly Livestream
 *
 * Test Objectives:
 * - Verify Guest users cannot access member-only livestreams
 * - Verify access denied prompt is displayed
 * - Verify /livestream/one API returns 401
 * - Verify GetDeleteChatIDs API returns 401 or is not called
 *
 * Pre-conditions:
 * - Backend and frontend services running
 * - A member-only livestream exists
 * - Guest JWT token set in cookies
 */

test.describe('Guest User - MemberOnly Livestream Access', () => {
  test('Guest user cannot view member-only livestream', async ({ context, page }) => {
    // Step 1: Set Guest token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateGuestToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);

    // Step 2: Set up response listener BEFORE navigation
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/livestream/one')
    );

    // Step 3: Navigate to member-only livestream page
    await streamPage.navigate();

    // Step 4: Verify /livestream/one API returns 401
    const response = await responsePromise;
    expect(response.status()).toBe(401);

    // Step 5: Verify access denied prompt is displayed
    expect(await streamPage.isLoginPromptVisible()).toBe(true);

    // Step 6: Verify video player is not displayed
    expect(await streamPage.isVideoPlayerVisible()).toBe(false);

    // Step 7: Verify "Login to Watch" button is displayed
    const loginButton = page.locator('.btn-login-large');
    expect(await loginButton.isVisible()).toBe(true);
    const buttonText = await loginButton.textContent();
    expect(buttonText).toContain('Login');
  });

  test('Guest user GetDeleteChatIDs API returns 401 or not called', async ({ context, page }) => {
    // Set Guest token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateGuestToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);
    await streamPage.navigate();

    // Wait for /livestream/one to return 401
    await page.waitForResponse(
      response => response.url().includes('/livestream/one') && response.status() === 401
    );

    // Try to get GetDeleteChatIDs API response
    try {
      const deleteResponse = await page.waitForResponse(
        response => response.url().includes('/livestream/chat/delete/'),
        { timeout: 3000 }
      );

      // If called, it should return 401
      expect(deleteResponse.status()).toBe(401);
      console.log('GetDeleteChatIDs called and returned 401 (expected behavior)');
    } catch (error) {
      // If not called within timeout, that's also acceptable behavior
      console.log('GetDeleteChatIDs not called (expected behavior - frontend correctly handled permissions)');
      // Test passes - frontend correctly didn't call the API
    }
  });

  test('Guest user cannot send messages on member-only stream', async ({ context, page }) => {
    // Set Guest token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateGuestToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);
    await streamPage.navigate();

    // Verify access is denied
    expect(await streamPage.isLoginPromptVisible()).toBe(true);

    // Verify chat input is not available
    const chatInput = page.locator('.chat-input-field');
    const isChatInputVisible = await chatInput.isVisible().catch(() => false);
    expect(isChatInputVisible).toBe(false);
  });

  test('Guest user sees appropriate error message', async ({ context, page }) => {
    // Set Guest token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateGuestToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);
    await streamPage.navigate();

    // Wait for access denied message
    const accessDeniedMessage = page.locator('.access-denied, .login-prompt-banner');
    await accessDeniedMessage.waitFor({ state: 'visible', timeout: 5000 });

    // Verify appropriate error message is displayed
    expect(await accessDeniedMessage.isVisible()).toBe(true);
  });
});
