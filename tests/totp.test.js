/**
 * TOTP / HOTP / Base32.
 *
 * Pinned to the official RFC test vectors — if these pass, a real
 * authenticator app will agree with us.
 */
import { describe, it, expect } from 'vitest';
import { base32Encode, base32Decode, randomBase32Secret, formatSecret } from '../src/services/auth/base32.js';
import { hotp, totp, verifyTotp, otpauthURI, secondsRemaining, timingSafeEqual } from '../src/services/auth/totp.js';

const enc = (s) => new TextEncoder().encode(s);

describe('Base32 — RFC 4648 test vectors', () => {
  const vectors = [
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI'],
  ];

  for (const [plain, encoded] of vectors) {
    it(`encodes ${JSON.stringify(plain)} to ${encoded || '(empty)'}`, () => {
      expect(base32Encode(enc(plain))).toBe(encoded);
    });
    it(`decodes ${encoded || '(empty)'} back to ${JSON.stringify(plain)}`, () => {
      expect(new TextDecoder().decode(base32Decode(encoded))).toBe(plain);
    });
  }

  it('pads to a multiple of 8 when asked', () => {
    expect(base32Encode(enc('foobar'), true)).toBe('MZXW6YTBOI======');
  });

  it('accepts lowercase, spaces and padding when decoding', () => {
    // People retype these by hand off a screen.
    expect(new TextDecoder().decode(base32Decode('mzxw 6ytb oi=='))).toBe('foobar');
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => base32Decode('MZXW60!')).toThrow(/Invalid Base32/);
  });

  it('generates 160-bit secrets by default', () => {
    const s = randomBase32Secret();
    expect(s).toMatch(/^[A-Z2-7]+$/);
    expect(base32Decode(s).length).toBe(20);
  });

  it('generates a different secret each time', () => {
    expect(randomBase32Secret()).not.toBe(randomBase32Secret());
  });

  it('formats a secret into readable 4-character groups', () => {
    expect(formatSecret('MZXW6YTBOIMZXW6Y')).toBe('MZXW 6YTB OIMZ XW6Y');
  });
});

describe('HOTP — RFC 4226 Appendix D test vectors', () => {
  // Secret is the ASCII string "12345678901234567890".
  const key = enc('12345678901234567890');
  const expected = [
    '755224', '287082', '359152', '969429', '338314',
    '254676', '287922', '162583', '399871', '520489',
  ];

  expected.forEach((code, counter) => {
    it(`counter ${counter} produces ${code}`, async () => {
      expect(await hotp(key, counter, { digits: 6 })).toBe(code);
    });
  });
});

describe('TOTP — RFC 6238 Appendix B test vectors (SHA-1)', () => {
  // The RFC uses the same "12345678901234567890" secret, as Base32.
  const secret = base32Encode(enc('12345678901234567890'));

  const vectors = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ];

  for (const [time, code] of vectors) {
    it(`T=${time} produces ${code}`, async () => {
      expect(await totp(secret, { time, digits: 8 })).toBe(code);
    });
  }

  it('produces the 6-digit tail of the 8-digit vector', async () => {
    // A 6-digit code is not simply the last 6 of the 8-digit one — the modulus
    // differs — so this pins the 6-digit path separately.
    const six = await totp(secret, { time: 59, digits: 6 });
    expect(six).toBe('287082');
    expect(six).toHaveLength(6);
  });
});

describe('TOTP — stepping and verification', () => {
  const secret = base32Encode(enc('12345678901234567890'));

  // 1600000020 is exactly divisible by 30, so it is a period boundary.
  // (1600000000 is NOT - it sits 10s into the previous step.)
  const BOUNDARY = 1600000020;

  it('returns the same code throughout one 30-second period', async () => {
    const a = await totp(secret, { time: BOUNDARY });
    const b = await totp(secret, { time: BOUNDARY + 29 });
    expect(a).toBe(b);
  });

  it('changes when the period rolls over', async () => {
    const a = await totp(secret, { time: BOUNDARY + 29 });
    const b = await totp(secret, { time: BOUNDARY + 30 });
    expect(a).not.toBe(b);
  });

  it('accepts the current code', async () => {
    const t = 1600000000;
    const code = await totp(secret, { time: t });
    expect(await verifyTotp(secret, code, { time: t })).toEqual({ valid: true, delta: 0 });
  });

  it('tolerates one step of clock drift in each direction', async () => {
    const t = 1600000000;
    const prev = await totp(secret, { time: t - 30 });
    const next = await totp(secret, { time: t + 30 });
    expect((await verifyTotp(secret, prev, { time: t })).delta).toBe(-1);
    expect((await verifyTotp(secret, next, { time: t })).delta).toBe(1);
  });

  it('rejects a code two steps out with the default window', async () => {
    const t = 1600000000;
    const old = await totp(secret, { time: t - 90 });
    expect((await verifyTotp(secret, old, { time: t })).valid).toBe(false);
  });

  it('rejects a wrong code', async () => {
    expect((await verifyTotp(secret, '000000', { time: 1600000000 })).valid).toBe(false);
  });

  it('rejects codes of the wrong length without touching crypto', async () => {
    expect(await verifyTotp(secret, '12345', {})).toEqual({ valid: false, delta: null });
    expect(await verifyTotp(secret, '1234567', {})).toEqual({ valid: false, delta: null });
  });

  it('ignores spaces the user typed', async () => {
    const t = 1600000000;
    const code = await totp(secret, { time: t });
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect((await verifyTotp(secret, spaced, { time: t })).valid).toBe(true);
  });
});

describe('Countdown', () => {
  it('reports seconds left in the current period', () => {
    // 1600000020 is divisible by 30, so it is the start of a step.
    expect(secondsRemaining(30, 1600000020)).toBe(30);
    expect(secondsRemaining(30, 1600000021)).toBe(29);
    expect(secondsRemaining(30, 1600000049)).toBe(1);
  });

  it('never reports zero or more than the period', () => {
    for (let t = 1600000020; t < 1600000080; t++) {
      const r = secondsRemaining(30, t);
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(30);
    }
  });
});

describe('timingSafeEqual', () => {
  it('matches identical strings', () => {
    expect(timingSafeEqual('123456', '123456')).toBe(true);
  });
  it('rejects different strings of equal length', () => {
    expect(timingSafeEqual('123456', '123457')).toBe(false);
  });
  it('rejects different lengths', () => {
    expect(timingSafeEqual('123456', '1234567')).toBe(false);
  });
});

describe('otpauth:// URI', () => {
  it('builds a URI an authenticator app can read', () => {
    const uri = otpauthURI({ secret: 'MZXW6YTBOI', account: 'Kushal', issuer: 'Beat The Hazard' });
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('secret=MZXW6YTBOI');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
    expect(uri).toContain('algorithm=SHA1');
  });

  it('encodes the issuer:account label', () => {
    const uri = otpauthURI({ secret: 'AAAA', account: 'A B', issuer: 'X Y' });
    expect(uri).toContain('otpauth://totp/X%20Y%3AA%20B?');
  });

  it('falls back to a default account name', () => {
    expect(otpauthURI({ secret: 'AAAA' })).toContain('Trainee');
  });
});
