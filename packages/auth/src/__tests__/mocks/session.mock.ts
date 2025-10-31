/**
 * Auth Session Mocks - Phase 2 Task 2.2
 *
 * Mock factories for Auth.js sessions and users.
 */

import type { Session, User } from '@auth/core/types';

/**
 * Create mock user for testing
 */
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: overrides?.id || 'test-user-id',
  email: overrides?.email || 'test@example.com',
  name: overrides?.name || 'Test User',
  image: overrides?.image || null,
  emailVerified: overrides?.emailVerified || new Date(),
  ...overrides,
});

/**
 * Create mock session for testing
 */
export const createMockSession = (
  overrides?: Partial<Session> & { userId?: string; tenantId?: string; role?: string }
): Session => {
  const user = createMockUser({
    id: overrides?.userId || 'test-user-id',
    email: overrides?.user?.email || 'test@example.com',
  });

  return {
    user,
    expires: overrides?.expires || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
};

/**
 * Create mock CSRF token for testing
 */
export interface MockCSRFToken {
  token: string;
  expiresAt: number;
}

export const createMockCSRFToken = (overrides?: Partial<MockCSRFToken>): MockCSRFToken => ({
  token: overrides?.token || 'mock-csrf-token-12345678',
  expiresAt: overrides?.expiresAt || Date.now() + 3600000,
});

/**
 * Create mock Auth.js account
 */
export const createMockAccount = (overrides?: Record<string, unknown>) => ({
  provider: overrides?.provider || 'credentials',
  providerAccountId: overrides?.providerAccountId || 'test-account-id',
  type: overrides?.type || 'credentials',
  ...overrides,
});
