import { test, expect } from '@playwright/test';
import { JWTHelper } from '../helpers/jwt-helper';

/**
 * Scenario: Admin User Navigation and Role Detection
 *
 * Test Objectives:
 * - Verify /me API returns numeric role (0 for Admin)
 * - Verify frontend correctly interprets numeric role value
 * - Verify Admin menu items are displayed for Admin users
 * - Verify non-Admin users don't see Admin menu items
 *
 * Background:
 * This test protects against a bug where role comparison used string 'Admin'
 * instead of numeric value 0, causing Admin menu items to not display.
 *
 * Pre-conditions:
 * - Backend and frontend services running
 * - JWT tokens configured for different roles
 */

test.describe('Admin User - Navigation and Role Detection', () => {
  let jwtHelper: JWTHelper;

  test.beforeEach(() => {
    jwtHelper = new JWTHelper();
  });

  test('Admin user sees all admin menu items due to numeric role (role === 0)', async ({ context, page }) => {
    // Step 1: Set Admin token (role = 0)
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    // Step 2: Navigate to stream page
    await page.goto('http://localhost:3000/stream');

    // Step 3: Wait for /me API call and capture response
    const meResponse = await page.waitForResponse(
      response => response.url().endsWith('/me') && response.status() === 200,
      { timeout: 10000 }
    );

    // Step 4: Parse and log response data
    const meData = await meResponse.json();
    console.log('Admin /me response:', JSON.stringify(meData, null, 2));

    // CRITICAL: Verify role is returned as number 0, not string "Admin"
    expect(typeof meData.role).toBe('number');
    expect(meData.role).toBe(0);

    // Step 4: Open user menu
    const menuButton = page.locator('.dropdown-button');
    await menuButton.click();
    await page.waitForTimeout(500);

    // Step 5: Verify Admin-only menu items are visible
    const systemSettingsLink = page.locator('a[href="/system-settings"]');
    const manageLivestreamLink = page.locator('a[href="/manage-livestream"]');
    const manageAccountsLink = page.locator('a[href="/manage-accounts"]');

    await expect(systemSettingsLink).toBeVisible();
    await expect(manageLivestreamLink).toBeVisible();
    await expect(manageAccountsLink).toBeVisible();

    // Step 6: Verify menu items have correct icons and text
    expect(await systemSettingsLink.textContent()).toContain('System Settings');
    expect(await manageLivestreamLink.textContent()).toContain('Manage Livestreams');
    expect(await manageAccountsLink.textContent()).toContain('Manage Accounts');
  });

  test('User role (role === 3) does not see admin menu items', async ({ context, page }) => {
    // Step 1: Set User token (role = 3)
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: 'localhost',
      path: '/',
    }]);

    // Step 2: Navigate to stream page
    await page.goto('http://localhost:3000/stream');

    // Step 3: Wait for /me API call and capture response
    const meResponse = await page.waitForResponse(
      response => response.url().endsWith('/me') && response.status() === 200,
      { timeout: 10000 }
    );

    // Step 4: Parse response data
    const meData = await meResponse.json();

    expect(typeof meData.role).toBe('number');
    expect(meData.role).toBe(3); // User role

    // Step 4: Open user menu
    const menuButton = page.locator('.dropdown-button');
    await menuButton.click();
    await page.waitForTimeout(500);

    // Step 5: Verify Admin menu items are NOT visible
    const systemSettingsLink = page.locator('a[href="/system-settings"]');
    const manageLivestreamLink = page.locator('a[href="/manage-livestream"]');
    const manageAccountsLink = page.locator('a[href="/manage-accounts"]');

    await expect(systemSettingsLink).not.toBeVisible();
    await expect(manageLivestreamLink).not.toBeVisible();
    await expect(manageAccountsLink).not.toBeVisible();

    // Step 6: Verify common menu items are visible (dropdown menu should contain stream link and logout)
    const streamLinkInMenu = page.locator('.dropdown-menu a[href="/stream"]');
    const logoutButton = page.locator('.dropdown-menu a:has-text("Logout")');

    await expect(streamLinkInMenu).toBeVisible();
    await expect(logoutButton).toBeVisible();
  });

  test('Editor role (role === 2) does not see admin menu items', async ({ context, page }) => {
    // Step 1: Set Editor token (role = 2)
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateEditorToken(),
      domain: 'localhost',
      path: '/',
    }]);

    // Step 2: Navigate to stream page
    await page.goto('http://localhost:3000/stream');

    // Step 3: Wait for /me API call and capture response
    const meResponse = await page.waitForResponse(
      response => response.url().endsWith('/me') && response.status() === 200,
      { timeout: 10000 }
    );

    // Step 4: Parse response data
    const meData = await meResponse.json();

    expect(typeof meData.role).toBe('number');
    expect(meData.role).toBe(2); // Editor role

    // Step 4: Open user menu
    const menuButton = page.locator('.dropdown-button');
    await menuButton.click();
    await page.waitForTimeout(500);

    // Step 5: Verify Admin menu items are NOT visible
    const systemSettingsLink = page.locator('a[href="/system-settings"]');
    const manageLivestreamLink = page.locator('a[href="/manage-livestream"]');
    const manageAccountsLink = page.locator('a[href="/manage-accounts"]');

    await expect(systemSettingsLink).not.toBeVisible();
    await expect(manageLivestreamLink).not.toBeVisible();
    await expect(manageAccountsLink).not.toBeVisible();
  });

  test('Guest role (role === 4) does not see admin menu items', async ({ context, page }) => {
    // Step 1: Set Guest token (role = 4)
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateGuestToken(),
      domain: 'localhost',
      path: '/',
    }]);

    // Step 2: Navigate to stream page
    await page.goto('http://localhost:3000/stream');

    // Step 3: Wait for /me API call and capture response
    const meResponse = await page.waitForResponse(
      response => response.url().endsWith('/me') && response.status() === 200,
      { timeout: 10000 }
    );

    // Step 4: Parse response data
    const meData = await meResponse.json();

    expect(typeof meData.role).toBe('number');
    expect(meData.role).toBe(4); // Guest role

    // Step 4: Open user menu
    const menuButton = page.locator('.dropdown-button');
    await menuButton.click();
    await page.waitForTimeout(500);

    // Step 5: Verify Admin menu items are NOT visible
    const systemSettingsLink = page.locator('a[href="/system-settings"]');
    const manageLivestreamLink = page.locator('a[href="/manage-livestream"]');
    const manageAccountsLink = page.locator('a[href="/manage-accounts"]');

    await expect(systemSettingsLink).not.toBeVisible();
    await expect(manageLivestreamLink).not.toBeVisible();
    await expect(manageAccountsLink).not.toBeVisible();
  });

  test('Admin menu conditional rendering checks role === 0 (not string comparison)', async ({ context, page }) => {
    // This test verifies the fix for the bug where role was compared as string
    // Original bug: meResponse.data.role === 'Admin' (incorrect)
    // Fixed code: meResponse.data.role === 0 (correct)

    // Step 1: Set Admin token
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    // Step 2: Navigate to any page
    await page.goto('http://localhost:3000/stream');

    // Step 3: Wait for /me API response
    const meResponse = await page.waitForResponse(
      response => response.url().endsWith('/me') && response.status() === 200,
      { timeout: 10000 }
    );

    // Step 4: Parse response data
    const meData = await meResponse.json();

    // Step 4: CRITICAL ASSERTIONS
    // Ensure backend returns numeric role, not string
    expect(meData.role).toBe(0);
    expect(meData.role).not.toBe('Admin');
    expect(typeof meData.role).toBe('number');
    expect(typeof meData.role).not.toBe('string');

    // Step 5: Verify isAdmin flag is set correctly in frontend
    const menuButton = page.locator('.dropdown-button');
    await menuButton.click();

    // If this assertion fails, it means the frontend is not correctly
    // comparing role === 0 and isAdmin is false
    const adminMenuExists = await page.locator('a[href="/system-settings"]').isVisible();
    expect(adminMenuExists).toBe(true);
  });
});
