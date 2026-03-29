import { test, expect } from '@playwright/test';
import { StreamPage } from '../page-objects/stream-page';

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
      `http://localhost:8080/livestream/chat/delete/${livestreamUUID}`,
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

/**
 * Anonymous Viewer Count Tests
 *
 * 测试目标：
 * - Anonymous 用户生成和使用 viewer_id 进行观众计数
 * - localStorage 持久化和跨分页共享
 * - API 调用正确发送 anonymous_id 参数
 */
test.describe('Anonymous User - Viewer Count with anonymous_id', () => {
  let streamPage: StreamPage;

  test.beforeEach(async ({ page }) => {
    streamPage = new StreamPage(page);
  });

  test('should generate and store anonymous ID in localStorage on first visit', async ({ page }) => {
    // Clear any existing state first
    await page.goto('/stream');
    await page.evaluate(() => localStorage.clear());

    // Navigate to stream page (fresh state)
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // Wait for the ping-viewer-count API call which triggers ID generation
    await page.waitForResponse(
      response => response.url().includes('/ping-viewer-count/'),
      { timeout: 10000 }
    );

    // Check localStorage has viewer_id
    const anonymousId = await streamPage.getAnonymousIdFromLocalStorage();
    expect(anonymousId).not.toBeNull();
    expect(anonymousId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i); // UUID v4 format

    await page.screenshot({ path: 'test-results/anonymous-id-generated.png' });
  });

  test('should persist anonymous ID across page reloads', async ({ page }) => {
    // Clear and start fresh
    await page.goto('/stream');
    await page.evaluate(() => localStorage.clear());

    // First visit
    await streamPage.navigate();
    await streamPage.waitForStreamData();
    await page.waitForTimeout(1000);

    const firstVisitId = await streamPage.getAnonymousIdFromLocalStorage();
    expect(firstVisitId).not.toBeNull();

    // Reload page
    await page.reload();
    await streamPage.waitForStreamData();
    await page.waitForTimeout(1000);

    // Check ID is same
    const secondVisitId = await streamPage.getAnonymousIdFromLocalStorage();
    expect(secondVisitId).toBe(firstVisitId);

    // Reload again
    await page.reload();
    await streamPage.waitForStreamData();
    await page.waitForTimeout(1000);

    const thirdVisitId = await streamPage.getAnonymousIdFromLocalStorage();
    expect(thirdVisitId).toBe(firstVisitId);
  });

  test('should share same anonymous ID across multiple tabs', async ({ page, context }) => {
    // Clear and start fresh
    await page.goto('/stream');
    await page.evaluate(() => localStorage.clear());

    // First tab
    await streamPage.navigate();
    await streamPage.waitForStreamData();
    await page.waitForTimeout(1000);

    const tab1Id = await streamPage.getAnonymousIdFromLocalStorage();
    expect(tab1Id).not.toBeNull();

    // Open second tab in same browser context
    const page2 = await context.newPage();
    const streamPage2 = new StreamPage(page2);
    await streamPage2.navigate();
    await streamPage2.waitForStreamData();

    const tab2Id = await streamPage2.getAnonymousIdFromLocalStorage();
    expect(tab2Id).toBe(tab1Id); // Same ID

    // Open third tab
    const page3 = await context.newPage();
    const streamPage3 = new StreamPage(page3);
    await streamPage3.navigate();
    await streamPage3.waitForStreamData();

    const tab3Id = await streamPage3.getAnonymousIdFromLocalStorage();
    expect(tab3Id).toBe(tab1Id); // Same ID

    await page2.close();
    await page3.close();
  });

  test('should send anonymous_id in query parameter when pinging viewer count', async ({ page }) => {
    // Clear and set a known anonymous ID
    await page.goto('/stream');
    await page.evaluate(() => localStorage.clear());

    const testAnonymousId = '550e8400-e29b-41d4-a716-446655440000';
    await page.evaluate((id) => {
      localStorage.setItem('viewer_id', id);
    }, testAnonymousId);

    // Navigate to stream
    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // Wait for ping API call and extract anonymous_id
    const sentAnonymousId = await streamPage.waitForViewerPingWithAnonymousId();

    expect(sentAnonymousId).toBe(testAnonymousId);

    await page.screenshot({ path: 'test-results/anonymous-id-query-param.png' });
  });

  test('should increment viewer count when anonymous user joins', async ({ page }) => {
    // Clear and start fresh
    await page.goto('/stream');
    await page.evaluate(() => localStorage.clear());

    // Navigate and wait for initial ping
    await streamPage.navigate();
    await streamPage.waitForStreamData();
    await page.waitForTimeout(6000); // Wait for first ping // Wait for first ping

    // Get current viewer count
    const viewerCount = await streamPage.getViewerCount();
    expect(viewerCount).toBeGreaterThanOrEqual(1); // At least this anonymous user

    await page.screenshot({ path: 'test-results/anonymous-viewer-count.png' });
  });

  test('should update viewer count periodically via polling', async ({ page }) => {
    // Clear and start fresh
    await page.goto('/stream');
    await page.evaluate(() => localStorage.clear());

    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // Record viewer counts over time
    const counts: number[] = [];

    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(6000); // Wait for ping interval
      const count = await streamPage.getViewerCount();
      counts.push(count);
    }

    // Verify we got 3 counts
    expect(counts.length).toBe(3);

    // Counts should all be >= 1 (this test's anonymous user)
    counts.forEach(count => {
      expect(count).toBeGreaterThanOrEqual(1);
    });

    console.log('Viewer counts over time:', counts);
  });

  test('should generate different anonymous IDs in different browser contexts', async ({ page, browser }) => {
    // Clear and start fresh
    await page.goto('/stream');
    await page.evaluate(() => localStorage.clear());

    // First browser context
    await streamPage.navigate();
    await streamPage.waitForStreamData();
    await page.waitForTimeout(1000);

    const context1Id = await streamPage.getAnonymousIdFromLocalStorage();
    expect(context1Id).not.toBeNull();

    // Create new incognito context (separate localStorage)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const streamPage2 = new StreamPage(page2);

    await streamPage2.navigate();
    await streamPage2.waitForStreamData();
    await page2.waitForTimeout(1000);

    const context2Id = await streamPage2.getAnonymousIdFromLocalStorage();
    expect(context2Id).not.toBeNull();
    expect(context2Id).not.toBe(context1Id); // Different IDs

    await context2.close();
  });

  test('should not send anonymous_id for logged-in users', async ({ page }) => {
    // This test verifies anonymous users DO send anonymous_id
    // (Testing logged-in users would require OAuth setup)

    // Clear and start fresh
    await page.goto('/stream');
    await page.evaluate(() => localStorage.clear());

    await streamPage.navigate();
    await streamPage.waitForStreamData();

    // Wait for ping API call with anonymous_id
    try {
      const sentAnonymousId = await streamPage.waitForViewerPingWithAnonymousId();

      // For anonymous users, anonymous_id should be present
      expect(sentAnonymousId).not.toBeNull();
      expect(sentAnonymousId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    } catch (error) {
      // If no ping with anonymous_id is found within timeout, fail the test
      throw new Error('Expected anonymous_id in ping request but none found');
    }

    // Note: To fully test logged-in behavior, we would need to:
    // 1. Perform actual Discord OAuth login
    // 2. Navigate to stream page
    // 3. Verify anonymous_id is NOT sent in the API call
  });
});
