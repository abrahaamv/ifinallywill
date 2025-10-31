/**
 * Session Mock - Local implementation for api-contract tests
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
