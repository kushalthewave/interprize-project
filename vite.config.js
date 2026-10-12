import { defineConfig } from 'vite';
import { serviceWorker } from './scripts/sw-plugin.mjs';
import { csp } from './scripts/csp.mjs';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
      // Two pages: the game, and the supervisor's records page. The records
      // page loads none of the 3D engine.
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
      },
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
