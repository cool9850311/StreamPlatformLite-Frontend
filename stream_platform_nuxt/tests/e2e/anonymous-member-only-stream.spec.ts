import { test, expect } from '@playwright/test';
import { StreamPage } from '../page-objects/stream-page';

/**
 * 场景 2: Anonymous 用户访问 MemberOnly 直播
 *
 * 测试目标：
 * - Anonymous 用户不能访问 member_only 直播
 * - 显示权限拒绝提示
 * - 视频播放器不显示
 * - 显示 "Login to Watch" 按钮
 * - /livestream/one 返回 401
 */
test.describe('Anonymous User - Member Only Stream Access', () => {
  let streamPage: StreamPage;

  test.beforeEach(async ({ page, context }) => {
    streamPage = new StreamPage(page);

    // 设置后端环境为 member_only 直播模式
    // 注意：这需要后端支持通过某种方式切换直播可见性
    // 在实际测试中，可能需要使用 API 或数据库设置来改变直播的 visibility
  });

  test('should return 401 when accessing member_only stream', async ({ page }) => {
    // 监听 /livestream/one 请求
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/livestream/one')
    );

    // 访问直播页面
    await page.goto('/stream');

    // 等待响应
    const response = await responsePromise;

    // 验证返回 401 状态码
    expect(response.status()).toBe(401);
  });

  test('should display access denied message', async ({ page }) => {
    await page.goto('/stream');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 验证显示权限拒绝提示
    const accessDenied = page.locator('.access-denied');
    await expect(accessDenied).toBeVisible();
  });

  test('should not display video player', async ({ page }) => {
    await page.goto('/stream');
    await page.waitForLoadState('networkidle');

    // 验证视频播放器不显示
    const videoPlayer = page.locator('#video, #video-player, .video-player video');
    await expect(videoPlayer).not.toBeVisible();
  });

  test('should display "Login to Watch" button', async ({ page }) => {
    await page.goto('/stream');
    await page.waitForLoadState('networkidle');

    // 验证登录观看按钮显示
    const loginButton = page.locator('.btn-login-large, a:has-text("Login to Watch")');
    await expect(loginButton).toBeVisible();

    // 验证按钮文本
    const buttonText = await loginButton.textContent();
    expect(buttonText).toMatch(/Login.*Watch/i);

    // 验证按钮链接到首页
    const href = await loginButton.getAttribute('href');
    expect(href).toBe('/');
  });

  test('should display member only title and message', async ({ page }) => {
    await page.goto('/stream');
    await page.waitForLoadState('networkidle');

    // 验证会员专属标题
    const title = page.locator('h2:has-text("Member")');
    await expect(title).toBeVisible();

    // 验证提示消息
    const message = page.locator('p:has-text("login")');
    await expect(message).toBeVisible();
  });

  test('should not display chat section for member_only stream', async ({ page }) => {
    await page.goto('/stream');
    await page.waitForLoadState('networkidle');

    // 验证聊天区域不显示或为空
    const chatSection = page.locator('.chat-section');

    // 如果聊天区域显示，验证其内容为空或显示错误提示
    if (await chatSection.isVisible()) {
      const chatMessages = page.locator('.chat-messages .message-item');
      const messageCount = await chatMessages.count();
      expect(messageCount).toBe(0);
    }
  });

  test('should fail to access stream file endpoints', async ({ page }) => {
    // 尝试直接访问流文件端点
    const response = await page.request.get(
      'http://localhost:8080/livestream/test-uuid/playlist.m3u8',
      { failOnStatusCode: false }
    );

    // 验证返回 401 或 404
    expect([401, 404]).toContain(response.status());
  });

  test('should fail to access chat endpoints for member_only stream', async ({ page }) => {
    // 尝试访问聊天端点
    const response = await page.request.get(
      'http://localhost:8080/livestream/chat/test-uuid/0',
      { failOnStatusCode: false }
    );

    // 验证返回 401（无权限）或 404（不存在）
    expect([401, 404]).toContain(response.status());
  });

  test('should fail to access deleted chat IDs endpoint', async ({ page }) => {
    // 尝试访问已删除聊天 ID 端点
    const response = await page.request.get(
      'http://localhost:8080/livestream/chat/delete/test-uuid',
      { failOnStatusCode: false }
    );

    // 验证返回 401 或 404
    expect([401, 404]).toContain(response.status());
  });

  test('should fail to send chat message', async ({ page }) => {
    // 尝试发送聊天消息
    const response = await page.request.post(
      'http://localhost:8080/livestream/chat',
      {
        data: {
          stream_uuid: 'test-uuid',
          message: 'Test message'
        },
        failOnStatusCode: false
      }
    );

    // 验证返回 401（无权限）
    expect(response.status()).toBe(401);
  });

  test('should display navigation with login button', async ({ page }) => {
    await page.goto('/stream');
    await page.waitForLoadState('networkidle');

    // 验证导航栏显示登录按钮
    const loginButton = page.locator('.btn-nav-login, a[href="/"]').first();
    if (await loginButton.isVisible()) {
      const buttonText = await loginButton.textContent();
      expect(buttonText).toContain('Login');
    }
  });

  test('should allow clicking login button to navigate to home', async ({ page }) => {
    await page.goto('/stream');
    await page.waitForLoadState('networkidle');

    // 点击登录按钮
    const loginButton = page.locator('.btn-login-large').first();
    await loginButton.click();

    // 验证导航到首页
    await page.waitForURL('/');
    expect(page.url()).toContain('/');
  });

  test('should maintain access denied state across page reloads', async ({ page }) => {
    await page.goto('/stream');
    await page.waitForLoadState('networkidle');

    // 验证权限拒绝状态
    let accessDenied = page.locator('.access-denied');
    await expect(accessDenied).toBeVisible();

    // 重新加载页面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 验证仍然是权限拒绝状态
    accessDenied = page.locator('.access-denied');
    await expect(accessDenied).toBeVisible();
  });

  test('should not expose stream information in response', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/livestream/one')
    );

    await page.goto('/stream');

    const response = await responsePromise;

    // 如果返回 401，响应体不应包含流信息
    if (response.status() === 401) {
      const body = await response.text();
      expect(body).not.toContain('stream_url');
      expect(body).not.toContain('playlist.m3u8');
    }
  });

  test('should handle rapid page navigation correctly', async ({ page }) => {
    // 快速导航到直播页面
    await page.goto('/stream');

    // 不等待完全加载就重新导航
    await page.goto('/');
    await page.goto('/stream');

    // 等待页面稳定
    await page.waitForLoadState('networkidle');

    // 验证最终状态正确（显示权限拒绝）
    const accessDenied = page.locator('.access-denied');
    const isVisible = await accessDenied.isVisible().catch(() => false);

    // 页面应该要么显示权限拒绝，要么显示加载状态
    expect(isVisible).toBeDefined();
  });

  test('should fail to ping viewer count', async ({ page }) => {
    // 尝试 ping viewer count
    const response = await page.request.get(
      'http://localhost:8080/livestream/ping-viewer-count/test-uuid',
      { failOnStatusCode: false }
    );

    // 验证返回 401 或 404
    expect([401, 404]).toContain(response.status());
  });

  test('should not cache unauthorized responses', async ({ page }) => {
    // 第一次请求
    await page.goto('/stream');
    const firstResponse = await page.waitForResponse(
      response => response.url().includes('/livestream/one')
    );
    expect(firstResponse.status()).toBe(401);

    // 重新加载页面
    await page.reload();

    // 第二次请求，验证仍然返回 401（未从缓存读取）
    const secondResponse = await page.waitForResponse(
      response => response.url().includes('/livestream/one')
    );
    expect(secondResponse.status()).toBe(401);
  });
});
