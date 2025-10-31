/**
 * Test Context Utilities (Week 4 Day 1)
 *
 * Provides standardized context creation for tRPC test suites.
 * Ensures consistent context setup across all router tests.
 *
 * Usage:
 * ```typescript
 * import { createMockContext, createMockDb } from './utils/context';
 *
 * const ctx = createMockContext({ role: 'admin' });
 * const mockDb = createMockDb();
 * ```
 */

import { vi } from 'vitest';
import type { Context } from '../../src/context';
import { mockUUIDs } from './fixtures';

/**
 * Create Mock Database with Transaction Support
 *
 * Creates a mock Drizzle database object with all standard operations
 * and transaction support for RLS enforcement.
 *
 * @returns Mock database object with Drizzle ORM interface
 */
export const createMockDb = () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockExecute = vi.fn();

  const mockTransaction = vi.fn((callback) => {
    // Execute callback with the mock db itself (simulating transaction)
    return callback(mockDb);
  });

  const mockDb = {
    // Query builders
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    execute: mockExecute,

    // Transaction support
    transaction: mockTransaction,

    // Query operators (for mocking)
    where: vi.fn(),
    from: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    values: vi.fn(),
    set: vi.fn(),
    returning: vi.fn(),
  };

  // Setup default chaining behavior for SELECT queries
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue([]),
        }),
        offset: vi.fn().mockResolvedValue([]),
      }),
      limit: vi.fn().mockReturnValue({
        offset: vi.fn().mockResolvedValue([]),
      }),
      offset: vi.fn().mockResolvedValue([]),
      $dynamic: vi.fn().mockReturnThis(),
    }),
  });

  // Setup default chaining behavior for INSERT queries
  mockInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    }),
  });

  // Setup default chaining behavior for UPDATE queries
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  });

  // Setup default chaining behavior for DELETE queries
  mockDelete.mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    }),
  });

  return mockDb;
};

/**
 * Create Mock tRPC Context
 *
 * Creates a standardized tRPC context object for testing with proper
 * authentication and tenant isolation setup.
 *
 * @param options - Optional context configuration
 * @param options.role - User role (member, admin, owner)
 * @param options.userId - User ID (uses fixture default if not provided)
 * @param options.tenantId - Tenant ID (uses fixture default if not provided)
 * @param options.email - User email
 * @param options.name - User name
 * @param options.db - Database mock (creates new if not provided)
 * @returns Mock tRPC context object
 */
export const createMockContext = (options?: {
  role?: 'member' | 'admin' | 'owner';
  userId?: string;
  tenantId?: string;
  email?: string;
  name?: string;
  db?: any;
}): Context => {
  const role = options?.role ?? 'member';
  const userId = options?.userId ?? mockUUIDs.user.default;
  const tenantId = options?.tenantId ?? mockUUIDs.tenant.default;
  const email = options?.email ?? 'test@example.com';
  const name = options?.name ?? 'Test User';
  const db = options?.db ?? createMockDb();

  return {
    session: {
      user: { id: userId, email, name },
      userId,
      tenantId,
      role,
    },
    db: db as any,
    tenantId,
    userId, // Top-level for middleware compatibility
    role, // Top-level for middleware compatibility
  };
};

/**
 * Create Mock tRPC Context for Unauthenticated User
 *
 * Creates a context object without authentication for testing
 * public procedures and authentication flows.
 *
 * @param options - Optional context configuration
 * @param options.db - Database mock (creates new if not provided)
 * @returns Mock tRPC context without authentication
 */
export const createUnauthenticatedContext = (options?: { db?: any }): Context => {
  const db = options?.db ?? createMockDb();

  return {
    session: null,
    db: db as any,
    tenantId: null,
    userId: null,
    role: null,
  };
};

/**
 * Setup Mock Query Result
 *
 * Helper to configure a mock database query to return specific results.
 * Handles the full query chain (select → from → where → limit/offset).
 *
 * @param mockDb - Mock database object
 * @param results - Array of results to return
 * @param options - Optional configuration
 * @param options.count - Total count for pagination
 * @returns Configured mock database
 */
export const setupMockQueryResult = (
  mockDb: any,
  results: any[],
  options?: {
    count?: number;
  }
) => {
  const mockQuery = {
    $dynamic: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(results),
  };

  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue(mockQuery),
  });

  // Setup count query if provided
  if (options?.count !== undefined) {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockResolvedValue([{ count: options.count }]),
    });
  }

  return mockDb;
};

/**
 * Setup Mock Insert Result
 *
 * Helper to configure a mock database insert to return specific results.
 * Handles the full insert chain (insert → values → returning).
 *
 * @param mockDb - Mock database object
 * @param results - Array of results to return
 * @returns Configured mock database
 */
export const setupMockInsertResult = (mockDb: any, results: any[]) => {
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(results),
    }),
  });

  return mockDb;
};

/**
 * Setup Mock Update Result
 *
 * Helper to configure a mock database update to return specific results.
 * Handles the full update chain (update → set → where → returning).
 *
 * @param mockDb - Mock database object
 * @param results - Array of results to return
 * @param options - Optional configuration
 * @param options.checkExisting - Whether to mock existing record check
 * @param options.existingRecord - Existing record for check
 * @returns Configured mock database
 */
