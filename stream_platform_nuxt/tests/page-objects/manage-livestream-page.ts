import { Page, Locator } from '@playwright/test';

export class ManageLivestreamPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/manage-livestream');
  }

  getVisibilitySelect(): Locator {
    // Returns the visibility input element
    // Note: Currently implemented as a readonly text input, not a select dropdown
    return this.page.locator('#visibility');
  }

  async selectVisibility(value: 'public' | 'member_only') {
    // Note: The current implementation uses a readonly text input
    // If the UI changes to use a select dropdown, this method can be updated
    const visibilityInput = this.getVisibilitySelect();

    // Check if it's a select element
    const tagName = await visibilityInput.evaluate((el) => el.tagName.toLowerCase());

    if (tagName === 'select') {
      // If it's a select, use the select method
      await visibilityInput.selectOption(value);
    } else {
      // If it's an input, we need to modify the v-model directly
      // This is primarily for testing purposes when the field becomes editable
      await visibilityInput.evaluate((el, val) => {
        (el as HTMLInputElement).value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
    }
  }

  async getSelectedVisibility(): Promise<string> {
    const visibilityInput = this.getVisibilitySelect();
    return await visibilityInput.inputValue();
  }

  async isVisibilitySelectDisabled(): Promise<boolean> {
    const visibilityInput = this.getVisibilitySelect();
    return await visibilityInput.isDisabled();
  }

  async fillLivestreamForm(data: {
    name?: string;
    title?: string;
    information?: string;
    visibility?: 'public' | 'member_only';
    is_record?: boolean;
  }) {
    // Fill name field if provided
    if (data.name !== undefined) {
      const nameInput = this.page.locator('#name');
      await nameInput.fill(data.name);
    }

    // Fill title field if provided
    if (data.title !== undefined) {
      const titleInput = this.page.locator('#title');
      await titleInput.fill(data.title);
    }

    // Fill information field if provided
    if (data.information !== undefined) {
      const infoTextarea = this.page.locator('#information');
      await infoTextarea.fill(data.information);
    }

    // Set visibility if provided (note: currently readonly, but method included for future use)
    if (data.visibility !== undefined) {
      await this.selectVisibility(data.visibility);
    }

    // Set is_record checkbox if provided
    if (data.is_record !== undefined) {
      const recordCheckbox = this.page.locator('#is_record');
      const isChecked = await recordCheckbox.isChecked();

      if (isChecked !== data.is_record) {
        // The checkbox is hidden (opacity: 0), so we need to click the slider
        const slider = this.page.locator('.slider');
        await slider.click({ force: true });
      }
    }
  }

  async clickCreateButton() {
    const createButton = this.page.locator('.btn-primary');
    await createButton.click();
  }

  async clickDeleteButton() {
    // Click the delete button
    const deleteButton = this.page.locator('.btn-danger');
    await deleteButton.click();

    // Wait for SweetAlert2 confirmation dialog to appear
    await this.page.waitForSelector('.swal2-container', { state: 'visible' });

    // Start waiting for the DELETE response before clicking confirm
    const deleteResponsePromise = this.page.waitForResponse(
      response => response.url().includes('/livestream/') &&
                  response.request().method() === 'DELETE',
      { timeout: 10000 }
    );

    // Click the confirm button in the dialog
    const confirmButton = this.page.locator('.swal2-confirm');
    await confirmButton.click();

    // Wait for DELETE response to complete
    await deleteResponsePromise;

    // Wait for the success dialog to appear
    await this.page.waitForSelector('.swal2-success', { state: 'visible', timeout: 10000 });

    // Click OK on the success dialog
    const okButton = this.page.locator('.swal2-confirm');
    await okButton.click();

    // Wait for the dialog to close
    await this.page.waitForSelector('.swal2-container', { state: 'hidden', timeout: 10000 });
  }

  async waitForSuccessNotification(timeout: number = 5000) {
    // Wait for success notification to appear
    await this.page.waitForSelector('.notification.success, .swal2-success', {
      state: 'visible',
      timeout
    });
  }

  async isFormFieldDisabled(fieldId: string): Promise<boolean> {
    const field = this.page.locator(`#${fieldId}`);
    return await field.isDisabled();
  }

  async isLivestreamExist(): Promise<boolean> {
    // Check if delete button is visible (indicates livestream exists)
    const deleteButton = this.page.locator('.btn-danger');
    return await deleteButton.isVisible();
  }

  async isCreateButtonVisible(): Promise<boolean> {
    const createButton = this.page.locator('.btn-primary');
    return await createButton.isVisible();
  }

  async isDeleteButtonVisible(): Promise<boolean> {
    const deleteButton = this.page.locator('.btn-danger');
    return await deleteButton.isVisible();
  }

  async getStreamPushURL(): Promise<string> {
    const streamPushURLInput = this.page.locator('#streamPushURL');
    return await streamPushURLInput.inputValue();
  }

  async getBanList(): Promise<string> {
    const banListTextarea = this.page.locator('#banList');
    return await banListTextarea.inputValue();
  }

  async getMuteList(): Promise<string> {
    const muteListTextarea = this.page.locator('#muteList');
    return await muteListTextarea.inputValue();
  }

  async waitForLivestreamData() {
    // Wait for livestream data to load
    return await this.page.waitForResponse(
      response => response.url().includes('/livestream/') && response.status() === 200,
      { timeout: 10000 }
    );
  }

  async waitForAccessDenied() {
    // Wait for redirect or access denied
    await this.page.waitForURL(/\/stream/, { timeout: 5000 });
  }

  async isAccessGranted(): Promise<boolean> {
    // Check if the manage livestream form is visible (indicates access granted)
    try {
      await this.page.waitForSelector('.livestream-page', { state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async clickDownloadButton() {
    const downloadButton = this.page.locator('.btn-download');
    await downloadButton.click();
  }

  async isDownloadButtonVisible(): Promise<boolean> {
    const downloadButton = this.page.locator('.btn-download');
    return await downloadButton.isVisible();
  }

  async waitForDownloadToStart() {
    // Wait for download to initiate
    const downloadPromise = this.page.waitForEvent('download', { timeout: 10000 });
    return await downloadPromise;
  }

  async getPageTitle(): Promise<string> {
    const titleElement = this.page.locator('.livestream-title');
    return await titleElement.textContent() || '';
  }

  async getPageSubtitle(): Promise<string> {
    const subtitleElement = this.page.locator('.livestream-subtitle');
    return await subtitleElement.textContent() || '';
  }

  async getFormFieldValue(fieldId: string): Promise<string> {
    const field = this.page.locator(`#${fieldId}`);
    return await field.inputValue();
  }

  async isRecordEnabled(): Promise<boolean> {
    const recordCheckbox = this.page.locator('#is_record');
    return await recordCheckbox.isChecked();
  }

  async waitForCreateResponse() {
    return await this.page.waitForResponse(
      response => response.url().includes('/livestream') &&
                  response.request().method() === 'POST' &&
                  response.status() === 200,
      { timeout: 10000 }
    );
  }

  async waitForDeleteResponse() {
    return await this.page.waitForResponse(
      response => response.url().includes('/livestream/') &&
                  response.request().method() === 'DELETE' &&
                  response.status() === 200,
      { timeout: 10000 }
    );
  }

  async getErrorNotification(): Promise<string | null> {
    try {
      const errorElement = this.page.locator('.notification.error');
      await errorElement.waitFor({ state: 'visible', timeout: 2000 });
      return await errorElement.textContent();
    } catch {
      return null;
    }
  }
}
