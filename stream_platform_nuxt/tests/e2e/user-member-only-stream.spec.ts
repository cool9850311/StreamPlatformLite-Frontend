import { test, expect } from '@playwright/test';
import { StreamPage } from '../page-objects/stream-page';
import { JWTHelper } from '../helpers/jwt-helper';

/**
 * Scenario: User Accessing MemberOnly Livestream
 *
 * Test Objectives:
 * - Verify User can access member-only livestreams
 * - Verify User can chat in member-only stream
 * - Verify User can see viewer count in member-only stream
 *
 * Pre-conditions:
 * - Backend and frontend services running
 * - A member-only livestream exists
 * - User JWT token set in cookies
 */

test.describe('User - MemberOnly Livestream Access', () => {
  test('User can access member-only livestream', async ({ context, page }) => {
    // Step 1: Set User token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);

    // Step 2: Navigate to member-only livestream page
    await streamPage.navigate();

    // Step 3: Wait for stream data to load
    const response = await streamPage.waitForStreamData();

    // Step 4: Verify API returns 200 (access granted)
    expect(response.status()).toBe(200);

    // Step 5: Verify video player is visible
    expect(await streamPage.isVideoPlayerVisible()).toBe(true);

    // Step 6: Verify visibility badge shows "member_only"
    expect(await streamPage.getVisibilityBadge()).toBe('member_only');

    // Step 7: Verify no access denied message is shown
    expect(await streamPage.isLoginPromptVisible()).toBe(false);

    // Wait before ending test
    await page.waitForTimeout(500);
  });

  test('User can chat in member-only stream', async ({ context, page }) => {
    // Set User token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);
    await streamPage.navigate();

    // Wait for stream data to load
    await streamPage.waitForStreamData();

    // Verify chat input is available
    const chatInput = page.locator('.chat-input-field');
    await expect(chatInput).toBeVisible();

    // Generate unique message
    const testMessage = `User member-only test ${Date.now()}`;

    // Send message
    await streamPage.sendMessage(testMessage);

    // Wait for message to appear in chat
    await streamPage.waitForMessage(testMessage);

    // Verify message is displayed
    const message = page.locator(`.message-item:has-text("${testMessage}")`);
    await expect(message).toBeVisible();

    // Wait before ending test
    await page.waitForTimeout(500);
  });

  test('User can see viewer count in member-only', async ({ context, page }) => {
    // Set User token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);
    await streamPage.navigate();

    // Wait for stream data to load
    await streamPage.waitForStreamData();

    // Verify viewer count badge is visible
    const viewerCountBadge = page.locator('.view-count-badge');
    await expect(viewerCountBadge).toBeVisible();

    // Verify viewer count number is displayed
    const viewerCount = page.locator('.viewer-count');
    await expect(viewerCount).toBeVisible();

    // Verify ping-viewer-count API is called
    const pingResponse = page.waitForResponse(
      response => response.url().includes('/livestream/ping-viewer-count/') && response.status() === 200,
      { timeout: 10000 }
    );

    // Wait for ping response
    const response = await pingResponse;
    expect(response.status()).toBe(200);

    // Wait before ending test
    await page.waitForTimeout(500);
  });
});
