/**
 * Browser Polyfills
 *
 * CRITICAL: This file must be imported FIRST in main.tsx
 * Sets up Node.js globals required by server-side packages in browser context
 *
 * Required by:
 * - @platform/api-contract (Buffer for base64 file encoding)
 * - @platform/auth (Buffer for crypto operations)
 * - tRPC client (process.env for environment variables)
 */

import { Buffer } from 'buffer';

// Inject Buffer into global scope
(window as any).Buffer = Buffer;
(globalThis as any).Buffer = Buffer;

// Inject process.env for environment variables
(window as any).process = {
  env: {
    NODE_ENV: import.meta.env.MODE,
    // Mock DATABASE_URL for type imports (never actually used in browser)
    DATABASE_URL: 'postgresql://mock',
    ...import.meta.env,
  },
  // Mock performance for Node.js perf_hooks compatibility
  hrtime: {
    bigint: () => BigInt(Date.now() * 1000000),
  },
};

// Make global available
(window as any).global = globalThis;
