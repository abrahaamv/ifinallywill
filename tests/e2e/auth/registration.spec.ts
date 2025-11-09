import { expect, test } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

/**
 * Authentication E2E Tests - Registration Flow
 *
 * Critical path validation for user registration
 */

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should display registration form', async ({ page }) => {
    // Verify page elements
    await expect(page.getByRole('heading', { name: /sign up|register|create account/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/organization/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up|register|create account/i })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Click submit without filling form
    await page.getByRole('button', { name: /sign up|register|create account/i }).click();

    // Verify error messages
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    await page.getByLabel(/email/i).fill(testUsers.newUser.email);
    await page.getByLabel(/^name/i).fill(testUsers.newUser.name);
    await page.getByLabel(/organization/i).fill(testUsers.newUser.organizationName);

    // Test weak password
    await page.getByLabel(/password/i).fill('weak');
    await page.getByRole('button', { name: /sign up|register|create account/i }).click();

    // Should show password requirements
    await expect(
      page.getByText(/password must be at least 8 characters/i)
    ).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill(testUsers.newUser.password);
    await page.getByLabel(/^name/i).fill(testUsers.newUser.name);
    await page.getByLabel(/organization/i).fill(testUsers.newUser.organizationName);
    await page.getByRole('button', { name: /sign up|register|create account/i }).click();

    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('should have link to login page', async ({ page }) => {
    const signInLink = page.getByRole('link', { name: /sign in|log in|already have an account/i });
    await expect(signInLink).toBeVisible();

    await signInLink.click();
    await expect(page).toHaveURL(/.*\/(login|signin)/);
  });

  // Note: Actual registration requires database connection
  test.skip('should register new user successfully', async ({ page }) => {
    await page.getByLabel(/email/i).fill(testUsers.newUser.email);
    await page.getByLabel(/password/i).fill(testUsers.newUser.password);
    await page.getByLabel(/^name/i).fill(testUsers.newUser.name);
    await page.getByLabel(/organization/i).fill(testUsers.newUser.organizationName);
    await page.getByRole('button', { name: /sign up|register|create account/i }).click();

    // Should show success message or redirect
    await expect(
      page.getByText(/account created|check your email|registration successful/i)
    ).toBeVisible();
  });

  test.skip('should prevent duplicate email registration', async ({ page }) => {
    // Try to register with existing email
    await page.getByLabel(/email/i).fill(testUsers.user.email);
    await page.getByLabel(/password/i).fill(testUsers.newUser.password);
    await page.getByLabel(/^name/i).fill(testUsers.newUser.name);
    await page.getByLabel(/organization/i).fill(testUsers.newUser.organizationName);
    await page.getByRole('button', { name: /sign up|register|create account/i }).click();

    await expect(page.getByText(/email already (exists|registered|in use)/i)).toBeVisible();
  });
});
