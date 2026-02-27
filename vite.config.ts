import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[proxy] Backend not ready yet:', err.message);
          });
        },
      },
    },
  },
});
