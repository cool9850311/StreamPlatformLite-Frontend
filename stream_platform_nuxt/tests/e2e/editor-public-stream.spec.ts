import { test, expect } from '@playwright/test';
import { StreamPage } from '../page-objects/stream-page';
import { JWTHelper } from '../helpers/jwt-helper';

/**
 * Scenario: Editor User Accessing Public Livestream
 *
 * Test Objectives:
 * - Verify Editor users can view public livestreams
 * - Verify Editor users can see viewer count
 * - Verify Editor users can send chat messages
 * - Verify Editor users can delete their own messages
 * - Verify Editor users can delete User messages
 * - Verify Editor users can delete Guest messages
 * - Verify Editor users cannot delete Admin messages
 *
 * Pre-conditions:
 * - Backend and frontend services running
 * - A public livestream exists
 * - Editor JWT token set in cookies
 */

test.describe('Editor User - Public Livestream Access', () => {
  test('Editor can view public livestream', async ({ context, page }) => {
    // Step 1: Set Editor token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateEditorToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);

    // Step 2: Navigate to livestream page
    await streamPage.navigate();

    // Step 3: Verify video player element exists
    await streamPage.waitForStreamData();
    expect(await streamPage.isVideoPlayerVisible()).toBe(true);

    // Step 4: Verify visibility badge shows "Public"
    expect(await streamPage.getVisibilityBadge()).toBe('public');

    await page.waitForTimeout(500);
  });

  test('Editor can see viewer count', async ({ context, page }) => {
    // Set Editor token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateEditorToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);
    await streamPage.navigate();

    // Wait for stream data to load
    await streamPage.waitForStreamData();

    // Verify viewer count is visible and is a number
    const viewerCount = page.locator('.viewer-count');
    await viewerCount.waitFor({ state: 'visible', timeout: 5000 });
    const viewerCountText = await viewerCount.textContent();
    expect(viewerCountText).toMatch(/\d+/); // Should contain at least one digit

    await page.waitForTimeout(500);
  });

  test('Editor can send chat messages', async ({ context, page }) => {
    // Set Editor token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateEditorToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);
    await streamPage.navigate();

    // Wait for stream data
    await streamPage.waitForStreamData();

    // Send a message
    const testMessage = `Editor test message ${Date.now()}`;
    await streamPage.sendMessage(testMessage);

    // Verify message appears in chat
    await streamPage.waitForMessage(testMessage);
    const messages = await streamPage.getChatMessages();
    const messageTexts = await Promise.all(messages.map(m => m.textContent()));
    expect(messageTexts.some(text => text?.includes(testMessage))).toBe(true);

    await page.waitForTimeout(500);
  });

  test('Editor can delete own messages', async ({ context, page }) => {
    // Set Editor token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateEditorToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // Send a message
    const testMessage = `Editor delete own ${Date.now()}`;
    await streamPage.sendMessage(testMessage);
    await streamPage.waitForMessage(testMessage);

    // Delete the message
    await streamPage.deleteMessage(testMessage);

    // Verify message is deleted
    await streamPage.waitForMessageDeleted(testMessage);

    await page.waitForTimeout(500);
  });

  test('Editor can delete User messages', async ({ browser }) => {
    const jwtHelper = new JWTHelper();

    // Create User context and send a message
    const userContext = await browser.newContext();
    await userContext.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const userPage = await userContext.newPage();
    const userStreamPage = new StreamPage(userPage);
    await userStreamPage.navigate();
    await userStreamPage.waitForStreamData();

    // User sends a message
    const userMessage = `User message ${Date.now()}`;
    await userStreamPage.sendMessage(userMessage);
    await userStreamPage.waitForMessage(userMessage);

    // Create Editor context
    const editorContext = await browser.newContext();
    await editorContext.addCookies([{
      name: 'token',
      value: jwtHelper.generateEditorToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const editorPage = await editorContext.newPage();
    const editorStreamPage = new StreamPage(editorPage);
    await editorStreamPage.navigate();
    await editorStreamPage.waitForStreamData();

    // Wait for User message to appear in Editor's view
    await editorStreamPage.waitForMessage(userMessage);

    // Editor deletes User's message
    await editorStreamPage.deleteMessage(userMessage);

    // Verify message is deleted
    await editorStreamPage.waitForMessageDeleted(userMessage);

    // Wait before cleanup
    await editorPage.waitForTimeout(500);

    // Clean up
    await userContext.close();
    await editorContext.close();
  });

  test('Editor can delete Guest messages', async ({ browser }) => {
    const jwtHelper = new JWTHelper();

    // Create Guest context and send a message
    const guestContext = await browser.newContext();
    await guestContext.addCookies([{
      name: 'token',
      value: jwtHelper.generateGuestToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const guestPage = await guestContext.newPage();
    const guestStreamPage = new StreamPage(guestPage);
    await guestStreamPage.navigate();
    await guestStreamPage.waitForStreamData();

    // Guest sends a message
    const guestMessage = `Guest message ${Date.now()}`;
    await guestStreamPage.sendMessage(guestMessage);
    await guestStreamPage.waitForMessage(guestMessage);

    // Create Editor context
    const editorContext = await browser.newContext();
    await editorContext.addCookies([{
      name: 'token',
      value: jwtHelper.generateEditorToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const editorPage = await editorContext.newPage();
    const editorStreamPage = new StreamPage(editorPage);
    await editorStreamPage.navigate();
    await editorStreamPage.waitForStreamData();

    // Wait for Guest message to appear in Editor's view
    await editorStreamPage.waitForMessage(guestMessage);

    // Editor deletes Guest's message
    await editorStreamPage.deleteMessage(guestMessage);

    // Verify message is deleted
    await editorStreamPage.waitForMessageDeleted(guestMessage);

    // Wait before cleanup
    await editorPage.waitForTimeout(500);

    // Clean up
    await guestContext.close();
    await editorContext.close();
  });

  test('Editor cannot delete Admin messages', async ({ browser }) => {
    const jwtHelper = new JWTHelper();

    // Create Admin context and send a message
    const adminContext = await browser.newContext();
    await adminContext.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const adminPage = await adminContext.newPage();
    const adminStreamPage = new StreamPage(adminPage);
    await adminStreamPage.navigate();
    await adminStreamPage.waitForStreamData();

    // Admin sends a message
    const adminMessage = `Admin message ${Date.now()}`;
    await adminStreamPage.sendMessage(adminMessage);
    await adminStreamPage.waitForMessage(adminMessage);

    // Create Editor context
    const editorContext = await browser.newContext();
    await editorContext.addCookies([{
      name: 'token',
      value: jwtHelper.generateEditorToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const editorPage = await editorContext.newPage();
    const editorStreamPage = new StreamPage(editorPage);
    await editorStreamPage.navigate();
    await editorStreamPage.waitForStreamData();

    // Wait for Admin message to appear in Editor's view
    await editorStreamPage.waitForMessage(adminMessage);

    // Try to delete Admin's message - should either fail or delete button should not be available
    try {
      const messageElement = editorPage.locator(`.message-item:has-text("${adminMessage}")`);
      await messageElement.click();

      // Check if delete option is available
      const deleteButton = editorPage.locator('.context-menu-item.delete-item');
      const isDeleteButtonVisible = await deleteButton.isVisible().catch(() => false);

      if (isDeleteButtonVisible) {
        // If delete button is visible, click it and expect the message to still exist
        await deleteButton.click();

        // Wait a moment for potential deletion
        await editorPage.waitForTimeout(1000);

        // Verify message still exists (deletion should have failed)
        const messageStillExists = await messageElement.count();
        expect(messageStillExists).toBeGreaterThan(0);
      } else {
        // If delete button is not visible, this is the expected behavior
        expect(isDeleteButtonVisible).toBe(false);
      }
    } catch (error) {
      // Any error is acceptable - the important thing is that the message is not deleted
      console.log('Editor correctly prevented from deleting Admin message');
    }

    // Verify Admin message still exists
    const messages = await editorStreamPage.getChatMessages();
    const messageTexts = await Promise.all(messages.map(m => m.textContent()));
    expect(messageTexts.some(text => text?.includes(adminMessage))).toBe(true);

    // Wait before cleanup
    await editorPage.waitForTimeout(500);

    // Clean up
    await adminContext.close();
    await editorContext.close();
  });

  test('Editor cannot delete other Editor messages', async ({ browser }) => {
    const jwtHelper = new JWTHelper();

    // Create first Editor context and send a message
    const editor1Context = await browser.newContext();
    await editor1Context.addCookies([{
      name: 'token',
      value: jwtHelper.generateEditorToken('editor-001'),
      domain: 'localhost',
      path: '/',
    }]);

    const editor1Page = await editor1Context.newPage();
    const editor1StreamPage = new StreamPage(editor1Page);
    await editor1StreamPage.navigate();
    await editor1StreamPage.waitForStreamData();

    // First Editor sends a message
    const editor1Message = `Editor 1 message ${Date.now()}`;
    await editor1StreamPage.sendMessage(editor1Message);
    await editor1StreamPage.waitForMessage(editor1Message);

    // Create second Editor context
    const editor2Context = await browser.newContext();
    await editor2Context.addCookies([{
      name: 'token',
      value: jwtHelper.generateEditorToken('editor-002'),
      domain: 'localhost',
      path: '/',
    }]);

    const editor2Page = await editor2Context.newPage();
    const editor2StreamPage = new StreamPage(editor2Page);
    await editor2StreamPage.navigate();
    await editor2StreamPage.waitForStreamData();

    // Wait for first Editor's message to appear
    await editor2StreamPage.waitForMessage(editor1Message);

    // Try to delete first Editor's message - delete button should not be available
    const messageElement = editor2Page.locator(`.message-item:has-text("${editor1Message}")`);
    await messageElement.click();

    // Check if delete option is available
    const deleteButton = editor2Page.locator('.context-menu-item.delete-item');
    const isDeleteButtonVisible = await deleteButton.isVisible().catch(() => false);

    // Delete button should NOT be visible for other Editor's messages
    expect(isDeleteButtonVisible).toBe(false);

    // Verify Editor message still exists
    const messages = await editor2StreamPage.getChatMessages();
    const messageTexts = await Promise.all(messages.map(m => m.textContent()));
    expect(messageTexts.some(text => text?.includes(editor1Message))).toBe(true);

    // Wait before cleanup
    await editor2Page.waitForTimeout(500);

    // Clean up
    await editor1Context.close();
    await editor2Context.close();
  });
});
