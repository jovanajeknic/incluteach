/// <reference types="vitest/config" />
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The browser sees one address: /api/... is forwarded to the backend, so the session cookie
// works as usual and the server needs no CORS settings. The server has no /api in its paths.
const apiProxy = {
  '/api': {
    target: 'http://localhost:3000',
    rewrite: (requestPath: string) => requestPath.replace(/^\/api/, ''),
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Room for the slower lazy-route tests when every file runs in parallel.
    testTimeout: 15000,
  },
});
