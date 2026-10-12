/**
 * The clickjacking guard.
 *
 * GitHub Pages sends no X-Frame-Options, and a <meta> Content-Security-Policy
 * ignores frame-ancestors, so this check inside the page is the whole
 * defence. These tests pin the cases that matter: top level runs, framed does
 * not, and a cross-origin parent (reading it throws) counts as framed.
 */
import { describe, it, expect } from 'vitest';
import { isFramed, enforceTopLevel } from '../src/services/security.js';

/** The smallest document the guard can build its message in. */
function fakeDocument() {
  const make = (tag) => ({
    tagName: tag.toUpperCase(),
    children: [],
    style: { cssText: '' },
    textContent: '',
    append(...kids) { this.children.push(...kids); },
    replaceChildren(...kids) { this.children = [...kids]; },
  });

  const doc = { body: make('body'), documentElement: make('html'), createElement: make };
  doc.documentElement.replaceChildren = (...kids) => {
    doc.documentElement.children = [...kids];
    const body = kids.find((k) => k.tagName === 'BODY');
    if (body) doc.body = body;
  };
  return doc;
}

const topLevel = () => {
  const win = { location: { href: 'https://example.test/game/' } };
  win.self = win;
  win.top = win;
  return win;
};

const framed = () => {
  const win = { location: { href: 'https://example.test/game/' } };
  win.self = win;
  win.top = { name: 'someone-elses-page' };
  return win;
};

const crossOriginParent = () => {
  const win = { location: { href: 'https://example.test/game/' } };
  win.self = win;
  Object.defineProperty(win, 'top', {
    get() { throw new Error('Blocked a frame with origin from accessing a cross-origin frame.'); },
  });
  return win;
};

/** Every bit of text in the tree, so assertions do not depend on structure. */
function textOf(node) {
  return [node.textContent, ...node.children.map(textOf)].join(' ');
}

function allNodes(node) {
  return [node, ...node.children.flatMap(allNodes)];
}

describe('Frame guard', () => {
  it('reports top level when the page is not framed', () => {
    expect(isFramed(topLevel())).toBe(false);
  });

  it('reports framed when the top window is a different window', () => {
    expect(isFramed(framed())).toBe(true);
  });

  it('treats a cross-origin parent as framed rather than assuming safety', () => {
    expect(isFramed(crossOriginParent())).toBe(true);
  });

  it('lets the game boot at top level and touches nothing', () => {
    const doc = fakeDocument();
    expect(enforceTopLevel({ win: topLevel(), doc })).toBe(true);
    expect(doc.body.children).toHaveLength(0);
  });

  it('refuses to boot when framed, and explains why', () => {
    const doc = fakeDocument();

    expect(enforceTopLevel({ win: framed(), doc })).toBe(false);

    expect(textOf(doc.body)).toContain('cannot run inside another site');
    const link = allNodes(doc.body).find((n) => n.tagName === 'A');
    expect(link.href).toBe('https://example.test/game/');
    expect(link.target).toBe('_top');
  });

  it('also refuses when the parent is cross-origin', () => {
    const doc = fakeDocument();
    expect(enforceTopLevel({ win: crossOriginParent(), doc })).toBe(false);
  });

  it('replaces the page rather than adding to it, so nothing underneath stays clickable', () => {
    const doc = fakeDocument();
    doc.body.append(doc.createElement('canvas'));

    enforceTopLevel({ win: framed(), doc });

    expect(allNodes(doc.body).map((n) => n.tagName)).not.toContain('CANVAS');
  });
});
