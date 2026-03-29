import { test, expect } from '@playwright/test';
import { ManageLivestreamPage } from '../page-objects/manage-livestream-page';
import { JWTHelper } from '../helpers/jwt-helper';

/**
 * Scenario: Admin User Managing Livestream Visibility
 *
 * Test Objectives:
 * - Verify visibility select is enabled before livestream creation
 * - Verify visibility select is disabled after livestream creation
 * - Verify public livestream creation and visibility state
 * - Verify member-only livestream creation and visibility state
 * - Verify visibility option labels are correctly translated across languages (en/zh/ja)
 *
 * Pre-conditions:
 * - Backend and frontend services running
 * - Admin JWT token set in cookies
 */

test.describe('Admin User - Manage Livestream Visibility', () => {
  let jwtHelper: JWTHelper;

  test.beforeEach(() => {
    jwtHelper = new JWTHelper();
  });

  test('Visibility select is enabled before livestream creation', async ({ context, page }) => {
    // Step 1: Set Admin token
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const manageLivestreamPage = new ManageLivestreamPage(page);

    // Step 2: Navigate to manage-livestream page
    await manageLivestreamPage.navigate();

    // Step 3: Wait for page to load
    await page.waitForLoadState('networkidle');

    // Step 4: Check if livestream exists, delete it if necessary
    const livestreamExists = await manageLivestreamPage.isLivestreamExist();
    if (livestreamExists) {
      await manageLivestreamPage.clickDeleteButton();
      // Reload the page to ensure fresh state after deletion
      await page.reload();
      await page.waitForLoadState('networkidle');
    }

    // Step 5: Verify visibility select is enabled
    const isDisabled = await manageLivestreamPage.isVisibilitySelectDisabled();
    expect(isDisabled).toBe(false);

    // Step 6: Verify default value is "member_only"
    const selectedVisibility = await manageLivestreamPage.getSelectedVisibility();
    expect(selectedVisibility).toBe('member_only');

    // Step 7: Switch to "public" and verify
    await manageLivestreamPage.selectVisibility('public');
    const newSelectedVisibility = await manageLivestreamPage.getSelectedVisibility();
    expect(newSelectedVisibility).toBe('public');

    // Step 8: Get visibility select element and verify options exist
    const visibilitySelect = manageLivestreamPage.getVisibilitySelect();
    const optionCount = await visibilitySelect.locator('option').count();
    expect(optionCount).toBe(2);

    // Step 9: Verify option values
    const publicOption = visibilitySelect.locator('option[value="public"]');
    const memberOnlyOption = visibilitySelect.locator('option[value="member_only"]');
    expect(await publicOption.count()).toBe(1);
    expect(await memberOnlyOption.count()).toBe(1);

    await page.waitForTimeout(500);
  });

  test('Visibility select is disabled after livestream creation', async ({ context, page }) => {
    // Step 1: Set Admin token
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const manageLivestreamPage = new ManageLivestreamPage(page);

    // Step 2: Navigate to manage-livestream page
    await manageLivestreamPage.navigate();
    await page.waitForLoadState('networkidle');

    // Step 3: Ensure livestream exists (create if needed)
    const livestreamExists = await manageLivestreamPage.isLivestreamExist();
    if (!livestreamExists) {
      // Create a test livestream
      await manageLivestreamPage.fillLivestreamForm({
        name: `test-livestream-${Date.now()}`,
        title: 'Test Livestream',
        information: 'This is a test livestream',
        visibility: 'member_only',
        is_record: false,
      });

      await manageLivestreamPage.clickCreateButton();
      await manageLivestreamPage.waitForCreateResponse();
      await manageLivestreamPage.waitForSuccessNotification();
      await page.waitForTimeout(1000);
    }

    // Step 4: Verify visibility select is disabled
    const isDisabled = await manageLivestreamPage.isVisibilitySelectDisabled();
    expect(isDisabled).toBe(true);

    // Step 5: Verify current visibility value is displayed correctly
    const currentVisibility = await manageLivestreamPage.getSelectedVisibility();
    expect(['public', 'member_only'].includes(currentVisibility)).toBe(true);

    // Step 6: Verify delete button is visible (indicating livestream exists)
    const isDeleteButtonVisible = await manageLivestreamPage.isDeleteButtonVisible();
    expect(isDeleteButtonVisible).toBe(true);

    // Clean up: Delete the livestream
    await manageLivestreamPage.clickDeleteButton();
    await page.waitForTimeout(500);
  });

  test('Create public livestream and verify visibility state', async ({ context, page }) => {
    // Step 1: Set Admin token
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const manageLivestreamPage = new ManageLivestreamPage(page);

    // Step 2: Navigate to manage-livestream page
    await manageLivestreamPage.navigate();
    await page.waitForLoadState('networkidle');

    // Step 3: Ensure no existing livestream
    const livestreamExists = await manageLivestreamPage.isLivestreamExist();
    if (livestreamExists) {
      await manageLivestreamPage.clickDeleteButton();
      // Wait for the delete button to disappear (indicates state updated)
      await page.waitForSelector('.btn-danger', { state: 'hidden', timeout: 5000 });
      // Wait for the create button to appear
      await page.waitForSelector('.btn-primary', { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(500);
    }

    // Step 4: Fill form with public visibility
    const livestreamName = `test-public-${Date.now()}`;
    await manageLivestreamPage.fillLivestreamForm({
      name: livestreamName,
      title: 'Public Test Livestream',
      information: 'This is a public test livestream',
      visibility: 'public',
      is_record: false,
    });

    // Step 5: Verify visibility is set to public before creation
    const visibilityBeforeCreate = await manageLivestreamPage.getSelectedVisibility();
    expect(visibilityBeforeCreate).toBe('public');

    // Step 6: Create livestream
    await manageLivestreamPage.clickCreateButton();
    await manageLivestreamPage.waitForCreateResponse();
    await manageLivestreamPage.waitForSuccessNotification();
    await page.waitForTimeout(1000);

    // Step 7: Verify livestream was created successfully
    const isLivestreamCreated = await manageLivestreamPage.isLivestreamExist();
    expect(isLivestreamCreated).toBe(true);

    // Step 8: Verify visibility is set to public and disabled
    const visibilityAfterCreate = await manageLivestreamPage.getSelectedVisibility();
    expect(visibilityAfterCreate).toBe('public');

    const isDisabled = await manageLivestreamPage.isVisibilitySelectDisabled();
    expect(isDisabled).toBe(true);

    // Step 9: Verify streamPushURL is populated
    const streamPushURL = await manageLivestreamPage.getStreamPushURL();
    expect(streamPushURL.length).toBeGreaterThan(0);
    expect(streamPushURL).toContain('rtmp://'); // Verify it's an RTMP URL

    // Clean up: Delete the livestream
    await manageLivestreamPage.clickDeleteButton();
    await page.waitForTimeout(500);
  });

  test('Create member-only livestream and verify visibility state', async ({ context, page }) => {
    // Step 1: Set Admin token
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const manageLivestreamPage = new ManageLivestreamPage(page);

    // Step 2: Navigate to manage-livestream page
    await manageLivestreamPage.navigate();
    await page.waitForLoadState('networkidle');

    // Step 3: Ensure no existing livestream
    const livestreamExists = await manageLivestreamPage.isLivestreamExist();
    if (livestreamExists) {
      await manageLivestreamPage.clickDeleteButton();
      // Wait for the delete button to disappear (indicates state updated)
      await page.waitForSelector('.btn-danger', { state: 'hidden', timeout: 5000 });
      // Wait for the create button to appear
      await page.waitForSelector('.btn-primary', { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(500);
    }

    // Step 4: Fill form with member_only visibility
    const livestreamName = `test-member-only-${Date.now()}`;
    await manageLivestreamPage.fillLivestreamForm({
      name: livestreamName,
      title: 'Member-Only Test Livestream',
      information: 'This is a member-only test livestream',
      visibility: 'member_only',
      is_record: true,
    });

    // Step 5: Verify visibility is set to member_only before creation
    const visibilityBeforeCreate = await manageLivestreamPage.getSelectedVisibility();
    expect(visibilityBeforeCreate).toBe('member_only');

    // Step 6: Create livestream
    await manageLivestreamPage.clickCreateButton();
    await manageLivestreamPage.waitForCreateResponse();
    await manageLivestreamPage.waitForSuccessNotification();
    await page.waitForTimeout(1000);

    // Step 7: Verify livestream was created successfully
    const isLivestreamCreated = await manageLivestreamPage.isLivestreamExist();
    expect(isLivestreamCreated).toBe(true);

    // Step 8: Verify visibility is set to member_only and disabled
    const visibilityAfterCreate = await manageLivestreamPage.getSelectedVisibility();
    expect(visibilityAfterCreate).toBe('member_only');

    const isDisabled = await manageLivestreamPage.isVisibilitySelectDisabled();
    expect(isDisabled).toBe(true);

    // Step 9: Verify recording is enabled
    const isRecordEnabled = await manageLivestreamPage.isRecordEnabled();
    expect(isRecordEnabled).toBe(true);

    // Step 10: Verify streamPushURL is populated
    const streamPushURL = await manageLivestreamPage.getStreamPushURL();
    expect(streamPushURL.length).toBeGreaterThan(0);
    expect(streamPushURL).toContain('rtmp://'); // Verify it's an RTMP URL

    // Clean up: Delete the livestream
    await manageLivestreamPage.clickDeleteButton();
    await page.waitForTimeout(500);
  });

  test('Visibility option labels are correctly translated (en/zh/ja)', async ({ context, page }) => {
    // Step 1: Set Admin token
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const manageLivestreamPage = new ManageLivestreamPage(page);

    // Step 2: Navigate to manage-livestream page
    await manageLivestreamPage.navigate();
    await page.waitForLoadState('networkidle');

    // Step 3: Ensure no existing livestream (visibility select must be enabled)
    const livestreamExists = await manageLivestreamPage.isLivestreamExist();
    if (livestreamExists) {
      await manageLivestreamPage.clickDeleteButton();
      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');
    }

    // Step 4: Test English translations
    const languageSwitcher = page.locator('.language-switcher');
    await languageSwitcher.selectOption('en');
    await page.waitForTimeout(500);

    const visibilitySelect = manageLivestreamPage.getVisibilitySelect();
    const publicOptionEN = visibilitySelect.locator('option[value="public"]');
    const memberOnlyOptionEN = visibilitySelect.locator('option[value="member_only"]');

    const publicTextEN = await publicOptionEN.textContent();
    const memberOnlyTextEN = await memberOnlyOptionEN.textContent();

    expect(publicTextEN).toBe('Public');
    expect(memberOnlyTextEN).toBe('Members Only');

    // Step 5: Test Chinese translations
    await languageSwitcher.selectOption('zh');
    await page.waitForTimeout(500);

    const publicOptionZH = visibilitySelect.locator('option[value="public"]');
    const memberOnlyOptionZH = visibilitySelect.locator('option[value="member_only"]');

    const publicTextZH = await publicOptionZH.textContent();
    const memberOnlyTextZH = await memberOnlyOptionZH.textContent();

    expect(publicTextZH).toBe('公開');
    expect(memberOnlyTextZH).toBe('僅限會員');

    // Step 6: Test Japanese translations
    await languageSwitcher.selectOption('ja');
    await page.waitForTimeout(500);

    const publicOptionJA = visibilitySelect.locator('option[value="public"]');
    const memberOnlyOptionJA = visibilitySelect.locator('option[value="member_only"]');

    const publicTextJA = await publicOptionJA.textContent();
    const memberOnlyTextJA = await memberOnlyOptionJA.textContent();

    expect(publicTextJA).toBe('公開');
    expect(memberOnlyTextJA).toBe('メンバー限定');

    // Step 7: Verify the visibility label is also translated
    await languageSwitcher.selectOption('en');
    await page.waitForTimeout(500);
    let visibilityLabel = page.locator('label[for="visibility"]');
    expect(await visibilityLabel.textContent()).toContain('Visibility');

    await languageSwitcher.selectOption('zh');
    await page.waitForTimeout(500);
    visibilityLabel = page.locator('label[for="visibility"]');
    expect(await visibilityLabel.textContent()).toContain('可見度');

    await languageSwitcher.selectOption('ja');
    await page.waitForTimeout(500);
    visibilityLabel = page.locator('label[for="visibility"]');
    expect(await visibilityLabel.textContent()).toContain('公開設定');

    // Step 8: Switch back to English
    await languageSwitcher.selectOption('en');
    await page.waitForTimeout(500);
  });
});

test.describe('Admin User - Existing Livestream Data Display', () => {
  let jwtHelper: JWTHelper;

  test.beforeEach(() => {
    jwtHelper = new JWTHelper();
  });

  test('Displays existing livestream data correctly with proper field mapping', async ({ context, page }) => {
    // This test protects against the bug where backend returns snake_case fields
    // (ban_list, mute_list) but frontend expects camelCase (banList, muteList)

    // Step 1: Set Admin token
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const manageLivestreamPage = new ManageLivestreamPage(page);

    // Step 2: Navigate to manage-livestream page
    await manageLivestreamPage.navigate();
    await page.waitForLoadState('networkidle');

    // Step 3: Ensure livestream exists
    const livestreamExists = await manageLivestreamPage.isLivestreamExist();

    let livestreamData;
    if (!livestreamExists) {
      // Create a test livestream
      await manageLivestreamPage.fillLivestreamForm({
        name: `test-livestream-${Date.now()}`,
        title: 'Test Livestream for Data Display',
        information: 'Testing field mapping',
        visibility: 'public',
        is_record: true,
      });

      // Set up response listener BEFORE clicking button
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/livestream') &&
                    response.request().method() === 'POST' &&
                    response.status() === 200,
        { timeout: 10000 }
      );

      await manageLivestreamPage.clickCreateButton();
      await responsePromise;
      await manageLivestreamPage.waitForSuccessNotification();
      await page.waitForTimeout(1000);
    }

    // Step 4: Intercept /livestream/{uuid} API call to verify response structure
    const livestreamResponsePromise = page.waitForResponse(
      response => response.url().match(/\/livestream\/[a-f0-9-]+$/) &&
                  response.status() === 200,
      { timeout: 10000 }
    );

    // Reload page to trigger fetch
    await page.reload();
    await page.waitForLoadState('networkidle');

    const livestreamResponse = await livestreamResponsePromise;
    livestreamData = await livestreamResponse.json();

    // Step 5: CRITICAL - Verify API returns snake_case fields
    expect(livestreamData).toHaveProperty('ban_list');
    expect(livestreamData).toHaveProperty('mute_list');
    expect(livestreamData).toHaveProperty('is_record');
    expect(livestreamData).toHaveProperty('streamPushURL');
    expect(Array.isArray(livestreamData.ban_list)).toBe(true);
    expect(Array.isArray(livestreamData.mute_list)).toBe(true);

    // Step 6: Verify streamPushURL is populated and visible
    const streamPushURL = await manageLivestreamPage.getStreamPushURL();
    expect(streamPushURL.length).toBeGreaterThan(0);
    expect(streamPushURL).toContain('rtmp://');
    expect(streamPushURL).toBe(livestreamData.streamPushURL);

    // Step 7: Verify banList field is visible (even if empty)
    const banListInput = page.locator('#banList');
    await expect(banListInput).toBeVisible();
    await expect(banListInput).toBeDisabled();

    // Step 8: Verify muteList field is visible (even if empty)
    const muteListInput = page.locator('#muteList');
    await expect(muteListInput).toBeVisible();
    await expect(muteListInput).toBeDisabled();

    // Step 9: Verify all form fields are disabled for existing livestream
    const nameInput = page.locator('#name');
    const titleInput = page.locator('#title');
    const informationInput = page.locator('#information');
    const visibilitySelect = page.locator('#visibility');
    const recordCheckbox = page.locator('#is_record');

    await expect(nameInput).toBeDisabled();
    await expect(titleInput).toBeDisabled();
    await expect(informationInput).toBeDisabled();
    await expect(visibilitySelect).toBeDisabled();
    await expect(recordCheckbox).toBeDisabled();

    // Step 10: Verify correct buttons are displayed
    const createButton = page.locator('.btn-primary');
    const deleteButton = page.locator('.btn-danger');

    await expect(createButton).not.toBeVisible();
    await expect(deleteButton).toBeVisible();

    // Step 11: Verify download button visibility based on is_record
    const downloadButton = page.locator('.btn-download');
    if (livestreamData.is_record) {
      await expect(downloadButton).toBeVisible();
    } else {
      await expect(downloadButton).not.toBeVisible();
    }

    // Step 12: Verify record toggle state matches API data
    const isRecordChecked = await recordCheckbox.isChecked();
    expect(isRecordChecked).toBe(livestreamData.is_record);

    await page.waitForTimeout(500);
  });

  test('Handles empty ban_list and mute_list without errors', async ({ context, page }) => {
    // This test ensures the frontend doesn't crash when ban_list/mute_list are empty arrays

    // Step 1: Set Admin token
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const manageLivestreamPage = new ManageLivestreamPage(page);

    // Step 2: Navigate to manage-livestream page
    await manageLivestreamPage.navigate();
    await page.waitForLoadState('networkidle');

    // Step 3: Ensure livestream exists
    const livestreamExists = await manageLivestreamPage.isLivestreamExist();
    if (!livestreamExists) {
      await manageLivestreamPage.fillLivestreamForm({
        name: `test-livestream-${Date.now()}`,
        title: 'Test Empty Lists',
        information: 'Testing empty ban/mute lists',
        visibility: 'member_only',
        is_record: false,
      });
      await manageLivestreamPage.clickCreateButton();
      await manageLivestreamPage.waitForCreateResponse();
      await manageLivestreamPage.waitForSuccessNotification();
      await page.waitForTimeout(1000);
    }

    // Step 4: Verify ban_list textarea displays correctly (empty or with newlines)
    const banListInput = page.locator('#banList');
    await expect(banListInput).toBeVisible();
    const banListValue = await banListInput.inputValue();
    // Should be empty or contain only whitespace
    expect(banListValue.trim()).toBe('');

    // Step 5: Verify mute_list textarea displays correctly (empty or with newlines)
    const muteListInput = page.locator('#muteList');
    await expect(muteListInput).toBeVisible();
    const muteListValue = await muteListInput.inputValue();
    // Should be empty or contain only whitespace
    expect(muteListValue.trim()).toBe('');

    // Step 6: Verify no JavaScript errors occurred
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.waitForTimeout(1000);
    expect(errors.length).toBe(0);
  });

  test('UI updates correctly after creating new livestream', async ({ context, page }) => {
    // This test verifies the UI transition from "no livestream" to "has livestream" state

    // Step 1: Set Admin token
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);

    const manageLivestreamPage = new ManageLivestreamPage(page);

    // Step 2: Navigate to manage-livestream page
    await manageLivestreamPage.navigate();
    await page.waitForLoadState('networkidle');

    // Step 3: Delete existing livestream if any
    const livestreamExists = await manageLivestreamPage.isLivestreamExist();
    if (livestreamExists) {
      await manageLivestreamPage.clickDeleteButton();
      await page.waitForSelector('.btn-danger', { state: 'hidden', timeout: 5000 });
      await page.waitForSelector('.btn-primary', { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(500);
    }

    // Step 4: Verify create button is visible and fields are enabled
    const createButton = page.locator('.btn-primary');
    await expect(createButton).toBeVisible();

    const nameInput = page.locator('#name');
    await expect(nameInput).toBeEnabled();

    // Step 5: Verify streamPushURL, banList, muteList are NOT visible
    const streamPushURLInput = page.locator('#streamPushURL');
    const banListInput = page.locator('#banList');
    const muteListInput = page.locator('#muteList');

    await expect(streamPushURLInput).not.toBeVisible();
    await expect(banListInput).not.toBeVisible();
    await expect(muteListInput).not.toBeVisible();

    // Step 6: Create livestream
    await manageLivestreamPage.fillLivestreamForm({
      name: `test-ui-update-${Date.now()}`,
      title: 'Test UI Update',
      information: 'Testing UI state transition',
      visibility: 'public',
      is_record: true,
    });
    await manageLivestreamPage.clickCreateButton();
    await manageLivestreamPage.waitForCreateResponse();
    await manageLivestreamPage.waitForSuccessNotification();
    await page.waitForTimeout(1500);

    // Step 7: Verify UI updated to "has livestream" state
    await expect(createButton).not.toBeVisible();
    const deleteButton = page.locator('.btn-danger');
    await expect(deleteButton).toBeVisible();

    // Step 8: Verify fields are now disabled
    await expect(nameInput).toBeDisabled();

    // Step 9: Verify streamPushURL, banList, muteList are NOW visible
    await expect(streamPushURLInput).toBeVisible();
    await expect(banListInput).toBeVisible();
    await expect(muteListInput).toBeVisible();

    // Step 10: Verify streamPushURL has a value
    const streamPushURL = await streamPushURLInput.inputValue();
    expect(streamPushURL.length).toBeGreaterThan(0);
    expect(streamPushURL).toContain('rtmp://');

    // Step 11: Verify download button is visible (since is_record is true)
    const downloadButton = page.locator('.btn-download');
    await expect(downloadButton).toBeVisible();

    await page.waitForTimeout(500);
  });
});
