/**
 * Browser Polyfills
 *
 * CRITICAL: This file must be imported FIRST in main.tsx
 * Sets up Node.js globals required by server-side packages in browser context
 */

import { Buffer } from 'buffer';

(window as any).Buffer = Buffer;
(globalThis as any).Buffer = Buffer;

(window as any).process = {
  env: {
    NODE_ENV: import.meta.env.MODE,
    DATABASE_URL: 'postgresql://mock',
    ...import.meta.env,
  },
  hrtime: {
    bigint: () => BigInt(Date.now() * 1000000),
  },
};

(window as any).global = globalThis;
