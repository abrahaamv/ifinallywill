import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5176,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    exclude: [
      // Exclude Node.js native modules from auth package (server-side only)
      'bcryptjs',
      'argon2',
      '@mapbox/node-pre-gyp',
      'mock-aws-s3',
      'aws-sdk',
      'nock',
    ],
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PlatformWidget',
      formats: ['es', 'umd'],
      fileName: (format) => `widget-sdk.${format}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        // Exclude Node.js native modules (server-side only)
        'bcryptjs',
        'argon2',
        '@mapbox/node-pre-gyp',
        'mock-aws-s3',
        'aws-sdk',
        'nock',
      ],
      output: {
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
        assetFileNames: 'widget-sdk.[ext]',
      },
    },
    // Extract CSS to separate file for CDN delivery
    cssCodeSplit: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    sourcemap: true,
  },
});
