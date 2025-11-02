/**
 * Authentication E2E Tests
 * Tests critical authentication flows
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { generateEmail, generatePassword, clearBrowserData } from '../utils/helpers';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear browser data before each test
    await clearBrowserData(page);
  });

  test('should load login page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Verify page loaded correctly
    await expect(page).toHaveTitle(/Login/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Expect validation errors
    await expect(page.locator('input[name="email"]:invalid')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Try to login with invalid credentials
    await loginPage.login('invalid@example.com', 'WrongPassword123!');

    // Expect error message
    await loginPage.expectError('Invalid email or password');
  });

  test('should login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Login with test credentials
    const email = process.env.TEST_EMAIL || 'test@example.com';
    const password = process.env.TEST_PASSWORD || 'Test123!@#';

    await loginPage.login(email, password);

    // Expect successful login (redirect to dashboard)
    await loginPage.expectLoggedIn();
  });

  test('should persist session after page reload', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Login
    const email = process.env.TEST_EMAIL || 'test@example.com';
    const password = process.env.TEST_PASSWORD || 'Test123!@#';
    await loginPage.login(email, password);
    await loginPage.expectLoggedIn();

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should logout successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Login first
    const email = process.env.TEST_EMAIL || 'test@example.com';
    const password = process.env.TEST_PASSWORD || 'Test123!@#';
    await loginPage.login(email, password);
    await loginPage.expectLoggedIn();

    // Click user menu and logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    // Expect redirect to login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should navigate to register page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Click register link
    await loginPage.goToRegister();

    // Expect register page
    await expect(page).toHaveURL(/.*register/);
  });

  test('should navigate to forgot password page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Click forgot password link
    await loginPage.goToForgotPassword();

    // Expect password reset page
    await expect(page).toHaveURL(/.*forgot-password/);
  });

  test('should handle session expiration', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Login
    const email = process.env.TEST_EMAIL || 'test@example.com';
    const password = process.env.TEST_PASSWORD || 'Test123!@#';
    await loginPage.login(email, password);
    await loginPage.expectLoggedIn();

    // Clear session cookies to simulate expiration
    await page.context().clearCookies();

    // Try to access protected page
    await page.goto('/dashboard/settings');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should prevent access to protected routes when not logged in', async ({ page }) => {
    // Try to access dashboard without logging in
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });
});
