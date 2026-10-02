import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site under /SmartBuy/; override with VITE_BASE_URL.
const base = process.env.VITE_BASE_URL || '/SmartBuy/';

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
