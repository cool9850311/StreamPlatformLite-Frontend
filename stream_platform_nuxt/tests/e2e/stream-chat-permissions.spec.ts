import { test, expect } from '@playwright/test';
import { StreamPage } from '../page-objects/stream-page';
import { JWTHelper } from '../helpers/jwt-helper';

/**
 * Comprehensive E2E Tests for Chat Permissions
 *
 * Test Objectives:
 * - Verify Editor delete message permissions (can delete User/Guest, cannot delete Admin)
 * - Verify Editor mute permissions (can mute User/Guest, cannot mute Admin/Editor)
 * - Verify Admin permissions (can delete/mute anyone)
 * - Verify User/Guest context menu logic (only see menu on own messages)
 * - Verify API-level permission enforcement
 *
 * Role hierarchy:
 * - Admin (0): Full permissions
 * - Streamer (1): Full permissions
 * - Editor (2): Limited permissions (cannot delete Admin, cannot mute Admin/Editor)
 * - User (3): Can only delete own messages
 * - Guest (4): Can only delete own messages
 *
 * Pre-conditions:
 * - Backend running on localhost:8080
 * - Frontend running
 * - Public livestream exists
 */

test.describe('Chat Permissions - Editor Delete Message Permissions', () => {
  test('Editor can see and delete User messages', async ({ browser }) => {
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
    const userMessage = `User message for Editor delete ${Date.now()}`;
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

    // Click on the message to open context menu
    const messageElement = editorPage.locator(`.message-item:has-text("${userMessage}")`);
    await messageElement.click();

    // Verify delete button is visible
    const deleteButton = editorPage.locator('.context-menu-item.delete-item');
    await expect(deleteButton).toBeVisible({ timeout: 2000 });

    // Editor deletes User's message
    await deleteButton.click();

    // Verify message is deleted
    await editorStreamPage.waitForMessageDeleted(userMessage);

    // Clean up
    await editorPage.waitForTimeout(500);
    await userContext.close();
    await editorContext.close();
  });

  test('Editor cannot see delete button for Admin messages', async ({ browser }) => {
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
    const adminMessage = `Admin message protected ${Date.now()}`;
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

    // Click on the message
    const messageElement = editorPage.locator(`.message-item:has-text("${adminMessage}")`);
    await messageElement.click();

    // Wait for potential context menu
    await editorPage.waitForTimeout(500);

    // Verify delete button is NOT visible OR context menu is not shown
    const deleteButton = editorPage.locator('.context-menu-item.delete-item');
    const isDeleteVisible = await deleteButton.isVisible().catch(() => false);

    // Delete button should not be visible for Admin messages
    expect(isDeleteVisible).toBe(false);

    // Verify Admin message still exists
    const messages = await editorStreamPage.getChatMessages();
    const messageTexts = await Promise.all(messages.map(m => m.textContent()));
    expect(messageTexts.some(text => text?.includes(adminMessage))).toBe(true);

    // Clean up
    await editorPage.waitForTimeout(500);
    await adminContext.close();
    await editorContext.close();
  });

  test('Editor can delete own messages', async ({ context, page }) => {
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

    // Editor sends a message
    const editorMessage = `Editor own message ${Date.now()}`;
    await streamPage.sendMessage(editorMessage);
    await streamPage.waitForMessage(editorMessage);

    // Delete own message
    await streamPage.deleteMessage(editorMessage);

    // Verify message is deleted
    await streamPage.waitForMessageDeleted(editorMessage);

    await page.waitForTimeout(500);
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
    const guestMessage = `Guest message for Editor ${Date.now()}`;
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

    // Wait for Guest message to appear
    await editorStreamPage.waitForMessage(guestMessage);

    // Editor deletes Guest's message
    await editorStreamPage.deleteMessage(guestMessage);

    // Verify message is deleted
    await editorStreamPage.waitForMessageDeleted(guestMessage);

    // Clean up
    await editorPage.waitForTimeout(500);
    await guestContext.close();
    await editorContext.close();
  });

  test('Editor cannot see delete button for other Editor messages', async ({ browser }) => {
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

    // Click on the message
    const messageElement = editor2Page.locator(`.message-item:has-text("${editor1Message}")`);
    await messageElement.click();

    // Verify delete button is NOT visible
    const deleteButton = editor2Page.locator('.context-menu-item.delete-item');
    const isDeleteButtonVisible = await deleteButton.isVisible().catch(() => false);
    expect(isDeleteButtonVisible).toBe(false);

    // Clean up
    await editor2Page.waitForTimeout(500);
    await editor1Context.close();
    await editor2Context.close();
  });
});

