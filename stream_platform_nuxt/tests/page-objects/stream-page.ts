import { Page, expect } from '@playwright/test';

export class StreamPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/stream');
  }

  async waitForVideoPlayer() {
    await this.page.waitForSelector('#video', { timeout: 10000 });
  }

  async waitForStreamData() {
    // 等待直播数据加载并返回 response
    return await this.page.waitForResponse(
      response => response.url().includes('/livestream/one') && response.status() === 200,
      { timeout: 10000 }
    );
  }

  async isLoginPromptVisible(): Promise<boolean> {
    try {
      await this.page.locator('.login-prompt-banner, .access-denied').waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async isVideoPlayerVisible(): Promise<boolean> {
    // 视频元素可能存在但隐藏（当没有活跃流时）
    // 我们检查元素是否存在于 DOM 中
    const videoElement = this.page.locator('#video');
    const count = await videoElement.count();
    return count > 0;
  }

  async isVideoPlayerActuallyVisible(): Promise<boolean> {
    // 检查视频是否真的可见（不是 hidden）
    return await this.page.locator('#video').isVisible();
  }

  async getChatMessages() {
    return await this.page.locator('.message-item').all();
  }

  async sendMessage(text: string) {
    const input = this.page.locator('.chat-input-field');
    await input.fill(text);
    await input.press('Enter');
  }

  async isSendMessageDisabled(): Promise<boolean> {
    // 检查是否显示登录提示而非输入框
    return await this.page.locator('.login-prompt-box').isVisible();
  }

  async waitForMessage(messageText: string, timeout: number = 5000) {
    await this.page.waitForSelector(
      `.message-item:has-text("${messageText}")`,
      { timeout }
    );
  }

  async waitForMessageDeleted(messageText: string, timeout: number = 5000) {
    await this.page.waitForSelector(
      `.message-item:has-text("${messageText}")`,
      { state: 'detached', timeout }
    );
  }

  async getDeleteChatIDsResponse(): Promise<any> {
    return await this.page.waitForResponse(
      response => response.url().includes('/livestream/chat/delete/'),
      { timeout: 5000 }
    );
  }

  async deleteMessage(messageText: string) {
    const message = this.page.locator(`.message-item:has-text("${messageText}")`);
    await message.click();
    await this.page.locator('.context-menu-item.delete-item').click();
  }

  async getVisibilityBadge(): Promise<string | null> {
    const publicBadge = this.page.locator('.badge-public');
    const memberBadge = this.page.locator('.badge-member');

    if (await publicBadge.isVisible()) return 'public';
    if (await memberBadge.isVisible()) return 'member_only';
    return null;
  }

  /**
   * Get current viewer count from the badge
   */
  async getViewerCount(): Promise<number> {
    const badge = this.page.locator('.view-count-badge');
    await badge.waitFor({ state: 'visible', timeout: 5000 });
    const text = await badge.textContent();
    // Extract number from text like "👁 5" or "5 viewers"
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Get anonymous ID from localStorage
   */
  async getAnonymousIdFromLocalStorage(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('viewer_id');
    });
  }

  /**
   * Set anonymous ID in localStorage
   */
  async setAnonymousIdInLocalStorage(id: string): Promise<void> {
    await this.page.evaluate((viewerId) => {
      localStorage.setItem('viewer_id', viewerId);
    }, id);
  }

  /**
   * Clear anonymous ID from localStorage
   */
  async clearAnonymousIdFromLocalStorage(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.removeItem('viewer_id');
    });
  }

  /**
   * Wait for viewer count to reach expected value
   */
  async waitForViewerCountUpdate(expectedCount: number, timeout: number = 10000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const currentCount = await this.getViewerCount();
      if (currentCount === expectedCount) {
        return;
      }
      await this.page.waitForTimeout(1000);
    }
    throw new Error(`Viewer count did not reach ${expectedCount} within ${timeout}ms`);
  }

  /**
   * Wait for ping-viewer-count API call with anonymous_id query parameter
   */
  async waitForViewerPingWithAnonymousId(): Promise<string | null> {
    const response = await this.page.waitForResponse(
      response => response.url().includes('/ping-viewer-count/') && response.url().includes('anonymous_id='),
      { timeout: 10000 }
    );

    // Extract anonymous_id from URL
    const url = new URL(response.url());
    return url.searchParams.get('anonymous_id');
  }
}
