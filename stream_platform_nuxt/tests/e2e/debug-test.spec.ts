import { test, expect } from '@playwright/test';

test('debug anonymous ID generation', async ({ page }) => {
  // Listen to all network requests
  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    console.log(`Response: ${status} ${url}`);
  });

  page.on('console', msg => {
    console.log(`Browser console: ${msg.text()}`);
  });

  // Clear and navigate
  await page.goto('/stream');
  await page.evaluate(() => localStorage.clear());

  await page.goto('/stream');
  await page.waitForResponse(
    response => response.url().includes('/livestream/one'),
    { timeout: 10000 }
  );

  // Wait for async code to execute
  await page.waitForTimeout(8000);

  const anonymousId = await page.evaluate(() => {
    return localStorage.getItem('viewer_id');
  });
  console.log(`Anonymous ID in localStorage: ${anonymousId}`);
});
