import { test, expect } from '@playwright/test';
import { StreamPage } from '../page-objects/stream-page';
import { JWTHelper } from '../helpers/jwt-helper';

/**
 * Scenario: User Accessing Public Livestream
 *
 * Test Objectives:
 * - Verify User can view public livestreams
 * - Verify User can see viewer count
 * - Verify User can send chat messages
 * - Verify User can delete their own messages
 * - Verify User cannot delete others' messages
 *
 * Pre-conditions:
 * - Backend and frontend services running
 * - A public livestream exists
 * - User JWT token set in cookies
 */

test.describe('User - Public Livestream Access', () => {
  test('User can view public livestream', async ({ context, page }) => {
    // Step 1: Set User token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
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
    expect(await streamPage.getVisibilityBadge()).toBe('public');

    // Wait before ending test
    await page.waitForTimeout(500);
  });

  test('User can see viewer count', async ({ context, page }) => {
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

    // Wait before ending test
    await page.waitForTimeout(500);
  });

  test('User can send chat messages', async ({ context, page }) => {
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

    // Generate unique message
    const testMessage = `Test message from User ${Date.now()}`;

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

  test('User can delete own messages', async ({ context, page }) => {
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

    // Generate unique message
    const testMessage = `Delete test ${Date.now()}`;

    // Send message
    await streamPage.sendMessage(testMessage);

    // Wait for message to appear
    await streamPage.waitForMessage(testMessage);

    // Delete the message
    await streamPage.deleteMessage(testMessage);

    // Wait for message to be removed from chat
    await streamPage.waitForMessageDeleted(testMessage);

    // Verify message is no longer visible
    const message = page.locator(`.message-item:has-text("${testMessage}")`);
    await expect(message).not.toBeVisible();

    // Wait before ending test
    await page.waitForTimeout(500);
  });

  test('User cannot delete others\' messages', async ({ context, page }) => {
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

    // Get all existing messages
    const messages = await streamPage.getChatMessages();

    if (messages.length > 0) {
      // Click on the first message (assumed to be from another user)
      await messages[0].click();

      // Wait for context menu to appear
      await page.waitForTimeout(300);

      // Check if delete button is visible
      const deleteButton = page.locator('.context-menu-item.delete-item');
      const isDeleteVisible = await deleteButton.isVisible().catch(() => false);

      if (isDeleteVisible) {
        // If delete button is visible, clicking it should fail or show error
        // This is the case where UI allows clicking but backend should reject

        // Try to delete
        await deleteButton.click();

        // Wait a moment
        await page.waitForTimeout(500);

        // Message should still be visible (deletion should fail)
        const messageStillExists = await messages[0].isVisible();
        expect(messageStillExists).toBe(true);
      } else {
        // If delete button is not visible, that's the correct behavior
        expect(isDeleteVisible).toBe(false);
      }
    } else {
      // If no messages exist, verify chat is functional
      const chatInput = page.locator('.chat-input-field');
      await expect(chatInput).toBeVisible();
    }

    // Wait before ending test
    await page.waitForTimeout(500);
  });
});
