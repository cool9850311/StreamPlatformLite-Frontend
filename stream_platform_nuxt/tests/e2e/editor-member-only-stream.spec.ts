import { test, expect } from '@playwright/test';
import { StreamPage } from '../page-objects/stream-page';
import { JWTHelper } from '../helpers/jwt-helper';

/**
 * Scenario: Editor User Accessing MemberOnly Livestream
 *
 * Test Objectives:
 * - Verify Editor users can access member-only livestreams
 * - Verify Editor users can delete others' messages in member-only livestreams
 *
 * Pre-conditions:
 * - Backend and frontend services running
 * - A member-only livestream exists
 * - Editor JWT token set in cookies
 */

test.describe('Editor User - MemberOnly Livestream Access', () => {
  test('Editor can access member-only livestream', async ({ context, page }) => {
    // Step 1: Set Editor token
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateEditorToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const streamPage = new StreamPage(page);

    // Step 2: Navigate to member-only livestream page
    await streamPage.navigate();

    // Step 3: Verify /livestream/one API returns 200 (access granted)
    const response = await streamPage.waitForStreamData();
    expect(response.status()).toBe(200);

    // Step 4: Verify video player is visible
    expect(await streamPage.isVideoPlayerVisible()).toBe(true);

    // Step 5: Verify visibility badge shows "member_only"
    expect(await streamPage.getVisibilityBadge()).toBe('member_only');

    // Step 6: Verify no login prompt is shown
    expect(await streamPage.isLoginPromptVisible()).toBe(false);

    await page.waitForTimeout(500);
  });

  test('Editor can delete others\' messages in member-only', async ({ browser }) => {
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
    const userMessage = `User message in member-only ${Date.now()}`;
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
});
