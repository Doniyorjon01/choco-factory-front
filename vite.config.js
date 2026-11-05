import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser calls http://localhost:5173/api/...
// and Vite forwards it to the backend (so there is no CORS problem).
// Backend address can be changed with API_TARGET in a .env file.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = {
    '/api': {
      target: env.API_TARGET || 'http://127.0.0.1:8020',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  };
  return {
    plugins: [react()],
    server: { host: '127.0.0.1', port: 5173, proxy },
    preview: { host: '127.0.0.1', port: 4173, proxy },
  };
});
