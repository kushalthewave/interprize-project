/**
 * sw-plugin.mjs — writes dist/sw.js at build time.
 *
 * The service worker is what lets the online version keep working with no
 * internet after one visit, and what makes "Install app" possible. It has to
 * know the exact file names Vite produced (they carry content hashes), so it
 * is generated from the bundle rather than written by hand. The cache name is
 * derived from those names: a new build means a new cache, and the old one is
 * deleted when the new worker takes over.
 */
import { createHash } from 'node:crypto';

export function serviceWorker() {
  return {
    name: 'bth-service-worker',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle)
        .filter((f) => !f.endsWith('.map'))
        .map((f) => `./${f}`);
      // Static files copied from public/ are not in the bundle.
      const statics = [
        './',
        './index.html',
        './manifest.webmanifest',
        './icons/icon-192.png',
        './icons/icon-512.png',
        './icons/icon-maskable-512.png',
        './icons/apple-touch-icon.png',
      ];
      const precache = [...new Set([...statics, ...files])];
      const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 12);

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: swSource(version, precache),
      });
    },
  };
}

function swSource(version, precache) {
  return `/* Beat The Hazard — offline service worker. Generated at build time; do not edit. */
const CACHE = 'bth-${version}';
const PRECACHE = ${JSON.stringify(precache, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // One file at a time, so a single missing file cannot abort the whole
    // install and leave nothing cached.
    await Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('bth-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // sign-in providers etc.
  if (!url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  if (url.pathname.includes('/company/')) return;             // the company website

  // Pages: try the network so an update arrives, fall back to the cached game.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
        return res;
      } catch {
        return (await caches.match(req)) || (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  // Everything else: cache first — the files are content-hashed, so a cached
  // copy is never stale — and remember anything new that was fetched.
  event.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  })());
});
`;
}
