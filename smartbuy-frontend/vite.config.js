import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const base = process.env.VITE_BASE_URL || '/SmartBuy/';

export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});