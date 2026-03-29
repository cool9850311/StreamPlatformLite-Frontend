import { test, expect } from '@playwright/test';
import { StreamPage } from '../page-objects/stream-page';
import { JWTHelper } from '../helpers/jwt-helper';

/**
 * Scenario: Admin User Accessing Public Livestream
 *
 * Test Objectives:
 * - Verify Admin can access both public and member-only livestreams
 * - Verify Admin can delete any messages (including other Admins' messages)
 * - Verify Admin can see viewer count
 *
 * Pre-conditions:
 * - Backend and frontend services running
 * - A public livestream exists
 * - Admin JWT token set in cookies
 */

test.describe('Admin User - Public Livestream Access', () => {
  test('Admin can access all livestreams', async ({ context, page }) => {
    // Step 1: Set Admin token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);

    // Step 2: Navigate to livestream page
    await streamPage.navigate();

    // Step 3: Wait for stream data to load
    await streamPage.waitForStreamData();

    // Step 4: Verify video player element exists
    expect(await streamPage.isVideoPlayerVisible()).toBe(true);

    // Step 5: Verify visibility badge shows "Public"
    const visibilityBadge = await streamPage.getVisibilityBadge();
    expect(visibilityBadge).toBe('public');

    // Step 6: Verify no login prompt is shown (Admin has full access)
    expect(await streamPage.isLoginPromptVisible()).toBe(false);

    await page.waitForTimeout(500);
  });

  test('Admin can delete any messages', async ({ context, page }) => {
    // Step 1: Set Admin token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);

    // Step 2: Navigate to livestream page
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // Step 3: Send a test message as Admin
    const testMessage = `Admin test message ${Date.now()}`;
    await streamPage.sendMessage(testMessage);

    // Step 4: Wait for message to appear
    await streamPage.waitForMessage(testMessage);

    // Step 5: Verify message can be deleted
    await streamPage.deleteMessage(testMessage);

    // Step 6: Wait for message to be removed from chat
    await streamPage.waitForMessageDeleted(testMessage);

    // Step 7: Verify the message is no longer in the chat
    const messages = await streamPage.getChatMessages();
    const messageTexts = await Promise.all(
      messages.map(msg => msg.textContent())
    );
    expect(messageTexts.some(text => text?.includes(testMessage))).toBe(false);

    await page.waitForTimeout(500);
  });

  test('Admin can see viewer count', async ({ context, page }) => {
    // Step 1: Set Admin token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);

    // Step 2: Navigate to livestream page
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // Step 3: Verify viewer count badge is visible
    const viewerCountBadge = page.locator('.view-count-badge');
    await expect(viewerCountBadge).toBeVisible();

    // Step 4: Verify viewer count badge contains a number
    const viewerCountText = await viewerCountBadge.textContent();
    expect(viewerCountText).toMatch(/\d+/);

    // Step 5: Verify ping-viewer-count API is called periodically
    const pingPromise = page.waitForResponse(
      response => response.url().includes('/livestream/ping-viewer-count/') && response.status() === 200,
      { timeout: 10000 }
    );

    const pingResponse = await pingPromise;
    expect(pingResponse.status()).toBe(200);

    await page.waitForTimeout(500);
  });
});
