/**
 * Browser Polyfills
 *
 * CRITICAL: This file must be imported FIRST in main.tsx
 * Sets up globals required by packages in browser context
 */

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
