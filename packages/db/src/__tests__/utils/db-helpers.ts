/**
 * Database Test Helpers - Phase 2 Task 2.2
 *
 * Utilities for testing database operations with Drizzle ORM.
 */

import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * Mock database transaction helper
 * Creates a mock transaction that can be used in tests
 */
export const createMockTransaction = <T extends Record<string, unknown>>(): NodePgDatabase<T> => {
  const mockDb = {
    execute: vi.fn(),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    transaction: vi.fn((callback) => callback(mockDb)),
  } as unknown as NodePgDatabase<T>;

  return mockDb;
};

/**
 * Create mock database client
 * Useful for testing without actual database connection
 */
export const createMockDb = <T extends Record<string, unknown>>(): NodePgDatabase<T> => {
  return createMockTransaction<T>();
};

/**
 * Mock tenant context for RLS testing
 */
export interface MockTenantContext {
  tenantId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
}

export const createMockTenantContext = (
  overrides?: Partial<MockTenantContext>
): MockTenantContext => ({
  tenantId: overrides?.tenantId || 'test-tenant-id',
  userId: overrides?.userId || 'test-user-id',
  role: overrides?.role || 'member',
});

/**
 * Create mock database query result
 */
export const createMockQueryResult = <T>(data: T[]): T[] => data;

/**
 * Assert database query was called with expected parameters
 */
export const expectDbQuery = (
  mockFn: ReturnType<typeof vi.fn>,
  expectedParams: unknown[]
): void => {
  expect(mockFn).toHaveBeenCalledWith(...expectedParams);
};