test.describe('Chat Permissions - Editor Mute Permissions', () => {
  test('Editor can see and mute User', async ({ browser }) => {
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
    const userMessage = `User message for mute test ${Date.now()}`;
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

    // Wait for User message to appear
    await editorStreamPage.waitForMessage(userMessage);

    // Click on the message to open context menu
    const messageElement = editorPage.locator(`.message-item:has-text("${userMessage}")`);
    await messageElement.click();

    // Wait for context menu to appear
    await editorPage.waitForTimeout(500);

    // Verify mute button is visible
    const muteButton = editorPage.locator('.context-menu-item.mute-item');
    await expect(muteButton).toBeVisible({ timeout: 2000 });

    // Clean up
    await editorPage.waitForTimeout(500);
    await userContext.close();
    await editorContext.close();
  });

  test('Editor cannot see mute button for Admin messages', async ({ browser }) => {
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
    const adminMessage = `Admin message no mute ${Date.now()}`;
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

    // Wait for Admin message to appear
    await editorStreamPage.waitForMessage(adminMessage);

    // Click on the message
    const messageElement = editorPage.locator(`.message-item:has-text("${adminMessage}")`);
    await messageElement.click();

    // Wait for potential context menu
    await editorPage.waitForTimeout(500);

    // Verify mute button is NOT visible
    const muteButton = editorPage.locator('.context-menu-item.mute-item');
    const isMuteVisible = await muteButton.isVisible().catch(() => false);

    expect(isMuteVisible).toBe(false);

    // Clean up
    await editorPage.waitForTimeout(500);
    await adminContext.close();
    await editorContext.close();
  });

  test('Editor cannot see mute button for other Editor messages', async ({ browser }) => {
    const jwtHelper = new JWTHelper();

    // Create first Editor context and send a message
    const editor1Context = await browser.newContext();
    await editor1Context.addCookies([{
      name: 'token',
      value: jwtHelper.generateToken(2, 'editor-1', 'Editor One'),
      domain: 'localhost',
      path: '/',
    }]);

    const editor1Page = await editor1Context.newPage();
    const editor1StreamPage = new StreamPage(editor1Page);
    await editor1StreamPage.navigate();
    await editor1StreamPage.waitForStreamData();

    // First Editor sends a message
    const editor1Message = `Editor One message ${Date.now()}`;
    await editor1StreamPage.sendMessage(editor1Message);
    await editor1StreamPage.waitForMessage(editor1Message);

    // Create second Editor context
    const editor2Context = await browser.newContext();
    await editor2Context.addCookies([{
      name: 'token',
      value: jwtHelper.generateToken(2, 'editor-2', 'Editor Two'),
      domain: 'localhost',
      path: '/',
    }]);

    const editor2Page = await editor2Context.newPage();
    const editor2StreamPage = new StreamPage(editor2Page);
    await editor2StreamPage.navigate();
    await editor2StreamPage.waitForStreamData();

    // Wait for first Editor's message to appear
    await editor2StreamPage.waitForMessage(editor1Message);

    // Click on the message
    const messageElement = editor2Page.locator(`.message-item:has-text("${editor1Message}")`);
    await messageElement.click();

    // Wait for potential context menu
    await editor2Page.waitForTimeout(500);

    // Verify mute button is NOT visible (Editors cannot mute other Editors)
    const muteButton = editor2Page.locator('.context-menu-item.mute-item');
    const isMuteVisible = await muteButton.isVisible().catch(() => false);

    expect(isMuteVisible).toBe(false);

    // Clean up
    await editor2Page.waitForTimeout(500);
    await editor1Context.close();
    await editor2Context.close();
  });

  test('Editor cannot see mute button for own messages', async ({ context, page }) => {
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

    // Editor sends a message
    const editorMessage = `Editor self message ${Date.now()}`;
    await streamPage.sendMessage(editorMessage);
    await streamPage.waitForMessage(editorMessage);

    // Click on own message
    const messageElement = page.locator(`.message-item:has-text("${editorMessage}")`);
    await messageElement.click();

    // Wait for context menu
    await page.waitForTimeout(500);

    // Verify mute button is NOT visible (cannot mute self)
    const muteButton = page.locator('.context-menu-item.mute-item');
    const isMuteVisible = await muteButton.isVisible().catch(() => false);

    expect(isMuteVisible).toBe(false);

    await page.waitForTimeout(500);
  });
});

