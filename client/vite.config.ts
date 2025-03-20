import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://backend-production-2463.up.railway.app/',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'https://backend-production-2463.up.railway.app/',
        ws: true,
      }
    }
  },
});