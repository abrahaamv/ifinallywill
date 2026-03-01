import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const prodUrls = {
    app: 'https://ifinallyWill.com',
    api: 'https://api.ifinallyWill.com',
  };

  const devUrls = {
    app: 'http://localhost:5177',
    api: 'http://localhost:3001',
  };

  const urls = mode === 'production' ? prodUrls : devUrls;

  return {
    plugins: [react(), tailwindcss()] as any,
    server: {
      port: 5177,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: false,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              const setCookie = proxyRes.headers['set-cookie'];
              if (setCookie) {
                proxyRes.headers['set-cookie'] = setCookie.map((cookie: string) => {
                  return cookie.replace(/; Secure/gi, '').replace(/; Domain=localhost/gi, '');
                });
              }
            });
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        buffer: 'buffer',
        perf_hooks: resolve(__dirname, './src/mocks/perf_hooks.ts'),
      },
    },
    define: {
      global: 'globalThis',
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      __VITE_APP_URL__: JSON.stringify(urls.app),
      __VITE_API_URL__: JSON.stringify(urls.api),
    },
    optimizeDeps: {
      include: ['buffer'],
      exclude: [
        '@platform/db',
        '@platform/auth',
        '@platform/knowledge',
        '@platform/realtime',
        'postgres',
        'drizzle-orm',
        'ioredis',
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
        define: {
          global: 'globalThis',
        },
      },
    },
  };
});