test.describe('Chat Permissions - Admin Permissions', () => {
  test('Admin can delete any message including other Admins', async ({ browser }) => {
    const jwtHelper = new JWTHelper();

    // Create first Admin context and send a message
    const admin1Context = await browser.newContext();
    await admin1Context.addCookies([{
      name: 'token',
      value: jwtHelper.generateToken(0, 'admin-1', 'Admin One'),
      domain: 'localhost',
      path: '/',
    }]);

    const admin1Page = await admin1Context.newPage();
    const admin1StreamPage = new StreamPage(admin1Page);
    await admin1StreamPage.navigate();
    await admin1StreamPage.waitForStreamData();

    // First Admin sends a message
    const admin1Message = `Admin One message ${Date.now()}`;
    await admin1StreamPage.sendMessage(admin1Message);
    await admin1StreamPage.waitForMessage(admin1Message);

    // Create second Admin context
    const admin2Context = await browser.newContext();
    await admin2Context.addCookies([{
      name: 'token',
      value: jwtHelper.generateToken(0, 'admin-2', 'Admin Two'),
      domain: 'localhost',
      path: '/',
    }]);

    const admin2Page = await admin2Context.newPage();
    const admin2StreamPage = new StreamPage(admin2Page);
    await admin2StreamPage.navigate();
    await admin2StreamPage.waitForStreamData();

    // Wait for first Admin's message to appear
    await admin2StreamPage.waitForMessage(admin1Message);

    // Click on the message to open context menu
    const messageElement = admin2Page.locator(`.message-item:has-text("${admin1Message}")`);
    await messageElement.click();

    // Wait for context menu
    await admin2Page.waitForTimeout(500);

    // Verify delete button is visible
    const deleteButton = admin2Page.locator('.context-menu-item.delete-item');
    await expect(deleteButton).toBeVisible({ timeout: 2000 });

    // Second Admin deletes first Admin's message
    await deleteButton.click();

    // Verify message is deleted
    await admin2StreamPage.waitForMessageDeleted(admin1Message);

    // Clean up
    await admin2Page.waitForTimeout(500);
    await admin1Context.close();
    await admin2Context.close();
  });

  test('Admin can mute anyone including Editors', async ({ browser }) => {
    const jwtHelper = new JWTHelper();

    // Create Editor context and send a message
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

    // Editor sends a message
    const editorMessage = `Editor for Admin mute ${Date.now()}`;
    await editorStreamPage.sendMessage(editorMessage);
    await editorStreamPage.waitForMessage(editorMessage);

    // Create Admin context
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

    // Wait for Editor's message to appear
    await adminStreamPage.waitForMessage(editorMessage);

    // Click on the message
    const messageElement = adminPage.locator(`.message-item:has-text("${editorMessage}")`);
    await messageElement.click();

    // Wait for context menu
    await adminPage.waitForTimeout(500);

    // Verify mute button is visible (Admin can mute Editors)
    const muteButton = adminPage.locator('.context-menu-item.mute-item');
    await expect(muteButton).toBeVisible({ timeout: 2000 });

    // Clean up
    await adminPage.waitForTimeout(500);
    await editorContext.close();
    await adminContext.close();
  });

  test('Admin can delete User messages', async ({ browser }) => {
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
    const userMessage = `User message for Admin ${Date.now()}`;
    await userStreamPage.sendMessage(userMessage);
    await userStreamPage.waitForMessage(userMessage);

    // Create Admin context
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

    // Wait for User message to appear
    await adminStreamPage.waitForMessage(userMessage);

    // Admin deletes User's message
    await adminStreamPage.deleteMessage(userMessage);

    // Verify message is deleted
    await adminStreamPage.waitForMessageDeleted(userMessage);

    // Clean up
    await adminPage.waitForTimeout(500);
    await userContext.close();
    await adminContext.close();
  });

  test('Editor cannot mute self - UI prevents it', async ({ context, page }) => {
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

    // Editor sends a message
    const editorMessage = `Editor self-check ${Date.now()}`;
    await streamPage.sendMessage(editorMessage);
    await streamPage.waitForMessage(editorMessage);

    // Click on own message
    const messageElement = page.locator(`.message-item:has-text("${editorMessage}")`);
    await messageElement.click();

    await page.waitForTimeout(500);

    // Verify mute button is NOT visible (cannot mute self)
    const muteButton = page.locator('.context-menu-item.mute-item');
    const isMuteVisible = await muteButton.isVisible().catch(() => false);
    expect(isMuteVisible).toBe(false);

    await page.waitForTimeout(500);
  });

  test('Admin cannot mute self - UI prevents it', async ({ context, page }) => {
    const jwtHelper = new JWTHelper();

    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // Admin sends a message
    const adminMessage = `Admin self-check ${Date.now()}`;
    await streamPage.sendMessage(adminMessage);
    await streamPage.waitForMessage(adminMessage);

    // Click on own message
    const messageElement = page.locator(`.message-item:has-text("${adminMessage}")`);
    await messageElement.click();

    await page.waitForTimeout(500);

    // Verify mute button is NOT visible (UI correctly hides it)
    const muteButton = page.locator('.context-menu-item.mute-item');
    const isMuteVisible = await muteButton.isVisible().catch(() => false);
    expect(isMuteVisible).toBe(false);

    await page.waitForTimeout(500);
  });
});

