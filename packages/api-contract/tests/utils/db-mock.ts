/**
 * Database Mocking Utilities for tRPC Tests
 *
 * Provides helpers for mocking Drizzle ORM database operations
 * without relying on vi.spyOn() which fails with Drizzle's Proxy implementation
 */

import { vi } from 'vitest';
import type { ServiceDatabase } from '@platform/db';

/**
 * Create a mock database instance with chainable query methods
 *
 * This replaces the need for vi.spyOn() on Drizzle DB instances
 */
export function createMockDb(overrides: Partial<ServiceDatabase> = {}): ServiceDatabase {
  const mockDb = {
    select: vi.fn(() => mockDb),
    from: vi.fn(() => mockDb),
    where: vi.fn(() => mockDb),
    limit: vi.fn(() => mockDb),
    offset: vi.fn(() => mockDb),
    orderBy: vi.fn(() => mockDb),
    insert: vi.fn(() => mockDb),
    values: vi.fn(() => mockDb),
    returning: vi.fn(() => mockDb),
    update: vi.fn(() => mockDb),
    set: vi.fn(() => mockDb),
    delete: vi.fn(() => mockDb),
    execute: vi.fn(),
    ...overrides,
  } as unknown as ServiceDatabase;

  return mockDb;
}

/**
 * Mock successful user query result
 */
export function mockUserQuerySuccess(user: any) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve([user])),
      })),
    })),
  };
}

/**
 * Mock empty query result (user not found)
 */
export function mockUserQueryEmpty() {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
  };
}

/**
 * Mock successful insert operation
 */
export function mockInsertSuccess(result: any) {
  return {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([result])),
      })),
    })),
  };
}

/**
 * Mock successful update operation
 */
export function mockUpdateSuccess(result: any) {
  return {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([result])),
        })),
      })),
    })),
  };
}

/**
 * Mock database error
 */
export function mockDatabaseError(error: Error) {
  return {
    from: vi.fn(() => {
      throw error;
    }),
    insert: vi.fn(() => {
      throw error;
    }),
    update: vi.fn(() => {
      throw error;
    }),
    delete: vi.fn(() => {
      throw error;
    }),
  };
}

/**
 * Mock transaction wrapper
 */
export function mockTransaction(callback: any) {
  return vi.fn(async (fn: any) => {
    const mockTx = createMockDb();
    return await fn(mockTx);
  });
}

/**
 * Helper to create a complete mock context for tRPC callers
 */
export function createMockContext(overrides = {}) {
  return {
    session: null,
    tenantId: null,
    userId: null,
    role: null,
    db: createMockDb(),
    ...overrides,
  };
}
