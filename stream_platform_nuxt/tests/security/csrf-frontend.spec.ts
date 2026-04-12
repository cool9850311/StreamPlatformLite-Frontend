import { test, expect } from '@playwright/test'
import { JWTHelper } from '../helpers/jwt-helper'
import { CsrfHelper } from '../helpers/csrf-helper'
import { COOKIE_DOMAIN, API_BASE } from '../helpers/test-config'

/**
 * CSRF Frontend Integration Tests
 *
 * These tests verify that the useApi() composable correctly:
 * 1. Injects X-XSRF-TOKEN on state-changing requests (POST/PUT/PATCH/DELETE)
 * 2. Does NOT inject X-XSRF-TOKEN on GET requests
 * 3. Successfully completes end-to-end chat flows with CSRF protection
 * 4. Rejects direct API calls without CSRF token
 *
 * Pre-conditions:
 * - A public livestream must exist (depends on setup-public)
 */

test.describe('CSRF Frontend Integration', () => {
  test('useApi() sends X-XSRF-TOKEN header on POST requests', async ({ context, page }) => {
    const jwtHelper = new JWTHelper()
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: COOKIE_DOMAIN,
      path: '/',
    }])

    // Collect outgoing request headers
    const capturedRequests: { url: string; headers: Record<string, string> }[] = []
    page.on('request', request => {
      if (request.url().includes('/livestream/chat') && request.method() === 'POST') {
        capturedRequests.push({
          url: request.url(),
          headers: request.headers(),
        })
      }
    })

    // Wait for /me response so csrf token is populated in useState
    const meResponsePromise = page.waitForResponse(
      response => response.url().includes('/me'),
      { timeout: 15000 }
    )
    await page.goto('/stream')
    await meResponsePromise

    // Wait for stream to load
    await page.waitForResponse(
      response => response.url().includes('/livestream/one'),
      { timeout: 15000 }
    ).catch(() => null)

    // Send a chat message to trigger POST /livestream/chat
    const chatInput = page.locator('.chat-input-field')
    await chatInput.waitFor({ state: 'visible', timeout: 10000 })
    await chatInput.fill('csrf-test-message')
    await chatInput.press('Enter')

    // Wait for the POST to be captured
    await page.waitForTimeout(2000)

    // Verify the POST request included X-XSRF-TOKEN
    expect(capturedRequests.length).toBeGreaterThan(0)
    const chatRequest = capturedRequests[0]
    expect(chatRequest.headers['x-xsrf-token']).toBeTruthy()
    expect(chatRequest.headers['x-xsrf-token'].length).toBeGreaterThan(0)
  })

  test('useApi() does NOT send X-XSRF-TOKEN on GET requests', async ({ context, page }) => {
    const jwtHelper = new JWTHelper()
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: COOKIE_DOMAIN,
      path: '/',
    }])

    // Collect GET requests to /livestream endpoints
    const capturedGetRequests: { url: string; headers: Record<string, string> }[] = []
    page.on('request', request => {
      if (request.url().includes('/livestream') && request.method() === 'GET') {
        capturedGetRequests.push({
          url: request.url(),
          headers: request.headers(),
        })
      }
    })

    await page.goto('/stream')
    await page.waitForTimeout(3000)

    // Verify GET requests do NOT include X-XSRF-TOKEN
    expect(capturedGetRequests.length).toBeGreaterThan(0)
    for (const req of capturedGetRequests) {
      expect(req.headers['x-xsrf-token']).toBeFalsy()
    }
  })

  test('end-to-end chat succeeds with CSRF token from /me', async ({ context, page }) => {
    const jwtHelper = new JWTHelper()
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: COOKIE_DOMAIN,
      path: '/',
    }])

    // Wait for /me to populate csrfToken state
    const meResponsePromise = page.waitForResponse(
      response => response.url().includes('/me'),
      { timeout: 15000 }
    )
    await page.goto('/stream')
    await meResponsePromise

    // Wait for stream to load
    await page.waitForResponse(
      response => response.url().includes('/livestream/one'),
      { timeout: 15000 }
    ).catch(() => null)

    const uniqueMessage = `e2e-csrf-test-${Date.now()}`

    // Track the chat POST response
    const chatResponsePromise = page.waitForResponse(
      response => response.url().includes('/livestream/chat') && response.request().method() === 'POST',
      { timeout: 10000 }
    )

    const chatInput = page.locator('.chat-input-field')
    await chatInput.waitFor({ state: 'visible', timeout: 10000 })
    await chatInput.fill(uniqueMessage)
    await chatInput.press('Enter')

    const chatResponse = await chatResponsePromise
    // Should NOT be 403 (CSRF failure)
    expect(chatResponse.status()).not.toBe(403)
  })

  test('direct API call to POST /livestream/chat without CSRF token returns 403', async ({ context, page }) => {
    const jwtHelper = new JWTHelper()
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: COOKIE_DOMAIN,
      path: '/',
    }])

    // First, navigate to get a valid stream UUID
    await page.goto('/stream')
    const streamResponse = await page.waitForResponse(
      response => response.url().includes('/livestream/one'),
      { timeout: 15000 }
    ).catch(() => null)

    let streamUuid = 'test-uuid'
    if (streamResponse) {
      try {
        const streamData = await streamResponse.json()
        streamUuid = streamData.uuid || streamUuid
      } catch {
        // ignore
      }
    }

    // Make a direct request WITHOUT X-XSRF-TOKEN header
    const response = await page.request.post(`${API_BASE}/livestream/chat`, {
      headers: {
        'Cookie': `token=${jwtHelper.generateUserToken()}`,
        'Content-Type': 'application/json',
        // Deliberately omitting X-XSRF-TOKEN
      },
      data: { stream_uuid: streamUuid, message: 'no-csrf-test' },
      failOnStatusCode: false,
    })

    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.message).toBe('invalid CSRF token')
  })
})
