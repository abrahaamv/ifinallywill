import { expect, test } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

/**
 * Authentication E2E Tests - Login Flow
 *
 * Critical path validation for user authentication
 */

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    // Verify page elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Click submit without filling form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Verify error messages (adjust selectors based on actual implementation)
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill(testUsers.user.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill(testUsers.user.email);
    await page.getByLabel(/password/i).fill('WrongPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(
      page.getByText(/invalid (email or password|credentials)/i)
    ).toBeVisible();
  });

  test('should have link to registration page', async ({ page }) => {
    const signUpLink = page.getByRole('link', { name: /sign up|create account|register/i });
    await expect(signUpLink).toBeVisible();

    await signUpLink.click();
    await expect(page).toHaveURL(/.*\/(register|signup)/);
  });

  test('should have forgot password link', async ({ page }) => {
    const forgotLink = page.getByRole('link', { name: /forgot password/i });
    await expect(forgotLink).toBeVisible();
  });

  // Note: Actual login test requires existing user in database
  // This should be run after registration or with seeded data
  test.skip('should login successfully with valid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill(testUsers.user.email);
    await page.getByLabel(/password/i).fill(testUsers.user.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.getByText(testUsers.user.name)).toBeVisible();
  });
});
