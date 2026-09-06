/**
 * build-singlefile.mjs
 * Inlines the Vite build into ONE self-contained HTML page with no external
 * requests - needed for hosts that serve a single document (and for handing
 * someone a file they can just open).
 *
 * Run after `vite build --config vite.single.config.js`.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'dist-single';
const OUT = join(SRC, 'beat-the-hazard.html');

const assetDir = join(SRC, 'assets');
const files = readdirSync(assetDir);
const jsFiles = files.filter((f) => f.endsWith('.js'));
const cssFiles = files.filter((f) => f.endsWith('.css'));

if (jsFiles.length !== 1) {
  throw new Error(`expected exactly 1 JS chunk, got ${jsFiles.length}: ${jsFiles.join(', ')}`);
}

const js = readFileSync(join(assetDir, jsFiles[0]), 'utf8');
const css = cssFiles.map((f) => readFileSync(join(assetDir, f), 'utf8')).join('\n');

// A literal </script> inside the bundle would terminate the inline tag early.
const safeJs = js.replace(/<\/script/gi, '<\/script');

const html = `<title>Beat The Hazard</title>
<meta name="description" content="3D interactive warehouse forklift and pedestrian safety training game." />
<style>
${css}
</style>

<canvas id="scene" aria-label="3D warehouse view"></canvas>
<div id="ui"></div>

<noscript>
  <div style="position:fixed;inset:0;display:grid;place-items:center;background:#0b0f14;color:#e9eef4;font-family:system-ui,sans-serif;padding:2rem;text-align:center">
    <div><h1 style="color:#f2b90c">Beat The Hazard</h1><p>This training game needs JavaScript enabled to run.</p></div>
  </div>
</noscript>

<div id="boot-fallback" style="position:fixed;inset:0;display:grid;place-items:center;background:#0b0f14;color:#97a4b2;font-family:system-ui,sans-serif;z-index:5">
  <div style="text-align:center">
    <div style="font-size:1.6rem;font-weight:800;color:#f2b90c;margin-bottom:.5rem">BEAT THE HAZARD</div>
    <div>Starting…</div>
  </div>
</div>

<script type="module">
${safeJs}
</script>
`;

mkdirSync(SRC, { recursive: true });
writeFileSync(OUT, html);

const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
console.log(`single-file build → ${OUT}`);
console.log(`  css ${kb(css.length)} · js ${kb(js.length)} · total ${kb(html.length)}`);
