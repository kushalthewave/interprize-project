// Build variant that emits ONE JS chunk so the whole game can be inlined into
// a single self-contained HTML page (see scripts/build-singlefile.mjs).
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
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
