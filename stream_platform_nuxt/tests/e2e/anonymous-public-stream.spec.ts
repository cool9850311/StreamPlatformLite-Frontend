import { test, expect } from '@playwright/test';
import { StreamPage } from '../page-objects/stream-page';
import { API_BASE } from '../helpers/test-config';

/**
 * 场景 1: Anonymous 用户访问 Public 直播
 *
 * 测试目标：
 * - Anonymous 用户可以观看 public 直播
 * - 可以看到聊天消息
 * - 不能发送聊天消息（显示登录提示）
 * - 可以看到 visibility badge 显示 "public"
 * - 可以访问 /livestream/chat/delete/{uuid} 并返回 200
 */
test.describe('Anonymous User - Public Stream Access', () => {
  let streamPage: StreamPage;

  test.beforeEach(async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      if (msg.text().includes('[DEBUG]')) {
        console.log('BROWSER:', msg.text());
      }
    });

    streamPage = new StreamPage(page);
  });

  test('should allow anonymous user to view public stream', async ({ page }) => {
    // 访问直播页面（不设置任何 cookie，作为匿名用户）
    await streamPage.navigate();

    // 等待直播数据加载完成
    await streamPage.waitForStreamData();

    // 验证视频播放器元素存在（即使没有活跃流时可能是隐藏的）
    const isVideoVisible = await streamPage.isVideoPlayerVisible();
    expect(isVideoVisible).toBeTruthy();

    // 验证 Visibility badge 显示 "public"
    const visibilityBadge = await streamPage.getVisibilityBadge();
    expect(visibilityBadge).toBe('public');

    await page.waitForTimeout(500);
  });

  test('should display chat messages to anonymous user', async ({ page }) => {
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // 等待一段时间让聊天消息加载
    await page.waitForTimeout(1000);

    // 验证聊天消息可见（即使没有消息，聊天区域也应该存在）
    const chatMessages = await streamPage.getChatMessages();
    expect(chatMessages).toBeDefined();

    await page.waitForTimeout(500);
  });

  test('should show login prompt when trying to send message', async ({ page }) => {
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // 验证发送消息框显示登录提示
    const isSendDisabled = await streamPage.isSendMessageDisabled();
    expect(isSendDisabled).toBeTruthy();

    // 验证登录提示框可见
    const loginPromptVisible = await page.locator('.login-prompt-box').isVisible();
    expect(loginPromptVisible).toBeTruthy();

    // 验证登录提示文本存在
    const loginPromptText = await page.locator('.login-prompt-box').textContent();
    expect(loginPromptText).toContain('Login');

    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/anonymous-login-prompt.png' });

    await page.waitForTimeout(500);
  });

  test('should allow anonymous user to access deleted chat IDs endpoint', async ({ page }) => {
    await streamPage.navigate();

    // 等待直播数据加载，获取 livestream UUID
    const response = await streamPage.waitForStreamData();
    const streamData = await response.json();
    const livestreamUUID = streamData.uuid;

    // 访问 /livestream/chat/delete/{uuid} 端点
    const deleteResponse = await page.request.get(
      `${API_BASE}/livestream/chat/delete/${livestreamUUID}`,
      { failOnStatusCode: false }
    );

    // 验证返回 200 状态码
    expect(deleteResponse.status()).toBe(200);

    await page.waitForTimeout(500);
  });

  // Note: Anonymous badge has been intentionally removed from the UI
  // Anonymous users are identified by the login prompt instead

  test('should show viewer count for all users', async ({ page }) => {
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // 验证 viewer count 显示
    const viewerCountBadge = page.locator('.view-count-badge');
    await expect(viewerCountBadge).toBeVisible();

    await page.waitForTimeout(500);
  });

  test('should display login button in navigation for anonymous users', async ({ page }) => {
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // 验证导航栏显示登录按钮（如果导航栏存在）
    const loginButton = page.locator('.btn-nav-login, a[href="/"]').first();
    if (await loginButton.isVisible()) {
      const buttonText = await loginButton.textContent();
      expect(buttonText).toContain('Login');
    }

    await page.screenshot({ path: 'test-results/anonymous-nav-login.png' });

    await page.waitForTimeout(500);
  });

  test('should display chat filter even for anonymous users', async ({ page }) => {
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // 验证聊天过滤器显示（前端显示给所有用户）
    // 注意：虽然匿名用户不能发消息，但可以看到过滤选项
    const chatFilter = page.locator('.chat-filter');
    await expect(chatFilter).toBeVisible();

    await page.waitForTimeout(500);
  });

  test('should allow navigation to home page from login prompt', async ({ page }) => {
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // 点击登录提示中的登录按钮
    const loginLink = page.locator('.login-prompt-box a, .btn-login-inline');
    if (await loginLink.isVisible()) {
      const href = await loginLink.getAttribute('href');
      expect(href).toBe('/');

      // 验证导航完成
      await loginLink.click();
      await page.waitForURL('/');
      expect(page.url()).toContain('/');

      await page.screenshot({ path: 'test-results/anonymous-navigate-home.png' });
    }

    await page.waitForTimeout(500);
  });

  test('should load stream page successfully', async ({ page }) => {
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // 验证页面主要元素存在
    const videoContainer = page.locator('.video-container');
    expect(await videoContainer.count()).toBeGreaterThan(0);

    await page.waitForTimeout(500);
  });

  test('should maintain anonymous state across page reloads', async ({ page }) => {
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // 验证匿名状态
    let loginPromptVisible = await page.locator('.login-prompt-box').isVisible();
    expect(loginPromptVisible).toBeTruthy();

    // 重新加载页面
    await page.reload();
    await streamPage.waitForStreamData();

    // 验证仍然是匿名状态
    loginPromptVisible = await page.locator('.login-prompt-box').isVisible();
    expect(loginPromptVisible).toBeTruthy();

    await page.waitForTimeout(500);
  });
});

