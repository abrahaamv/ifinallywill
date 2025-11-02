/**
 * Test Helper Utilities
 * Shared functions for E2E tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for element to be visible and stable
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
  // Wait for element to stop moving (animations)
  await page.waitForSelector(selector, { state: 'attached', timeout });
}

/**
 * Fill form field with validation
 */
export async function fillField(page: Page, selector: string, value: string) {
  await waitForElement(page, selector);
  await page.fill(selector, value);
  // Verify the value was set
  await expect(page.locator(selector)).toHaveValue(value);
}

/**
 * Click button and wait for navigation
 */
export async function clickAndWaitForNavigation(page: Page, selector: string) {
  await waitForElement(page, selector);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click(selector),
  ]);
}

/**
 * Wait for API response
 */
export async function waitForAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
) {
  return page.waitForResponse(
    (response) => {
      const url = response.url();
      return typeof urlPattern === 'string'
        ? url.includes(urlPattern)
        : urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Check if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for text to appear
 */
export async function waitForText(page: Page, text: string, timeout = 10000) {
  await page.waitForSelector(`text=${text}`, { timeout });
}

/**
 * Generate random email
 */
export function generateEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

/**
 * Generate random password
 */
export function generatePassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*';

  const all = upper + lower + digits + special;
  let password = '';

  // Ensure at least one of each type
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill remaining characters
  for (let i = 4; i < 16; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Wait for WebSocket connection
 */
export async function waitForWebSocket(page: Page, timeout = 10000) {
  return page.waitForEvent('websocket', { timeout });
}

/**
 * Clear all cookies and storage
 */
export async function clearBrowserData(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Login helper (reusable across tests)
 */
export async function login(
  page: Page,
  email: string,
  password: string,
  baseURL: string
) {
  await page.goto(`${baseURL}/login`);
  await fillField(page, 'input[name="email"]', email);
  await fillField(page, 'input[type="password"]', password);
  await clickAndWaitForNavigation(page, 'button[type="submit"]');

  // Verify login success
  await expect(page).toHaveURL(/.*dashboard/);
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
}
