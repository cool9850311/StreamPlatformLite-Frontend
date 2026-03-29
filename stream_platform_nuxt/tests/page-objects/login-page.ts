import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/');
  }

  async clickViewPublicStream() {
    await this.page.click('.btn-public-stream');
  }

  async clickDiscordLogin() {
    await this.page.click('.btn-discord');
  }

  async clickNativeLogin() {
    await this.page.click('.btn-native');
  }
}
