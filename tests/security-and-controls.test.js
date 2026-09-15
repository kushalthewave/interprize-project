/**
 * Input validation, attempt limits, movement direction and render sharpness.
 */
import { describe, it, expect } from 'vitest';
import { validateName, validateEmail } from '../src/services/auth/validate.js';
import { createThrottle, memoryStorage, describeWait } from '../src/services/auth/throttle.js';
import { moveDirection } from '../src/player/PlayerController.js';
import { adaptiveFloor, pixelRatioFor, PRESETS } from '../src/data/settings.js';
import { contentSecurityPolicy, scriptHash } from '../scripts/csp.mjs';

describe('Validation - names', () => {
  it('accepts real names, including other scripts and punctuation', () => {
    for (const n of ['Kushal Neupane', "Sarah O'Brien", 'Jean-Luc Picard', 'Dr. Aisha Khan', 'सुनिता श्रेष्ठ', 'José Álvarez']) {
      expect(validateName(n)).toMatchObject({ ok: true });
    }
  });

  it('tidies spacing', () => {
    expect(validateName('   Kushal    Neupane  ').value).toBe('Kushal Neupane');
  });

  it('refuses markup, control characters, digits-only and empty input', () => {
    for (const n of ['<img src=x onerror=alert(1)>', 'Kushal<script>', 'a\u0000b', '12345', '', '   ', '-Kushal', 'K']) {
      expect(validateName(n).ok).toBe(false);
    }
    expect(validateName(null).ok).toBe(false);
    expect(validateName({ toString: () => 'Kushal' }).ok).toBe(false);
  });

  it('caps the length', () => {
    expect(validateName('A'.repeat(32)).ok).toBe(true);
    expect(validateName('A'.repeat(33)).ok).toBe(false);
  });
});

describe('Validation - email addresses', () => {
  it('accepts ordinary addresses and lower-cases them', () => {
    expect(validateEmail('Kushal.Neupane+bth@Example.co.uk')).toEqual({ ok: true, value: 'kushal.neupane+bth@example.co.uk' });
    expect(validateEmail('  a@b.io ').value).toBe('a@b.io');
  });

  it('refuses malformed addresses', () => {
    for (const e of [
      'plainaddress', '@example.com', 'name@', 'name@example', 'name@@example.com', 'na me@example.com',
      'name@example..com', '.name@example.com', 'name.@example.com', 'name..x@example.com',
      'name@-example.com', 'name@example-.com', 'name@example.123', '<script>@x.com', 'name@exa mple.com',
    ]) {
      expect(validateEmail(e).ok, e).toBe(false);
    }
  });

  it('refuses over-long addresses', () => {
    expect(validateEmail(`${'a'.repeat(65)}@example.com`).ok).toBe(false);
    expect(validateEmail(`a@${'b'.repeat(250)}.com`).ok).toBe(false);
  });
});

describe('Attempt limits', () => {
  const mk = () => {
    const clock = { t: 1_000_000 };
    return { clock, th: createThrottle({ key: 'k', storage: memoryStorage(), now: () => clock.t }) };
  };

  it('allows four wrong attempts and locks on the fifth', () => {
    const { th } = mk();
    for (let i = 0; i < 4; i++) expect(th.fail().locked).toBe(false);
    const st = th.fail();
    expect(st.locked).toBe(true);
    expect(st.waitMs).toBe(30_000);
  });

  it('doubles each lock, up to five minutes', () => {
    const { th, clock } = mk();
    const waits = [];
    for (let lock = 0; lock < 6; lock++) {
      let st;
      for (let i = 0; i < 5; i++) st = th.fail();
      waits.push(st.waitMs);
      clock.t += st.waitMs + 1;
    }
    expect(waits).toEqual([30_000, 60_000, 120_000, 240_000, 300_000, 300_000]);
  });

  it('does not extend a lock with attempts made during it', () => {
    const { th, clock } = mk();
    for (let i = 0; i < 5; i++) th.fail();
    clock.t += 10_000;
    expect(th.fail().waitMs).toBe(20_000);
  });

  it('forgets everything after a success', () => {
    const { th } = mk();
    for (let i = 0; i < 4; i++) th.fail();
    th.succeed();
    expect(th.status()).toMatchObject({ locked: false, remaining: 5 });
  });

  it('survives a reload, and a corrupted record starts clean', () => {
    const storage = memoryStorage();
    const clock = { t: 5_000 };
    const a = createThrottle({ key: 'k', storage, now: () => clock.t });
    for (let i = 0; i < 5; i++) a.fail();
    const b = createThrottle({ key: 'k', storage, now: () => clock.t });
    expect(b.status().locked).toBe(true);

    storage.set('k', '{not json');
    expect(b.status()).toMatchObject({ locked: false, remaining: 5 });
  });

  it('describes the wait in words', () => {
    expect(describeWait(30_000)).toBe('30 seconds');
    expect(describeWait(1_000)).toBe('1 second');
    expect(describeWait(120_000)).toBe('2 minutes');
  });
});

describe('Movement - A and D go the right way', () => {
  const near = (v, x, z) => {
    expect(v.x).toBeCloseTo(x, 6);
    expect(v.z).toBeCloseTo(z, 6);
  };

  it('facing down -z (yaw 0): D is +x, A is -x, W is -z', () => {
    near(moveDirection(0, 0, 1), 1, 0);
    near(moveDirection(0, 0, -1), -1, 0);
    near(moveDirection(0, 1, 0), 0, -1);
  });

  it('after turning left 90° (facing -x): D is -z, the old forward', () => {
    near(moveDirection(Math.PI / 2, 1, 0), -1, 0);
    near(moveDirection(Math.PI / 2, 0, 1), 0, -1);
  });

  it('right is always 90° clockwise from forward, seen from above', () => {
    for (const yaw of [0.3, 1.7, -2.4, 3.9]) {
      const f = moveDirection(yaw, 1, 0);
      const r = moveDirection(yaw, 0, 1);
      // Cross product y-component of forward × right points down for a clockwise turn.
      expect(f.z * r.x - f.x * r.z).toBeCloseTo(-1, 6);
      expect(f.x * r.x + f.z * r.z).toBeCloseTo(0, 6);
    }
  });
});

describe('Sharpness - no blurry 3D view', () => {
  it('Auto never drops below the screen density on ordinary displays', () => {
    expect(adaptiveFloor(1)).toBe(1);
    expect(adaptiveFloor(1.25)).toBe(1.25);
    expect(adaptiveFloor(1.5)).toBe(1.5);
    // Only very dense screens give up a little, never below 1.5×.
    expect(adaptiveFloor(2)).toBe(1.5);
    expect(adaptiveFloor(3)).toBe(1.5);
  });

  it('no quality preset renders below native resolution', () => {
    for (const p of Object.values(PRESETS)) {
      expect(pixelRatioFor(p.renderScale, 1.5)).toBeGreaterThanOrEqual(1.5);
    }
  });
});

describe('Content-Security-Policy', () => {
  it('allows scripts only from the site itself, plus exact hashes', () => {
    const policy = contentSecurityPolicy();
    expect(policy).toContain("script-src 'self'");
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(policy).not.toMatch(/unsafe-eval/);
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("form-action 'none'");
    expect(contentSecurityPolicy({ scriptHashes: [scriptHash('x')] })).toContain(`'${scriptHash('x')}'`);
  });
});
