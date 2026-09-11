/**
 * The five team-lead avatars: the data every screen relies on, the legacy
 * mapping for old profiles, and the SVG each portrait is drawn as.
 */
import { describe, it, expect } from 'vitest';
import {
  AVATARS, AVATAR_ORDER, DEFAULT_AVATAR, normaliseAvatar, getAvatar,
} from '../src/data/avatars.js';
import { avatarSVG } from '../src/ui/avatars.js';

describe('Avatars - data', () => {
  it('has exactly the five team leads, in order', () => {
    expect(AVATAR_ORDER).toEqual(['sarah', 'david', 'maria', 'james', 'aisha']);
    expect(Object.keys(AVATARS).sort()).toEqual([...AVATAR_ORDER].sort());
  });

  it('gives every avatar a name, a role and a prop to draw', () => {
    for (const id of AVATAR_ORDER) {
      const a = AVATARS[id];
      expect(a.id).toBe(id);
      expect(a.name.length).toBeGreaterThan(1);
      expect(a.role.length).toBeGreaterThan(3);
      expect(['firstaid', 'clipboard', 'extinguisher', 'radio']).toContain(a.prop);
    }
  });

  it('defaults to a real avatar', () => {
    expect(AVATARS[DEFAULT_AVATAR]).toBeTruthy();
  });

  it('passes a valid id straight through', () => {
    for (const id of AVATAR_ORDER) expect(normaliseAvatar(id)).toBe(id);
  });

  it('maps the legacy ids from the two-avatar version', () => {
    expect(normaliseAvatar('male')).toBe('david');
    expect(normaliseAvatar('female')).toBe('maria');
  });

  it('falls back to the default for anything unknown or missing', () => {
    for (const bad of [undefined, null, '', 'nobody', '__proto__', 'constructor']) {
      expect(normaliseAvatar(bad)).toBe(DEFAULT_AVATAR);
    }
  });

  it('getAvatar never returns undefined', () => {
    expect(getAvatar('nobody')).toBe(AVATARS[DEFAULT_AVATAR]);
  });
});

describe('Avatars - drawing', () => {
  it('draws a self-contained SVG for every avatar', () => {
    for (const id of AVATAR_ORDER) {
      const svg = avatarSVG(id);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      // No external references of any kind: the offline build has to work.
      expect(svg).not.toMatch(/href=|url\((?!#)/);
    }
  });

  it('labels each portrait for screen readers', () => {
    const svg = avatarSVG('aisha');
    expect(svg).toContain('role="img"');
    // The & in the role is escaped, so the markup stays valid.
    expect(svg).toContain('aria-label="Aisha, Radio &amp; Comms Lead"');
  });

  it('gives every drawing unique gradient and clip ids', () => {
    // Two copies of the same avatar on one page (menu + HUD) must not share
    // ids, or the second one clips against the first one's shapes.
    const ids = (s) => [...s.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    const a = ids(avatarSVG('sarah'));
    const b = ids(avatarSVG('sarah'));
    expect(a.length).toBeGreaterThan(0);
    for (const id of a) expect(b).not.toContain(id);
  });

  it('can omit the role badge for small chips', () => {
    expect(avatarSVG('james', { badge: false })).not.toContain('translate(101 101)');
    expect(avatarSVG('james')).toContain('translate(101 101)');
  });

  it('draws a legacy id as its mapped avatar', () => {
    expect(avatarSVG('male')).toContain('David');
  });
});
