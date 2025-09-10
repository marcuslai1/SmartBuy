import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,       // expose dev server on LAN (e.g., 192.168.x.x)
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', 
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => console.log('[proxy error]', err?.message));
          proxy.on('proxyRes', (res, req) =>
            console.log('[proxy]', req.method, req.url, '->', res.statusCode)
          );
        },
      },
    },
  },
});
