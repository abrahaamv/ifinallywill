export * from './schema/index';
export { db, sql, serviceDb } from './client';

// Re-export Drizzle ORM utilities for queries
export {
  eq,
  and,
  or,
  not,
  gt,
  gte,
  lt,
  lte,
  isNull,
  isNotNull,
  inArray,
  like,
  ilike,
  desc,
  asc,
} from 'drizzle-orm';

// Export tenant context manager (Phase 8 Day 4-5)
export { TenantContext, getTenantId } from './tenant-context';
export type { TenantTransaction } from './tenant-context';

// Export database client type for service dependencies
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index';
export type DrizzleClient = PostgresJsDatabase<typeof schema>;
