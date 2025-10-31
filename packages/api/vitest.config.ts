import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    alias: {
      '@platform/auth':
        '/home/abrahaam/Documents/GitHub/platform/packages/api/src/__tests__/mocks/auth.mock.ts',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.*',
        '**/tests/**',
        '**/__tests__/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    // Use development environment with test-specific configurations
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ||
        process.env.DATABASE_URL ||
        'postgresql://platform:platform_dev_password@localhost:5432/platform',
      REDIS_URL: process.env.TEST_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'test-secret-key-for-testing-only',
      APP_URL: 'http://localhost:5173',
      DASHBOARD_URL: 'http://localhost:5174',
      MEET_URL: 'http://localhost:5175',
      WIDGET_URL: 'http://localhost:5176',
    },
  },
});
