import { test as base, BrowserContext } from '@playwright/test';
import { JWTHelper } from '../helpers/jwt-helper';

type AuthFixtures = {
  adminContext: BrowserContext;
  editorContext: BrowserContext;
  userContext: BrowserContext;
  guestContext: BrowserContext;
  anonymousContext: BrowserContext;
};

export const test = base.extend<AuthFixtures>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateAdminToken(),
      domain: 'localhost',
      path: '/',
    }]);
    await use(context);
    await context.close();
  },

  editorContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateEditorToken(),
      domain: 'localhost',
      path: '/',
    }]);
    await use(context);
    await context.close();
  },

  userContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateUserToken(),
      domain: 'localhost',
      path: '/',
    }]);
    await use(context);
    await context.close();
  },

  guestContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const jwtHelper = new JWTHelper();
    await context.addCookies([{
      name: 'token',
      value: jwtHelper.generateGuestToken(),
      domain: 'localhost',
      path: '/',
    }]);
    await use(context);
    await context.close();
  },

  anonymousContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    // 不设置任何 cookie
    await use(context);
    await context.close();
  },
});
