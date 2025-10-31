import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Sql } from 'postgres';
import * as schema from './schema/index';

// Check if running in browser environment (check for window object)
// Type assertion needed: globalThis in Node.js environment doesn't have window in its type definition
const isBrowser =
  typeof (globalThis as typeof globalThis & { window?: unknown }).window !== 'undefined';

// Connection string from environment
const connectionString = process.env.DATABASE_URL;
const serviceConnectionString = process.env.SERVICE_DATABASE_URL;

if (!isBrowser && !connectionString) {
  throw new Error('DATABASE_URL environment variable is required for database connection');
}

// Create postgres client with connection pooling (only in Node.js environment)
// Pool configuration optimized for production workload:
// - max: 20 connections (supports ~200 concurrent requests with typical query times)
// - idle_timeout: 30s (balance between resource usage and connection reuse)
// - connect_timeout: 10s (fail fast on connection issues)
// - prepare: true (prepared statements reduce query planning overhead)
const client = isBrowser
  ? null
  : postgres(connectionString!, {
      max: 20, // Maximum connections (increased from 10 for better concurrency)
      idle_timeout: 30, // Close idle connections after 30s (increased from 20s)
      connect_timeout: 10, // Connection timeout in seconds
      prepare: true, // Use prepared statements (faster)
    });

// Create service role client with BYPASS RLS for admin operations
// Used ONLY for registration and other admin tasks that need to bypass RLS
// Smaller pool size since admin operations are less frequent
const serviceClient = isBrowser
  ? null
  : serviceConnectionString
    ? postgres(serviceConnectionString, {
        max: 10, // Admin operations pool (increased from 5 for registration spikes)
        idle_timeout: 30, // Match main pool timeout (increased from 20s)
        connect_timeout: 10, // Connection timeout in seconds
        prepare: true, // Use prepared statements (faster)
      })
    : null;

// Export raw SQL client for direct queries (used in tests and migrations)
// In browser, exports null but we assert non-null for server-side usage
// Browser check happens at runtime, these are only used server-side
// Type cast needed: Avoid null checks throughout codebase for server-only exports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sql = client as any as Sql;

// Create drizzle instance with schema
// In browser, exports null but we assert non-null for server-side usage
// Type cast needed: Avoid null checks throughout codebase for server-only exports
export const db = (isBrowser ? null : drizzle(client!, { schema })) as PostgresJsDatabase<
  typeof schema
>;

// Service database with RLS bypass for admin operations
// ⚠️ CRITICAL: Use ONLY for registration and system tasks
// Never use for user-facing queries - catastrophic data leakage risk
// Type cast needed: Avoid null checks throughout codebase for server-only exports
export const serviceDb = (isBrowser
  ? null
  : serviceClient
    ? drizzle(serviceClient, { schema })
    : null) as PostgresJsDatabase<typeof schema>;

// Tenant-scoped database context
// Note: This is a helper for application-level tenant filtering
// PostgreSQL RLS policies provide the actual security boundary
export function createTenantDb(tenantId: string) {
  return {
    tenantId,
    db,
    // Raw query access with tenant context
    raw: db,
  };
}
