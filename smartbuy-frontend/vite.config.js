import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages deployment:
// Set VITE_BASE_URL environment variable to your repo name, e.g., '/smartbuy/'
// Or change the base value below directly
const base = process.env.VITE_BASE_URL || '/';

export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Proxy only used in development (not needed for static deployment)
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
