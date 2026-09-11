import { defineConfig } from 'vite';
import { serviceWorker } from './scripts/sw-plugin.mjs';

export default defineConfig({
  base: './',
  // Generates dist/sw.js so the installed / cached game works offline.
  plugins: [serviceWorker()],
  server: { port: 5173, open: false, host: true },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    reporters: 'default',
  },
});