test.describe('Chat Permissions - Context Menu Logic', () => {
  test('User only sees context menu on own messages', async ({ browser }) => {
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

    // Create User context
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

    // Wait for Admin message to appear
    await userStreamPage.waitForMessage(adminMessage);

    // User clicks on Admin's message
    const messageElement = userPage.locator(`.message-item:has-text("${adminMessage}")`);
    await messageElement.click();

    // Wait for potential context menu
    await userPage.waitForTimeout(500);

    // Verify context menu is NOT shown (or no buttons are visible)
    const contextMenu = userPage.locator('.context-menu');
    const isContextMenuVisible = await contextMenu.isVisible().catch(() => false);

    // Context menu should not be visible for other users' messages when User role
    expect(isContextMenuVisible).toBe(false);

    // Now User sends own message
    const userMessage = `User own message ${Date.now()}`;
    await userStreamPage.sendMessage(userMessage);
    await userStreamPage.waitForMessage(userMessage);

    // User clicks on own message
    const ownMessageElement = userPage.locator(`.message-item:has-text("${userMessage}")`);
    await ownMessageElement.click();

    // Wait for context menu
    await userPage.waitForTimeout(500);

    // Verify context menu IS shown for own message
    const ownContextMenu = userPage.locator('.context-menu');
    const isOwnContextMenuVisible = await ownContextMenu.isVisible().catch(() => false);

    expect(isOwnContextMenuVisible).toBe(true);

    // Clean up
    await userPage.waitForTimeout(500);
    await adminContext.close();
    await userContext.close();
  });

  test('Guest only sees context menu on own messages', async ({ browser }) => {
    const jwtHelper = new JWTHelper();

    // Create Editor context and send a message
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

    // Editor sends a message
    const editorMessage = `Editor message ${Date.now()}`;
    await editorStreamPage.sendMessage(editorMessage);
    await editorStreamPage.waitForMessage(editorMessage);

    // Create Guest context
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

    // Wait for Editor message to appear
    await guestStreamPage.waitForMessage(editorMessage);

    // Guest clicks on Editor's message
    const messageElement = guestPage.locator(`.message-item:has-text("${editorMessage}")`);
    await messageElement.click();

    // Wait for potential context menu
    await guestPage.waitForTimeout(500);

    // Verify context menu is NOT shown
    const contextMenu = guestPage.locator('.context-menu');
    const isContextMenuVisible = await contextMenu.isVisible().catch(() => false);

    expect(isContextMenuVisible).toBe(false);

    // Now Guest sends own message
    const guestMessage = `Guest own message ${Date.now()}`;
    await guestStreamPage.sendMessage(guestMessage);
    await guestStreamPage.waitForMessage(guestMessage);

    // Guest clicks on own message
    const ownMessageElement = guestPage.locator(`.message-item:has-text("${guestMessage}")`);
    await ownMessageElement.click();

    // Wait for context menu
    await guestPage.waitForTimeout(500);

    // Verify context menu IS shown for own message
    const ownContextMenu = guestPage.locator('.context-menu');
    const isOwnContextMenuVisible = await ownContextMenu.isVisible().catch(() => false);

    expect(isOwnContextMenuVisible).toBe(true);

    // Clean up
    await guestPage.waitForTimeout(500);
    await editorContext.close();
    await guestContext.close();
  });

  test('When all buttons hidden, context menu shows no options', async ({ browser }) => {
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
    const adminMessage = `Admin protected ${Date.now()}`;
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

    // Wait for Admin message to appear
    await editorStreamPage.waitForMessage(adminMessage);

    // Editor clicks on Admin's message
    const messageElement = editorPage.locator(`.message-item:has-text("${adminMessage}")`);
    await messageElement.click();

    // Wait for potential context menu
    await editorPage.waitForTimeout(500);

    // Context menu should not be shown OR should have no visible buttons
    const contextMenu = editorPage.locator('.context-menu');
    const isContextMenuVisible = await contextMenu.isVisible().catch(() => false);

    if (isContextMenuVisible) {
      // If context menu is visible, verify no buttons are visible
      const deleteButton = editorPage.locator('.context-menu-item.delete-item');
      const muteButton = editorPage.locator('.context-menu-item.mute-item');

      const isDeleteVisible = await deleteButton.isVisible().catch(() => false);
      const isMuteVisible = await muteButton.isVisible().catch(() => false);

      expect(isDeleteVisible).toBe(false);
      expect(isMuteVisible).toBe(false);
    } else {
      // Context menu should not be shown when no actions are available
      expect(isContextMenuVisible).toBe(false);
    }

    // Clean up
    await editorPage.waitForTimeout(500);
    await adminContext.close();
    await editorContext.close();
  });
});
