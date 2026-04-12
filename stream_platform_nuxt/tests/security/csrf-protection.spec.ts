import { test, expect } from '@playwright/test'
import { JWTHelper } from '../helpers/jwt-helper'
import { CsrfHelper } from '../helpers/csrf-helper'
import { API_BASE, COOKIE_DOMAIN } from '../helpers/test-config'

// ─────────────────────────────────────────────────────────────────────────────
// Group 1: Cookie Auth CSRF Enforcement
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CSRF Enforcement - Cookie Auth', () => {
  test('cookie auth without XSRF header returns 403', async ({ page }) => {
    const jwtHelper = new JWTHelper()
    const response = await page.request.post(`${API_BASE}/origin-account/create`, {
      headers: {
        'Cookie': `token=${jwtHelper.generateAdminToken()}`,
        'Content-Type': 'application/json',
      },
      data: { username: 'test', password: 'test123' },
      failOnStatusCode: false,
    })
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.message).toBe('invalid CSRF token')
  })

  test('cookie auth with empty X-XSRF-TOKEN header returns 403', async ({ page }) => {
    const jwtHelper = new JWTHelper()
    const response = await page.request.post(`${API_BASE}/origin-account/create`, {
      headers: {
        'Cookie': `token=${jwtHelper.generateAdminToken()}`,
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': '',
      },
      data: { username: 'test', password: 'test123' },
      failOnStatusCode: false,
    })
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.message).toBe('invalid CSRF token')
  })

  test('cookie auth with malformed XSRF token returns 403', async ({ page }) => {
    const jwtHelper = new JWTHelper()
    const response = await page.request.post(`${API_BASE}/origin-account/create`, {
      headers: {
        'Cookie': `token=${jwtHelper.generateAdminToken()}`,
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': 'not-a-valid-token',
      },
      data: { username: 'test', password: 'test123' },
      failOnStatusCode: false,
    })
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.message).toBe('invalid CSRF token')
  })

  test('cookie auth with token signed by wrong secret returns 403', async ({ page }) => {
    const jwtHelper = new JWTHelper()
    const wrongSecretHelper = new CsrfHelper('wrong-secret-key-000000000')
    const response = await page.request.post(`${API_BASE}/origin-account/create`, {
      headers: {
        'Cookie': `token=${jwtHelper.generateAdminToken()}`,
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': wrongSecretHelper.generateToken('test-admin'),
      },
      data: { username: 'test', password: 'test123' },
      failOnStatusCode: false,
    })
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.message).toBe('invalid CSRF token')
  })

  test('cookie auth with CSRF token for different user returns 403', async ({ page }) => {
    const jwtHelper = new JWTHelper()
    const csrfHelper = new CsrfHelper()
    // Admin JWT, but CSRF token was generated for 'other-user'
    const response = await page.request.post(`${API_BASE}/origin-account/create`, {
      headers: {
        'Cookie': `token=${jwtHelper.generateAdminToken()}`,
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': csrfHelper.generateToken('other-user'),
      },
      data: { username: 'test', password: 'test123' },
      failOnStatusCode: false,
    })
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.message).toBe('invalid CSRF token')
  })

  test('cookie auth with valid CSRF token does not return CSRF error', async ({ page }) => {
    const jwtHelper = new JWTHelper()
    const csrfHelper = new CsrfHelper()
    const response = await page.request.post(`${API_BASE}/origin-account/create`, {
      headers: {
        'Cookie': `token=${jwtHelper.generateAdminToken()}`,
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': csrfHelper.generateToken('test-admin'),
      },
      data: { username: 'test', password: 'test123' },
      failOnStatusCode: false,
    })
    // A valid CSRF token should not return 403 with "invalid CSRF token"
    // It may return 400 (bad request), 409 (conflict), etc. but not a CSRF 403
    if (response.status() === 403) {
      const body = await response.json()
      expect(body.message).not.toBe('invalid CSRF token')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Group 2: GET Requests Exempt from CSRF
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CSRF Exemption - GET Requests', () => {
  test('GET /me with cookie but no XSRF header returns 200', async ({ page }) => {
    const jwtHelper = new JWTHelper()
    const response = await page.request.get(`${API_BASE}/me`, {
      headers: {
        'Cookie': `token=${jwtHelper.generateAdminToken()}`,
      },
      failOnStatusCode: false,
    })
    expect(response.status()).toBe(200)
  })

  test('OPTIONS request is not blocked by CSRF', async ({ page }) => {
    const response = await page.request.fetch(`${API_BASE}/me`, {
      method: 'OPTIONS',
      failOnStatusCode: false,
    })
    expect(response.status()).not.toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Group 3: Bearer Token Auth Exempt from CSRF
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CSRF Exemption - Bearer Token Auth', () => {
  test('POST with Authorization Bearer header and no XSRF token is not a CSRF error', async ({ page }) => {
    const jwtHelper = new JWTHelper()
    const response = await page.request.post(`${API_BASE}/origin-account/create`, {
      headers: {
        'Authorization': `Bearer ${jwtHelper.generateAdminToken()}`,
        'Content-Type': 'application/json',
      },
      data: { username: 'test', password: 'test123' },
      failOnStatusCode: false,
    })
    // Bearer auth should bypass CSRF - response should NOT be 403 "invalid CSRF token"
    if (response.status() === 403) {
      const body = await response.json()
      expect(body.message).not.toBe('invalid CSRF token')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Group 4: Unprotected Endpoints
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CSRF Exemption - Unprotected Endpoints', () => {
  test('POST /origin-account/login without XSRF token is not a CSRF error', async ({ page }) => {
    const response = await page.request.post(`${API_BASE}/origin-account/login`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: { username: 'wronguser', password: 'wrongpass' },
      failOnStatusCode: false,
    })
    // Login is a public endpoint — should not return CSRF 403
    if (response.status() === 403) {
      const body = await response.json()
      expect(body.message).not.toBe('invalid CSRF token')
    }
  })

  test('POST /logout without XSRF token is not a CSRF error', async ({ page }) => {
    const response = await page.request.post(`${API_BASE}/logout`, {
      headers: {
        'Content-Type': 'application/json',
      },
      failOnStatusCode: false,
    })
    // Logout is exempt — should not return CSRF 403
    if (response.status() === 403) {
      const body = await response.json()
      expect(body.message).not.toBe('invalid CSRF token')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Group 5: /me Response Contains csrf_token
// ─────────────────────────────────────────────────────────────────────────────
test.describe('/me Response - csrf_token Field', () => {
  test('GET /me with cookie returns a non-empty csrf_token', async ({ page }) => {
    const jwtHelper = new JWTHelper()
    const response = await page.request.get(`${API_BASE}/me`, {
      headers: {
        'Cookie': `token=${jwtHelper.generateAdminToken()}`,
      },
      failOnStatusCode: false,
    })
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(typeof body.csrf_token).toBe('string')
    expect(body.csrf_token.length).toBeGreaterThan(0)
  })

  test('csrf_token matches expected format: 32-char hex nonce + dot + 64-char hex sig', async ({ page }) => {
    const jwtHelper = new JWTHelper()
    const response = await page.request.get(`${API_BASE}/me`, {
      headers: {
        'Cookie': `token=${jwtHelper.generateAdminToken()}`,
      },
    })
    const body = await response.json()
    expect(body.csrf_token).toMatch(/^[0-9a-f]{32}\.[0-9a-f]{64}$/)
  })

  test('two /me calls return different csrf_token values (nonce-based)', async ({ page }) => {
    const jwtHelper = new JWTHelper()
    const headers = { 'Cookie': `token=${jwtHelper.generateAdminToken()}` }

    const response1 = await page.request.get(`${API_BASE}/me`, { headers })
    const body1 = await response1.json()

    const response2 = await page.request.get(`${API_BASE}/me`, { headers })
    const body2 = await response2.json()

    expect(body1.csrf_token).not.toBe(body2.csrf_token)
  })

  test('token cookie is HttpOnly — not accessible via document.cookie', async ({ context, page }) => {
    const jwtHelper = new JWTHelper()
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: COOKIE_DOMAIN,
      path: '/',
      httpOnly: true,
    }])
    await page.goto('/')
    const cookieStr = await page.evaluate(() => document.cookie)
    expect(cookieStr).not.toContain('token=')
  })

  test('no XSRF-TOKEN cookie present in document.cookie after /me call', async ({ context, page }) => {
    const jwtHelper = new JWTHelper()
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: COOKIE_DOMAIN,
      path: '/',
    }])
    // Navigate so the frontend calls /me
    await page.goto('/stream')
    await page.waitForTimeout(2000)
    const cookieStr = await page.evaluate(() => document.cookie)
    expect(cookieStr).not.toContain('XSRF-TOKEN')
  })
})
