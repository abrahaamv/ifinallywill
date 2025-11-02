/**
 * Login Page Object Model
 * Encapsulates login page interactions
 */

import { Page, expect } from '@playwright/test';
import { fillField, waitForElement } from '../utils/helpers';

export class LoginPage {
  constructor(private page: Page) {}

  // Selectors
  private selectors = {
    emailInput: 'input[name="email"]',
    passwordInput: 'input[type="password"]',
    submitButton: 'button[type="submit"]',
    errorMessage: '[data-testid="error-message"]',
    mfaCodeInput: 'input[name="mfaCode"]',
    registerLink: 'a[href="/register"]',
    forgotPasswordLink: 'a[href="/forgot-password"]',
  };

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/login');
    await waitForElement(this.page, this.selectors.emailInput);
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    await fillField(this.page, this.selectors.emailInput, email);
    await fillField(this.page, this.selectors.passwordInput, password);
    await this.page.click(this.selectors.submitButton);
  }

  /**
   * Login with MFA code
   */
  async loginWithMFA(email: string, password: string, mfaCode: string) {
    await this.login(email, password);
    await waitForElement(this.page, this.selectors.mfaCodeInput);
    await fillField(this.page, this.selectors.mfaCodeInput, mfaCode);
    await this.page.click(this.selectors.submitButton);
  }

  /**
   * Click register link
   */
  async goToRegister() {
    await this.page.click(this.selectors.registerLink);
  }

  /**
   * Click forgot password link
   */
  async goToForgotPassword() {
    await this.page.click(this.selectors.forgotPasswordLink);
  }

  /**
   * Expect to be logged in (redirected to dashboard)
   */
  async expectLoggedIn() {
    await expect(this.page).toHaveURL(/.*dashboard/);
  }

  /**
   * Expect error message
   */
  async expectError(message: string) {
    await waitForElement(this.page, this.selectors.errorMessage);
    await expect(this.page.locator(this.selectors.errorMessage)).toContainText(message);
  }
}
