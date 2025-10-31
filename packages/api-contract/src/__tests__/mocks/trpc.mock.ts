/**
 * tRPC Mocks - Phase 2 Task 2.2
 *
 * Mock factories for tRPC context and procedures.
 */

import type { Session } from '@auth/core/types';
import { createMockSession } from './session.mock';

/**
 * Create mock tRPC context for testing
 */
export interface MockTRPCContext {
  session: Session | null;
  tenantId: string | null;
  db: unknown;
}

export const createMockTRPCContext = (overrides?: Partial<MockTRPCContext>): MockTRPCContext => {
  const session = overrides?.session !== undefined ? overrides.session : createMockSession();

  // Extract tenantId safely - custom property that may exist on session user
  const sessionTenantId =
    session &&
    'user' in session &&
    session.user &&
    typeof session.user === 'object' &&
    'tenantId' in session.user
      ? (session.user as { tenantId?: string }).tenantId
      : undefined;

  return {
    session,
    tenantId: overrides?.tenantId || sessionTenantId || 'test-tenant-id',
    db: overrides?.db || {},
  };
};

/**
 * Create authenticated tRPC context
 */
export const createAuthenticatedContext = (userOverrides?: {
  userId?: string;
  tenantId?: string;
  role?: string;
}): MockTRPCContext => {
  const session = createMockSession({
    userId: userOverrides?.userId,
    user: {
      id: userOverrides?.userId || 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
    },
  });

  return {
    session,
    tenantId: userOverrides?.tenantId || 'test-tenant-id',
    db: {},
  };
};

/**
 * Create unauthenticated tRPC context
 */
export const createUnauthenticatedContext = (): MockTRPCContext => ({
  session: null,
  tenantId: null,
  db: {},
});

/**
 * Mock tRPC caller for testing procedures
 */
export const createMockCaller = <T extends Record<string, unknown>>(procedures: T): T => {
  return procedures;
};

/**
 * Re-export session mock for convenience
 */
export { createMockSession } from './session.mock';
