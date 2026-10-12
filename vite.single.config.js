// Build variant that emits ONE JS chunk so the whole game can be inlined into
// a single self-contained HTML page (see scripts/build-singlefile.mjs).
import { defineConfig } from 'vite';

import { readFileSync } from 'node:fs';

/** Stamped into stored results so a report says which build produced them. */
const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    target: 'es2022',
    outDir: 'dist-single',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 100000000, // inline every asset
    cssCodeSplit: false,
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
});
