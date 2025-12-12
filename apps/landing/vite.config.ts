import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  // Production URLs for deployment
  const prodUrls = {
    meeting: 'https://meet.visualkit.live',
    dashboard: 'https://dashboard.visualkit.live',
    landing: 'https://visualkit.live',
  };

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    // In production mode, hardcode the production URLs
    define: mode === 'production' ? {
      '__VITE_MEET_URL__': JSON.stringify(prodUrls.meeting),
      '__VITE_DASHBOARD_URL__': JSON.stringify(prodUrls.dashboard),
      '__VITE_APP_URL__': JSON.stringify(prodUrls.landing),
    } : {
      '__VITE_MEET_URL__': JSON.stringify('http://localhost:5175'),
      '__VITE_DASHBOARD_URL__': JSON.stringify('http://localhost:5174'),
      '__VITE_APP_URL__': JSON.stringify('http://localhost:5173'),
    },
  };
});