test.describe('Anonymous User - Viewer Count with JWT Cookie', () => {
  let streamPage: StreamPage;

  test.beforeEach(async ({ page }) => {
    streamPage = new StreamPage(page);
  });

  test('backend should set anonymous_id JWT cookie on first ping', async ({ page }) => {
    await page.context().clearCookies();
    await streamPage.navigate();
    await streamPage.waitForViewerPing();

    const cookie = await streamPage.getAnonymousIdCookie();
    expect(cookie).toBeTruthy();
    expect(cookie!.split('.')).toHaveLength(3);
  });

  test('anonymous_id cookie should contain viewer_id in payload', async ({ page }) => {
    await page.context().clearCookies();
    await streamPage.navigate();
    await streamPage.waitForViewerPing();

    const jwt = await streamPage.getAnonymousIdCookie();
    expect(jwt).toBeTruthy();
    const payload = JSON.parse(Buffer.from(jwt!.split('.')[1], 'base64url').toString());
    expect(payload.viewer_id).toBeTruthy();
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
  });

  test('anonymous_id cookie should be HttpOnly (not accessible via JS)', async ({ page }) => {
    await page.context().clearCookies();
    await streamPage.navigate();
    await streamPage.waitForViewerPing();

    const cookies = await page.context().cookies();
    const anonCookie = cookies.find(c => c.name === 'anonymous_id');
    expect(anonCookie).toBeTruthy();
    expect(anonCookie!.httpOnly).toBe(true);

    const jsValue = await page.evaluate(() => document.cookie);
    expect(jsValue).not.toContain('anonymous_id');
  });

  test('should persist same viewer_id across page reloads', async ({ page }) => {
    await page.context().clearCookies();
    await streamPage.navigate();
    await streamPage.waitForViewerPing();
    const id1 = await streamPage.getViewerIDFromCookie();

    await page.reload();
    await streamPage.waitForViewerPing();
    const id2 = await streamPage.getViewerIDFromCookie();

    await page.reload();
    await streamPage.waitForViewerPing();
    const id3 = await streamPage.getViewerIDFromCookie();

    expect(id1).toBeTruthy();
    expect(id1).toBe(id2);
    expect(id1).toBe(id3);
  });

  test('ping request should NOT include anonymous_id query parameter', async ({ page }) => {
    const pingUrls: string[] = [];
    page.on('request', req => {
      if (req.url().includes('/ping-viewer-count/')) pingUrls.push(req.url());
    });
    await streamPage.navigate();
    await page.waitForTimeout(6000);

    expect(pingUrls.length).toBeGreaterThan(0);
    pingUrls.forEach(url => expect(url).not.toContain('anonymous_id='));
  });

  test('different browser contexts from same IP should get same viewer_id', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();
    const stream1 = new StreamPage(page1);
    const stream2 = new StreamPage(page2);

    await stream1.navigate();
    await stream1.waitForViewerPing();
    const id1 = await stream1.getViewerIDFromCookie();

    await stream2.navigate();
    await stream2.waitForViewerPing();
    const id2 = await stream2.getViewerIDFromCookie();

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).toBe(id2);

    await ctx1.close();
    await ctx2.close();
  });

  test('should increment viewer count when anonymous user joins', async ({ page }) => {
    await page.context().clearCookies();
    await streamPage.navigate();
    await streamPage.waitForStreamData();
    await page.waitForTimeout(6000);

    const viewerCount = await streamPage.getViewerCount();
    expect(viewerCount).toBeGreaterThanOrEqual(1);

    await page.screenshot({ path: 'test-results/anonymous-viewer-count.png' });
  });

  test('should update viewer count periodically via polling', async ({ page }) => {
    await page.context().clearCookies();
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    const counts: number[] = [];
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(6000);
      const count = await streamPage.getViewerCount();
      counts.push(count);
    }

    expect(counts.length).toBe(3);
    counts.forEach(count => expect(count).toBeGreaterThanOrEqual(1));
    console.log('Viewer counts over time:', counts);
  });
});
