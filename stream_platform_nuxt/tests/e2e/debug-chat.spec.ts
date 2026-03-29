import { test, expect } from '@playwright/test';
import { StreamPage } from '../page-objects/stream-page';
import { JWTHelper } from '../helpers/jwt-helper';

test('Debug chat message sending for User', async ({ context, page }) => {
  // Listen to console messages
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  // Listen to all network requests
  page.on('request', request => {
    if (request.url().includes('/livestream/chat')) {
      console.log('REQUEST:', request.method(), request.url());
      console.log('REQUEST HEADERS:', JSON.stringify(request.headers(), null, 2));
      console.log('REQUEST BODY:', request.postData());
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/livestream/chat')) {
      console.log('RESPONSE:', response.status(), response.url());
      const body = await response.text().catch(() => '');
      console.log('RESPONSE BODY:', body);
    }
  });

  // Set User token
  const jwtHelper = new JWTHelper();
  await context.addCookies([{
    name: 'token',
    value: jwtHelper.generateUserToken(),
    domain: 'localhost',
    path: '/',
  }]);

  const streamPage = new StreamPage(page);
  await streamPage.navigate();
  await streamPage.waitForStreamData();

  // Wait a bit to see initial chat fetches
  await page.waitForTimeout(2000);

  console.log('=== ATTEMPTING TO SEND MESSAGE ===');

  // Generate unique message
  const testMessage = `Debug test ${Date.now()}`;

  // Send message
  const input = page.locator('.chat-input-field');
  await input.fill(testMessage);

  console.log('Input filled with:', testMessage);

  await input.press('Enter');

  console.log('Enter key pressed');

  // Wait to see what happens
  await page.waitForTimeout(3000);

  console.log('=== CHECKING IF MESSAGE APPEARED ===');

  // Check if message is in the chat list
  const messages = await page.locator('.message-item').all();
  console.log('Total messages in chat:', messages.length);

  for (let i = 0; i < messages.length; i++) {
    const text = await messages[i].textContent();
    console.log(`Message ${i}:`, text);
  }

  await page.waitForTimeout(500);
});
