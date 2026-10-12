import { defineConfig } from 'vite';
import { serviceWorker } from './scripts/sw-plugin.mjs';
import { csp } from './scripts/csp.mjs';

import { readFileSync } from 'node:fs';

/** Stamped into stored results so a report says which build produced them. */
const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Generates dist/sw.js so the installed / cached game works offline.
  plugins: [serviceWorker(), csp()],
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
