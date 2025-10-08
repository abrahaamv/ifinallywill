import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

// Check if running in browser environment (check for window object)
const isBrowser = typeof (globalThis as any).window !== 'undefined';

// Connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!isBrowser && !connectionString) {
  throw new Error('DATABASE_URL environment variable is required for database connection');
}

// Create postgres client with connection pooling (only in Node.js environment)
const client = isBrowser
  ? null
  : postgres(connectionString!, {
      max: 10, // Maximum connections
      idle_timeout: 20, // Close idle connections after 20s
      connect_timeout: 10, // Connection timeout in seconds
      prepare: true, // Use prepared statements (faster)
    });

// Export raw SQL client for direct queries (used in tests and migrations)
// In browser, exports null (types are still available for tRPC)
export const sql = client as any;

// Create drizzle instance with schema
// In browser, exports null (types are still available for tRPC)
export const db = isBrowser ? (null as any) : drizzle(client!, { schema });

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
