/**
 * totp.js
 * RFC 6238 Time-Based One-Time Passwords, on top of RFC 4226 HOTP.
 *
 * Uses the Web Crypto API (`crypto.subtle`) for HMAC, so there is no
 * dependency and nothing to keep patched. Correctness is pinned by the
 * official RFC 6238 Appendix B test vectors in tests/totp.test.js.
 *
 * ── What this does and does not give you ──────────────────────────────
 * This game is a static site with no backend, so the shared secret lives in
 * the browser. That makes TOTP here a *local* second factor: it stops someone
 * casually opening a colleague's profile on a shared machine, and it
 * demonstrates the real algorithm end to end. It is NOT server-enforced - a
 * determined person with developer tools could read the secret. Enforcing 2FA
 * properly requires the secret to live on a server that the client never sees.
 * The UI says this plainly rather than implying otherwise.
 */
import { base32Decode } from './base32.js';

/** Default parameters - what Google Authenticator, Authy and 1Password expect. */
export const TOTP_DEFAULTS = {
  digits: 6,
  period: 30,
  algorithm: 'SHA-1',
};

/** Map an otpauth algorithm name to a Web Crypto hash name. */
function hashName(algorithm) {
  const a = String(algorithm).toUpperCase().replace('-', '');
  if (a === 'SHA1') return 'SHA-1';
  if (a === 'SHA256') return 'SHA-256';
  if (a === 'SHA512') return 'SHA-512';
  throw new Error(`Unsupported TOTP algorithm: ${algorithm}`);
}

/**
 * RFC 4226 HOTP.
 * @param {Uint8Array} key      the raw shared secret
 * @param {number|bigint} counter
 * @param {object} [o]
 * @returns {Promise<string>} zero-padded code
 */
export async function hotp(key, counter, { digits = 6, algorithm = 'SHA-1' } = {}) {
  // Counter is a 64-bit big-endian integer.
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, BigInt(counter), false);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    // Copy into a fresh buffer: some engines reject a Uint8Array view whose
    // underlying buffer is larger than the view.
    key.slice(),
    { name: 'HMAC', hash: { name: hashName(algorithm) } },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, buf));

  // Dynamic truncation (RFC 4226 §5.3): the low nibble of the last byte is an
  // offset into the digest; take 31 bits from there.
  const offset = sig[sig.length - 1] & 0x0f;
  const binary =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);

  const code = binary % 10 ** digits;
  return String(code).padStart(digits, '0');
}

/**
 * RFC 6238 TOTP.
 * @param {string} secretBase32
 * @param {object} [o]
 * @param {number} [o.time] unix seconds (defaults to now)
 * @returns {Promise<string>}
 */
export async function totp(secretBase32, {
  time = Math.floor(Date.now() / 1000),
  digits = TOTP_DEFAULTS.digits,
  period = TOTP_DEFAULTS.period,
  algorithm = TOTP_DEFAULTS.algorithm,
} = {}) {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(time / period);
  return hotp(key, counter, { digits, algorithm });
}

/**
 * Verify a user-entered code.
 *
 * `window` allows for clock drift between the phone and this machine: a window
 * of 1 accepts the previous, current and next 30-second step. That is the
 * standard tolerance and is what stops "correct code rejected" complaints.
 *
 * @returns {Promise<{valid:boolean, delta:number|null}>} delta = which step matched
 */
export async function verifyTotp(secretBase32, code, {
  time = Math.floor(Date.now() / 1000),
  window = 1,
  digits = TOTP_DEFAULTS.digits,
  period = TOTP_DEFAULTS.period,
  algorithm = TOTP_DEFAULTS.algorithm,
} = {}) {
  const entered = String(code).replace(/\D/g, '');
  if (entered.length !== digits) return { valid: false, delta: null };

  const key = base32Decode(secretBase32);
  const counter = Math.floor(time / period);

  for (let d = -window; d <= window; d++) {
    const candidate = await hotp(key, counter + d, { digits, algorithm });
    // Constant-time-ish compare. Not a real defence here (there is no server
    // to attack) but it costs nothing and sets the right example.
    if (timingSafeEqual(candidate, entered)) return { valid: true, delta: d };
  }
  return { valid: false, delta: null };
}

/** Length-independent comparison that does not bail on the first difference. */
export function timingSafeEqual(a, b) {
  const sa = String(a);
  const sb = String(b);
  let diff = sa.length ^ sb.length;
  for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
    diff |= (sa.charCodeAt(i) || 0) ^ (sb.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Seconds until the current code rolls over - drives the countdown ring. */
export function secondsRemaining(period = TOTP_DEFAULTS.period, time = Date.now() / 1000) {
  return period - (Math.floor(time) % period);
}

/**
 * Build the `otpauth://` URI that authenticator apps read from a QR code.
 * @see https://github.com/google/google-authenticator/wiki/Key-Uri-Format
 */
export function otpauthURI({
  secret,
  account,
  issuer = 'Beat The Hazard',
  digits = TOTP_DEFAULTS.digits,
  period = TOTP_DEFAULTS.period,
  algorithm = TOTP_DEFAULTS.algorithm,
}) {
  const label = encodeURIComponent(`${issuer}:${account || 'Trainee'}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: algorithm.replace('-', ''),
    digits: String(digits),
    period: String(period),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
