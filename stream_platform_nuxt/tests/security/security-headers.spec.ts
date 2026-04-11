import { test, expect } from '@playwright/test';

const TEST_MODE = process.env.TEST_MODE || 'development';
const isHTTPS = TEST_MODE === 'production-https';

// In dev mode, hit backend directly. In HTTPS mode, go through proxy.
const API_BASE = isHTTPS ? 'https://localtest.me/api' : 'http://localhost:8080';
const FRONTEND_BASE = isHTTPS ? 'https://localtest.me' : 'http://localhost:3000';

test.describe('Security Headers - Backend', () => {
  test('Backend should include X-Content-Type-Options', async ({ request }) => {
    const response = await request.get(`${API_BASE}/me`);
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('Backend should include X-Frame-Options', async ({ request }) => {
    const response = await request.get(`${API_BASE}/me`);
    const headers = response.headers();
    expect(headers['x-frame-options']).toBe('DENY');
  });

  test('Backend should include X-XSS-Protection', async ({ request }) => {
    const response = await request.get(`${API_BASE}/me`);
    const headers = response.headers();
    expect(headers['x-xss-protection']).toBe('1; mode=block');
  });

  test('Backend should include Referrer-Policy', async ({ request }) => {
    const response = await request.get(`${API_BASE}/me`);
    const headers = response.headers();
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('Backend should include Permissions-Policy', async ({ request }) => {
    const response = await request.get(`${API_BASE}/me`);
    const headers = response.headers();
    expect(headers['permissions-policy']).toBeDefined();
    const policy = headers['permissions-policy'];
    expect(policy).toContain('geolocation=()');
    expect(policy).toContain('microphone=()');
    expect(policy).toContain('camera=()');
  });

  test('Backend API should include strict CSP', async ({ request }) => {
    const response = await request.get(`${API_BASE}/me`);
    const headers = response.headers();
    const csp = headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test('Backend should NOT include HSTS in development mode', async ({ request }) => {
    test.skip(isHTTPS, 'HSTS is expected in HTTPS mode');
    const response = await request.get(`${API_BASE}/me`);
    const headers = response.headers();
    expect(headers['strict-transport-security']).toBeUndefined();
  });

  test('Backend should include HSTS in HTTPS mode', async ({ request }) => {
    test.skip(!isHTTPS, 'HSTS only expected in HTTPS mode');
    const response = await request.get(`${API_BASE}/me`);
    const headers = response.headers();
    expect(headers['strict-transport-security']).toBeDefined();
    expect(headers['strict-transport-security']).toContain('max-age=31536000');
    expect(headers['strict-transport-security']).toContain('includeSubDomains');
  });
});

test.describe('Security Headers - Frontend', () => {
  test('Frontend should include CSP header', async ({ page }) => {
    const response = await page.goto(FRONTEND_BASE);
    const headers = await response?.headers();
    expect(headers?.['content-security-policy']).toBeDefined();
    const csp = headers?.['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('script-src');
  });

  test('Frontend CSP script-src should use strict-dynamic with nonce in HTTPS mode', async ({ page }) => {
    test.skip(!isHTTPS, 'strict-dynamic only tested in HTTPS mode');
    const response = await page.goto(FRONTEND_BASE);
    const headers = await response?.headers();
    const csp = headers?.['content-security-policy'];
    // strict-dynamic + nonce must be present in script-src
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toMatch(/nonce-[A-Za-z0-9+/=]{8,}/);
  });

  test('Frontend CSP style-src should use unsafe-inline (not nonce)', async ({ request }) => {
    const response = await request.get(FRONTEND_BASE + '/');
    const csp = response.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    // style-src must allow unsafe-inline so runtime CSS injection from packages works
    expect(csp).toMatch(/style-src[^;]*'unsafe-inline'/);
    // nonce must NOT appear in style-src (nonces cannot reach runtime-injected <style> tags)
    const styleSrcMatch = csp.match(/style-src([^;]*)/);
    expect(styleSrcMatch?.[1]).not.toMatch(/nonce-/);
  });

  test('Frontend CSP should block style attribute injection via style-src-attr: none', async ({ request }) => {
    const response = await request.get(FRONTEND_BASE + '/');
    const csp = response.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    // style-src-attr: 'none' blocks CSS if()-based exfiltration attack (PortSwigger 2025)
    expect(csp).toMatch(/style-src-attr\s+'none'/);
  });

  test('Frontend should include X-Frame-Options from proxy in HTTPS mode', async ({ page }) => {
    test.skip(!isHTTPS, 'X-Frame-Options on frontend only tested via proxy in HTTPS mode');
    const response = await page.goto(FRONTEND_BASE);
    const headers = await response?.headers();
    expect(headers?.['x-frame-options']).toBe('DENY');
  });

  test('Frontend should include HSTS in HTTPS mode', async ({ page }) => {
    test.skip(!isHTTPS, 'HSTS only in HTTPS mode');
    const response = await page.goto(FRONTEND_BASE);
    const headers = await response?.headers();
    expect(headers?.['strict-transport-security']).toBeDefined();
    expect(headers?.['strict-transport-security']).toContain('max-age=31536000');
    expect(headers?.['strict-transport-security']).toContain('includeSubDomains');
  });

  test('Frontend should include X-Content-Type-Options from proxy in HTTPS mode', async ({ page }) => {
    test.skip(!isHTTPS, 'proxy headers only tested in HTTPS mode');
    const response = await page.goto(FRONTEND_BASE);
    const headers = await response?.headers();
    expect(headers?.['x-content-type-options']).toBe('nosniff');
  });

  test('Frontend should include Referrer-Policy from proxy in HTTPS mode', async ({ page }) => {
    test.skip(!isHTTPS, 'proxy headers only tested in HTTPS mode');
    const response = await page.goto(FRONTEND_BASE);
    const headers = await response?.headers();
    expect(headers?.['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('CSP should allow Discord CDN images', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE}/stream`);
    const cspErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspErrors.push(msg.text());
      }
    });
    await page.waitForTimeout(2000);
    const discordCspError = cspErrors.find(err => err.includes('cdn.discordapp.com'));
    expect(discordCspError).toBeUndefined();
  });

  test('Frontend CSP script-src should include blob: for HLS.js worker', async ({ request }) => {
    const response = await request.get(FRONTEND_BASE + '/');
    const csp = response.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toMatch(/script-src[^;]*blob:/);
  });

  test('Frontend CSP should include media-src with blob: for HLS.js MSE', async ({ request }) => {
    const response = await request.get(FRONTEND_BASE + '/');
    const csp = response.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toMatch(/media-src[^;]*blob:/);
  });

  test('Plyr SVG sprite should be served from same origin', async ({ request }) => {
    test.skip(!isHTTPS, 'HTTPS mode only — static file serving verified through Caddy');
    const response = await request.get(FRONTEND_BASE + '/plyr.svg');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('<svg');
  });
});