export const setupMockUpdateResult = (
  mockDb: any,
  results: any[],
  options?: {
    checkExisting?: boolean;
    existingRecord?: any;
  }
) => {
  // Mock existing record check if requested
  if (options?.checkExisting) {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(options.existingRecord ? [options.existingRecord] : []),
        }),
      }),
    });
  }

  // Mock update operation
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(results),
      }),
    }),
  });

  return mockDb;
};

/**
 * Setup Mock Delete Result
 *
 * Helper to configure a mock database delete to return specific results.
 * Handles the full delete chain (delete → where → returning).
 *
 * @param mockDb - Mock database object
 * @param results - Array of results to return
 * @returns Configured mock database
 */
export const setupMockDeleteResult = (mockDb: any, results: any[]) => {
  mockDb.delete.mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(results),
    }),
  });

  return mockDb;
};

/**
 * Setup Mock Query with Chaining
 *
 * Enhanced helper that sets up a complete query chain with proper support
 * for limit/offset chaining. Returns the query result directly.
 *
 * @param mockDb - Mock database object
 * @param data - Data to return from query
 * @returns Configured mock database
 */
export const setupMockQuery = (mockDb: any, data: any[]) => {
  mockDb.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue(data),
        }),
      }),
      limit: vi.fn().mockReturnValue({
        offset: vi.fn().mockResolvedValue(data),
      }),
      offset: vi.fn().mockResolvedValue(data),
      $dynamic: vi.fn().mockReturnThis(),
    }),
  });
  return mockDb;
};

/**
 * Setup Mock Query with Count
 *
 * Sets up both the data query and count query for pagination.
 * Supports conditional where clauses, orderBy, and dynamic query building.
 *
 * @param mockDb - Mock database object
 * @param data - Data to return from query
 * @param count - Total count for pagination
 * @returns Configured mock database
 */
export const setupMockQueryWithCount = (mockDb: any, data: any[], count: number) => {
  // Create a chainable query mock that supports multiple where() and orderBy() calls
  const chainableQuery = {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(data),
  };

  // Main query with $dynamic support
  mockDb.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      $dynamic: vi.fn().mockReturnValue(chainableQuery),
      where: vi.fn().mockReturnValue(chainableQuery),
      orderBy: vi.fn().mockReturnValue(chainableQuery),
      limit: vi.fn().mockReturnValue({
        offset: vi.fn().mockResolvedValue(data),
      }),
    }),
  });

  // Count query
  mockDb.select.mockReturnValueOnce({
    from: vi.fn().mockResolvedValue([{ count }]),
  });

  return mockDb;
};

/**
 * Setup Mock Get (single record query)
 *
 * Simplified helper for getting a single record by ID.
 *
 * @param mockDb - Mock database object
 * @param record - Record to return (or null for not found)
 * @returns Configured mock database
 */
export const setupMockGet = (mockDb: any, record: any | null) => {
  mockDb.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(record ? [record] : []),
      }),
    }),
  });
  return mockDb;
};

/**
 * Setup Mock Insert
 *
 * Simplified helper for insert operations.
 *
 * @param mockDb - Mock database object
 * @param record - Record to return from insert
 * @returns Configured mock database
 */
export const setupMockInsert = (mockDb: any, record: any) => {
  mockDb.insert.mockReturnValueOnce({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([record]),
    }),
  });
  return mockDb;
};

/**
 * Setup Mock Update
 *
 * Simplified helper for update operations with optional existence check.
 *
 * @param mockDb - Mock database object
 * @param record - Updated record to return
 * @param existingRecord - Optional existing record for pre-check
 * @returns Configured mock database
 */
export const setupMockUpdate = (mockDb: any, record: any, existingRecord?: any) => {
  // Mock existence check if provided
  if (existingRecord) {
    setupMockGet(mockDb, existingRecord);
  }

  // Mock update
  mockDb.update.mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([record]),
      }),
    }),
  });

  return mockDb;
};

/**
 * Setup Mock Delete
 *
 * Simplified helper for delete operations.
 *
 * @param mockDb - Mock database object
 * @param record - Record to return from delete (or null for not found)
 * @returns Configured mock database
 */
export const setupMockDelete = (mockDb: any, record: any | null = null) => {
  mockDb.delete.mockReturnValueOnce({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(record ? [record] : []),
    }),
  });
  return mockDb;
};

/**
 * Setup Mock Execute Result (for raw SQL queries)
 *
 * Helper to configure execute mock for raw SQL queries like vector search.
 * Used for pgvector similarity queries and other raw SQL operations.
 *
 * NOTE: Drizzle's execute() returns the rows array directly (not wrapped in {rows: []}),
 * so we extract and return result.rows to match the actual Drizzle behavior.
 *
 * @param mockDb - Mock database object
 * @param result - Result object with rows array
 * @returns Configured mock database
 */
export const setupMockExecuteResult = (mockDb: any, result: { rows: any[] }) => {
  // Return the rows array directly to match Drizzle's execute() behavior
  mockDb.execute.mockResolvedValue(result.rows);
  return mockDb;
};
