// Fast syntax gate: parses every source file with esbuild before we try a build.
import { transformSync } from 'esbuild';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (extname(p) === '.js') out.push(p);
  }
  return out;
}

const roots = process.argv.slice(2).length ? process.argv.slice(2) : ['src', 'tests', 'scripts'];
let bad = 0;
let n = 0;
for (const r of roots) {
  let files = [];
  try { files = walk(r); } catch { continue; }
  for (const f of files) {
    n++;
    try {
      transformSync(readFileSync(f, 'utf8'), { loader: 'js', format: 'esm', sourcefile: f });
    } catch (err) {
      bad++;
      console.error(`\nSYNTAX ERROR  ${f}`);
      for (const e of err.errors ?? []) {
        console.error(`  line ${e.location?.line}: ${e.text}`);
        if (e.location?.lineText) console.error(`  > ${e.location.lineText.trim()}`);
      }
    }
  }
}
console.log(`\nchecked ${n} files, ${bad} with syntax errors`);
process.exit(bad ? 1 : 0);
