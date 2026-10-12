/**
 * security.js
 * Browser-side defences that have to run before anything else does.
 *
 * The game is published on GitHub Pages, which serves static files and lets
 * us set no HTTP headers of our own. The Content-Security-Policy therefore
 * travels in a <meta> tag, and a meta policy silently ignores
 * `frame-ancestors` - the one directive that would stop another site putting
 * this page inside an invisible iframe over their own buttons. There is also
 * no X-Frame-Options header to fall back on.
 *
 * So the check is done here instead: if the page is not the top-level
 * document, it refuses to run and says why. It is the same defence the
 * header would give, minus the guarantee that it runs before any paint -
 * which is why main.js calls it as its first statement.
 */

/**
 * Is this document inside a frame? Treats a cross-origin failure as yes.
 *
 * `win` is injectable so the behaviour can be tested without a real browser.
 *
 * @param {Window} [win]
 */
export function isFramed(win = globalThis) {
  try {
    return win.top !== win.self;
  } catch {
    // Reading window.top across origins throws, which only happens when a
    // page from another origin is framing us. That is exactly the case we
    // are defending against.
    return true;
  }
}

/**
 * Stop the game loading inside someone else's page.
 *
 * @param {object} [o]
 * @param {Window} [o.win]
 * @param {Document} [o.doc]
 * @param {string} [o.url] where "open it properly" should point
 * @returns {boolean} true when the page is top level and the caller may boot
 */
export function enforceTopLevel({
  win = globalThis,
  doc = win.document,
  url = win.location?.href ?? './',
} = {}) {
  if (!isFramed(win)) return true;

  doc.documentElement.replaceChildren(doc.createElement('head'), doc.createElement('body'));
  const body = doc.body;
  body.style.cssText =
    'margin:0;min-height:100vh;display:grid;place-items:center;padding:2rem;'
    + 'background:#f0f2f5;color:#1c1e21;font-family:system-ui,sans-serif;text-align:center';

  const wrap = doc.createElement('div');
  wrap.style.maxWidth = '34rem';

  const h = doc.createElement('h1');
  h.style.cssText = 'font-size:1.4rem;margin:0 0 .6rem';
  h.textContent = 'Beat The Hazard cannot run inside another site';

  const p = doc.createElement('p');
  p.style.cssText = 'line-height:1.6;margin:0 0 1.2rem;color:#65676b';
  p.textContent =
    'This page was opened inside a frame on another website. Training is '
    + 'refused in that case, because a page you cannot see could be sitting '
    + 'over the controls. Open the game directly instead.';

  const a = doc.createElement('a');
  a.href = url;
  a.target = '_top';
  a.rel = 'noopener';
  a.textContent = 'Open Beat The Hazard';
  a.style.cssText =
    'display:inline-block;padding:.7rem 1.4rem;border-radius:6px;'
    + 'background:#1877f2;color:#fff;text-decoration:none;font-weight:600';

  wrap.append(h, p, a);
  body.append(wrap);
  return false;
}
