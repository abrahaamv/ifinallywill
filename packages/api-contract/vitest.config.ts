import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@platform/shared': path.resolve(__dirname, '../shared/src'),
      '@platform/db': path.resolve(__dirname, '../db/src'),
      '@platform/auth': path.resolve(__dirname, '../auth/src'),
      '@platform/ai-core': path.resolve(__dirname, '../ai-core/src'),
      '@platform/knowledge': path.resolve(__dirname, '../knowledge/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    env: {
      // Load .env file from project root
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
