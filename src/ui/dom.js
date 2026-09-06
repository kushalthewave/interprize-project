/**
 * dom.js
 * A ~40 line DOM helper. The UI is plain DOM on purpose: the game loop owns
 * the frame budget, and a virtual-DOM framework would add weight and a render
 * cadence we do not want fighting requestAnimationFrame.
 */

/**
 * @param {string} tag  'div#id.card.wide' style selector; tag, id and classes
 *                      are all optional ('.card' and '#hud' both work)
 * @param {object} [props] attributes; `text`, `html`, `on` and `style` are special
 * @param {(Node|string|null|false)[]} [children]
 */
export function el(tag, props = {}, children = []) {
  // Split on '.' and '#' while keeping the delimiters, so 'div#hud.a.b' parses.
  const m = /^([a-zA-Z][a-zA-Z0-9-]*)?(?:#([^.#]+))?((?:\.[^.#]+)*)$/.exec(tag);
  if (!m) throw new Error(`el(): cannot parse selector "${tag}"`);
  const [, name, id, classStr] = m;
  const classes = classStr ? classStr.slice(1).split('.') : [];

  const node = document.createElement(name || 'div');
  if (id) node.id = id;
  if (classes.length) node.className = classes.join(' ');

  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'class') node.className = [node.className, v].filter(Boolean).join(' ');
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k in node && k !== 'list') node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }

  for (const c of children.flat(Infinity)) {
    if (c == null || c === false || c === '') continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function mount(parent, ...nodes) {
  clear(parent).append(...nodes.flat(Infinity).filter(Boolean));
  return parent;
}

/** Escape user-supplied text before it goes anywhere near innerHTML. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** 12.3 -> "12.3s" ; null -> "-" */
export function secs(v, digits = 1) {
  return v == null ? '—' : `${v.toFixed(digits)}s`;
}

export function pct(v) {
  return `${Math.round((v ?? 0) * 100)}%`;
}
