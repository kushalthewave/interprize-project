/**
 * QR encoder.
 *
 * The important tests here are the ROUND TRIPS: every generated code is handed
 * to `jsQR`, a real independent decoder, and must decode back to exactly the
 * input string. Structural assertions alone would not prove a code is
 * scannable — this does.
 *
 * jsQR is a devDependency used only by these tests; it is not in the bundle.
 */
import { describe, it, expect } from 'vitest';
import jsQRImport from 'jsqr';
import { encodeQR, qrToSVG } from '../src/services/auth/qr.js';
import { otpauthURI, randomBase32Secret } from '../src/services/auth/totp.js';
import { randomBase32Secret as randSecret } from '../src/services/auth/base32.js';

const jsQR = jsQRImport.default ?? jsQRImport;

/**
 * Turn a module matrix into the RGBA ImageData-alike jsQR expects.
 * A quiet zone is required or a real scanner (and jsQR) will not lock on.
 */
function toImageData(modules, size, { scale = 4, margin = 4 } = {}) {
  const dim = (size + margin * 2) * scale;
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255);
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const mx = Math.floor(x / scale) - margin;
      const my = Math.floor(y / scale) - margin;
      const dark = mx >= 0 && my >= 0 && mx < size && my < size && modules[my][mx];
      if (dark) {
        const i = (y * dim + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
      }
    }
  }
  return { data, width: dim, height: dim };
}

const roundTrip = (text, opts) => {
  const { modules, size } = encodeQR(text, opts);
  const img = toImageData(modules, size);
  const res = jsQR(img.data, img.width, img.height);
  return res?.data ?? null;
};

describe('QR — round trip through an independent decoder', () => {
  it('decodes a short string', () => {
    expect(roundTrip('HELLO')).toBe('HELLO');
  });

  it('decodes a realistic otpauth:// URI', () => {
    const uri = otpauthURI({
      secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
      account: 'Kushal Neupane',
      issuer: 'Beat The Hazard',
    });
    expect(roundTrip(uri)).toBe(uri);
  });

  it('decodes at EC level L as well as M', () => {
    const uri = otpauthURI({ secret: randSecret(), account: 'Trainee' });
    expect(roundTrip(uri, { ec: 'L' })).toBe(uri);
    expect(roundTrip(uri, { ec: 'M' })).toBe(uri);
  });

  it('decodes across a range of lengths, spanning several versions', () => {
    for (const len of [1, 10, 25, 60, 100, 150, 200]) {
      const text = 'A'.repeat(len);
      expect(roundTrip(text, { ec: 'L' }), `length ${len}`).toBe(text);
    }
  });

  it('decodes every version it selects from 1 to 10', () => {
    const seen = new Set();
    for (const len of [5, 20, 40, 65, 90, 115, 140, 175, 210, 250]) {
      const text = 'B'.repeat(len);
      const { version } = encodeQR(text, { ec: 'L' });
      seen.add(version);
      expect(roundTrip(text, { ec: 'L' }), `v${version} len ${len}`).toBe(text);
    }
    // Should have exercised a decent spread, not just one version.
    expect(seen.size).toBeGreaterThanOrEqual(6);
  });

  it('decodes content with URL punctuation and mixed case', () => {
    const s = 'otpauth://totp/A%20B%3AC?secret=MZXW6YTBOI&issuer=A%20B&digits=6';
    expect(roundTrip(s)).toBe(s);
  });

  it('decodes 100 random secrets without a single failure', () => {
    // The mask chosen depends on the data, so this exercises all 8 masks and
    // catches a mistake that only shows up on particular payloads.
    let failures = 0;
    for (let i = 0; i < 100; i++) {
      const uri = otpauthURI({ secret: randSecret(), account: `user${i}` });
      if (roundTrip(uri) !== uri) failures++;
    }
    expect(failures).toBe(0);
  });
});

describe('QR — structure', () => {
  it('sizes the matrix as 17 + 4 x version', () => {
    for (const len of [5, 40, 100]) {
      const { size, version } = encodeQR('C'.repeat(len), { ec: 'L' });
      expect(size).toBe(17 + version * 4);
    }
  });

  it('places all three finder patterns', () => {
    const { modules, size } = encodeQR('finder test');
    for (const [r0, c0] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
      // outer ring dark, inner ring light, 3x3 core dark
      expect(modules[r0][c0]).toBe(true);
      expect(modules[r0 + 1][c0 + 1]).toBe(false);
      expect(modules[r0 + 3][c0 + 3]).toBe(true);
    }
  });

  it('lays down alternating timing patterns', () => {
    const { modules, size } = encodeQR('timing test');
    for (let i = 8; i < size - 8; i++) {
      expect(modules[6][i]).toBe(i % 2 === 0);
      expect(modules[i][6]).toBe(i % 2 === 0);
    }
  });

  it('always sets the dark module', () => {
    const { modules, size } = encodeQR('dark module');
    expect(modules[size - 8][8]).toBe(true);
  });

  it('picks a mask in range', () => {
    const { mask } = encodeQR('mask range');
    expect(mask).toBeGreaterThanOrEqual(0);
    expect(mask).toBeLessThanOrEqual(7);
  });

  it('is deterministic for identical input', () => {
    const a = encodeQR('same input');
    const b = encodeQR('same input');
    expect(a.modules).toEqual(b.modules);
    expect(a.mask).toBe(b.mask);
  });

  it('chooses a larger version as content grows', () => {
    const small = encodeQR('x'.repeat(10), { ec: 'L' }).version;
    const large = encodeQR('x'.repeat(200), { ec: 'L' }).version;
    expect(large).toBeGreaterThan(small);
  });

  it('throws a clear error when the content cannot fit', () => {
    expect(() => encodeQR('z'.repeat(5000), { ec: 'L' })).toThrow(/too long/i);
  });
});

describe('QR — SVG output', () => {
  it('produces well-formed SVG with the right dimensions', () => {
    const svg = qrToSVG('svg test', { scale: 4, margin: 4 });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    const { size } = encodeQR('svg test');
    const dim = (size + 8) * 4;
    expect(svg).toContain(`width="${dim}"`);
    expect(svg).toContain(`viewBox="0 0 ${dim} ${dim}"`);
  });

  it('emits drawing commands for the dark modules', () => {
    expect(qrToSVG('path test')).toMatch(/<path d="M/);
  });
});
