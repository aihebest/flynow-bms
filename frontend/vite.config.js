import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to backend during local development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/webhooks': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:  ['react', 'react-dom', 'react-router-dom'],
          msal:    ['@azure/msal-browser', '@azure/msal-react'],
        },
      },
    },
  },
});
