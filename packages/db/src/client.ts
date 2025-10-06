import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

// Connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for database connection');
}

// Create postgres client with connection pooling
const client = postgres(connectionString, {
  max: 10, // Maximum connections
  idle_timeout: 20, // Close idle connections after 20s
  connect_timeout: 10, // Connection timeout in seconds
  prepare: true, // Use prepared statements (faster)
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

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
