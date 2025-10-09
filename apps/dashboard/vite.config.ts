import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Polyfill Node.js globals for browser
      buffer: 'buffer',
      // Mock Node.js built-in modules for browser (absolute paths for monorepo)
      perf_hooks: resolve(__dirname, './src/mocks/perf_hooks.ts'),
    },
  },
  define: {
    // Polyfill Node.js globals for browser (polyfills.ts handles Buffer and process)
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    include: [
      // Include buffer polyfill for pre-bundling (needed by bcryptjs)
      'buffer',
    ],
    exclude: [
      // Exclude backend-only packages (server-side only)
      '@platform/db',
      '@platform/auth',
      '@platform/knowledge',
      '@platform/realtime',
      'postgres',
      'drizzle-orm',
      'ioredis',
      // Exclude Node.js native modules and crypto libraries
      'argon2',
      '@node-rs/argon2',
      'bcryptjs',
      'bcrypt',
      'otpauth',
      'qrcode',
      '@mapbox/node-pre-gyp',
      'mock-aws-s3',
      'aws-sdk',
      'nock',
    ],
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
});
