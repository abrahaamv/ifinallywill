import { resolve } from 'node:path';
import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

// Load .env.local first (development), fallback to .env (production)
config({ path: resolve(__dirname, '../../.env.local') });
config({ path: resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Please create .env.local file in project root with DATABASE_URL="postgresql://ifinallywill:ifinallywill_dev_password@localhost:5432/ifinallywill"'
  );
}

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;
