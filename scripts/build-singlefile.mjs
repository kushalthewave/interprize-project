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
import { contentSecurityPolicy, scriptHash, cspMeta, META_REFERRER } from './csp.mjs';

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

// The doctype and the charset declaration are not decoration.
//
// Served from a web server, the page is labelled UTF-8 by the HTTP header, so
// it looked fine online. Downloaded and opened from disk there is no header,
// and without <meta charset> the browser guessed windows-1252: every non-ASCII
// character came out garbled — the Nepal flag as "ÐŸ‡³ÐŸ‡Μ", "·" as "Â·", and
// the Devanagari signage in the warehouse. Without the doctype the page also
// rendered in quirks mode.
//
// Browsers only honour a <meta charset> that appears within the first 1024
// bytes of the file, so it goes first, and the checks below enforce that.
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
${cspMeta(contentSecurityPolicy({ scriptHashes: [scriptHash(`\n${safeJs}\n`)] }))}
${META_REFERRER}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#1877f2" />
<meta name="bth-build" content="offline-single-file" />
<title>Beat The Hazard</title>
<meta name="description" content="3D interactive warehouse forklift and pedestrian safety training game. This file runs offline." />
<style>
${css}
</style>
</head>
<body>

<canvas id="scene" aria-label="3D warehouse view"></canvas>
<div id="ui"></div>

<noscript>
  <div style="position:fixed;inset:0;display:grid;place-items:center;background:#f0f2f5;color:#1c1e21;font-family:system-ui,sans-serif;padding:2rem;text-align:center">
    <div><h1 style="color:#1877f2">Beat The Hazard</h1><p>This training game needs JavaScript enabled to run.</p></div>
  </div>
</noscript>

<div id="boot-fallback" style="position:fixed;inset:0;display:grid;place-items:center;background:#f0f2f5;color:#65676b;font-family:system-ui,sans-serif;z-index:5">
  <div style="text-align:center">
    <div style="font-size:1.6rem;font-weight:800;color:#1877f2;margin-bottom:.5rem">Beat The Hazard</div>
    <div>Starting…</div>
  </div>
</div>

<script type="module">
${safeJs}
</script>
</body>
</html>
`;

/* ---- refuse to ship a file that will break when opened from disk ---- */
const head = Buffer.from(html, 'utf8').subarray(0, 1024).toString('utf8');
const problems = [];
if (!/^<!doctype html>/i.test(html)) problems.push('missing <!doctype html> (the page would render in quirks mode)');
if (!/<meta charset="utf-8"/i.test(head)) problems.push('<meta charset="utf-8"> is not within the first 1024 bytes');
if (/<script[^>]+\bsrc=/i.test(html)) problems.push('an external <script src> would need the network');
{
  // The inline script must be exactly the text the policy's hash was made from.
  const m = /<script type="module">([\s\S]*?)<\/script>\s*<\/body>/.exec(html);
  if (!m || !html.includes(scriptHash(m[1]))) problems.push('the Content-Security-Policy hash does not match the inline script');
}
if (/<link[^>]+rel="?stylesheet[^>]+href=/i.test(html)) problems.push('an external stylesheet would need the network');
if (problems.length) {
  console.error('single-file build is NOT safe to open offline:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}

mkdirSync(SRC, { recursive: true });
writeFileSync(OUT, html, 'utf8');
// A copy next to index.html, so the project folder has a file you can simply
// double-click to play. Not committed: it is rebuilt from the source.
writeFileSync('beat-the-hazard.html', html, 'utf8');

const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
console.log(`single-file build → ${OUT} (and ./beat-the-hazard.html to double-click)`);
console.log(`  css ${kb(css.length)} · js ${kb(js.length)} · total ${kb(html.length)}`);
