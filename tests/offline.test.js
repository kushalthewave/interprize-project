/**
 * Offline play: the generated service worker, and the offline single-file
 * build's document shell.
 *
 * The service worker is run in a simulated worker scope (fake caches, a fake
 * network that can be switched off) because the test browser available to us
 * does not support service workers. This checks the worker's own logic:
 * precaching, serving the game with the network gone, and clearing old caches.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { serviceWorker } from '../scripts/sw-plugin.mjs';

const ORIGIN = 'https://example.test';
const SCOPE = `${ORIGIN}/interprize-project/`;

function generate(files) {
  let source = null;
  const plugin = serviceWorker();
  const bundle = Object.fromEntries(files.map((f) => [f, {}]));
  plugin.generateBundle.call({ emitFile: (f) => { source = f.source; } }, {}, bundle);
  return source;
}

/** A minimal worker scope: caches, a switchable network, event dispatch. */
function makeWorker(source, serverFiles) {
  const stores = new Map();
  const net = { online: true, requests: 0 };
  const resp = (body, status = 200) => ({
    ok: status >= 200 && status < 300, status, body,
    clone() { return resp(body, status); },
  });
  const keyOf = (r) => new URL(typeof r === 'string' ? r : r.url, SCOPE).href;

  const cacheApi = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return {
      async add(req) {
        const res = await fakeFetch(req);
        if (!res.ok) throw new Error('bad status');
        m.set(keyOf(req), res);
      },
      async put(req, res) { m.set(keyOf(req), res); },
      async match(req) { return m.get(keyOf(req)); },
      async keys() { return [...m.keys()].map((url) => ({ url })); },
    };
  };
  const caches = {
    open: async (n) => cacheApi(n),
    keys: async () => [...stores.keys()],
    delete: async (n) => stores.delete(n),
    match: async (req) => {
      for (const n of stores.keys()) {
        const hit = await cacheApi(n).match(req);
        if (hit) return hit;
      }
      return undefined;
    },
  };
  async function fakeFetch(req) {
    net.requests++;
    if (!net.online) throw new TypeError('Failed to fetch');
    const path = new URL(keyOf(req)).pathname.replace('/interprize-project/', '') || 'index.html';
    const file = path === '' ? 'index.html' : path;
    return serverFiles.has(file) ? resp(`<${file}>`) : resp('not found', 404);
  }

  const handlers = {};
  const self = {
    location: new URL(`${SCOPE}sw.js`),
    registration: { scope: SCOPE },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (t, fn) => { handlers[t] = fn; },
  };
  const ctx = { self, caches, fetch: fakeFetch, Request: class { constructor(u) { this.url = new URL(u, SCOPE).href; } }, URL, console };
  vm.runInNewContext(source, ctx);

  const fire = async (type, extra = {}) => {
    let waited = null;
    let responded = null;
    const ev = { ...extra, waitUntil: (p) => { waited = p; }, respondWith: (p) => { responded = p; } };
    handlers[type](ev);
    if (waited) await waited;
    return responded ? await responded : undefined;
  };
  return { fire, net, stores, caches };
}

const FILES = ['assets/index-abc.js', 'assets/three-def.js', 'assets/index-ghi.css', 'index.html'];
const SERVER = new Set([...FILES, 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png']);

describe('Service worker - generation', () => {
  it('lists every built file plus the app shell', () => {
    const src = generate(FILES);
    for (const f of FILES) expect(src).toContain(`./${f}`);
    expect(src).toContain('"./"');
    expect(src).toContain('./manifest.webmanifest');
  });

  it('changes its cache name when the build changes, so updates arrive', () => {
    const a = generate(FILES).match(/bth-[0-9a-f]+/)[0];
    const b = generate([...FILES, 'assets/new-chunk.js']).match(/bth-[0-9a-f]+/)[0];
    expect(a).not.toBe(b);
  });
});

describe('Service worker - offline behaviour', () => {
  let w;
  beforeAll(async () => {
    w = makeWorker(generate(FILES), SERVER);
    await w.fire('install');
    await w.fire('activate');
  });

  const req = (path, mode = 'no-cors') => ({ request: { method: 'GET', url: `${SCOPE}${path}`, mode } });

  it('stores every game file on install', async () => {
    const [name] = await w.caches.keys();
    const cached = [...w.stores.get(name).keys()].map((u) => u.replace(SCOPE, ''));
    for (const f of FILES) expect(cached).toContain(f);
  });

  it('opens the game with the network switched off', async () => {
    w.net.online = false;
    const page = await w.fire('fetch', req('', 'navigate'));
    expect(page?.body).toBe('<index.html>');
    const js = await w.fire('fetch', req('assets/three-def.js'));
    expect(js?.body).toBe('<assets/three-def.js>');
    w.net.online = true;
  });

  it('serves hashed files from the cache without touching the network', async () => {
    const before = w.net.requests;
    await w.fire('fetch', req('assets/index-abc.js'));
    expect(w.net.requests).toBe(before);
  });

  it('leaves other origins and the company website alone', async () => {
    const other = await w.fire('fetch', { request: { method: 'GET', url: 'https://accounts.google.com/gsi/client', mode: 'no-cors' } });
    const site = await w.fire('fetch', req('company/index.html', 'navigate'));
    expect(other).toBeUndefined();
    expect(site).toBeUndefined();
  });

  it('removes the previous version’s cache when a new one activates', async () => {
    const w2 = makeWorker(generate([...FILES, 'assets/v2.js']), new Set([...SERVER, 'assets/v2.js']));
    // Seed an old cache as if the previous build had run.
    await (await w2.caches.open('bth-oldversion0')).put(`${SCOPE}index.html`, { body: 'old', clone() { return this; } });
    await w2.fire('install');
    await w2.fire('activate');
    expect(await w2.caches.keys()).not.toContain('bth-oldversion0');
  });

  it('survives a missing file during install instead of caching nothing', async () => {
    const w3 = makeWorker(generate([...FILES, 'assets/missing.js']), SERVER);
    await w3.fire('install');
    const [name] = await w3.caches.keys();
    expect(w3.stores.get(name).size).toBeGreaterThan(4);
  });
});

describe('Offline single-file build', () => {
  const path = 'dist-single/beat-the-hazard.html';
  const built = existsSync(path);

  it.skipIf(!built)('starts with a doctype, so it never renders in quirks mode', () => {
    expect(readFileSync(path, 'utf8').slice(0, 15).toLowerCase()).toBe('<!doctype html>');
  });

  it.skipIf(!built)('declares UTF-8 in the first 1024 bytes, so text survives being opened from disk', () => {
    const head = readFileSync(path).subarray(0, 1024).toString('utf8');
    expect(head).toMatch(/<meta charset="utf-8"/i);
  });

  it.skipIf(!built)('loads nothing from the network', () => {
    const html = readFileSync(path, 'utf8');
    expect(html).not.toMatch(/<script[^>]+\bsrc=/i);
    expect(html).not.toMatch(/<link[^>]+rel="?stylesheet/i);
  });
});
