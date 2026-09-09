/**
 * base32.js
 * RFC 4648 Base32 (the alphabet authenticator apps use for TOTP secrets).
 *
 * Pure functions, no dependencies - which is why they are unit tested against
 * the RFC 4648 test vectors.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encode bytes as Base32.
 * @param {Uint8Array} bytes
 * @param {boolean} pad  append '=' padding (authenticator apps do not need it)
 * @returns {string}
 */
export function base32Encode(bytes, pad = false) {
  let bits = 0;
  let value = 0;
  let out = '';

  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  // flush the remaining bits, left-aligned
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];

  if (pad) while (out.length % 8 !== 0) out += '=';
  return out;
}

/**
 * Decode a Base32 string to bytes.
 * Tolerant of lowercase, spaces and padding, because people retype these by
 * hand from a screen.
 * @param {string} str
 * @returns {Uint8Array}
 */
export function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const out = [];

  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid Base32 character: "${ch}"`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/**
 * A cryptographically random secret, as Base32.
 * @param {number} bytes 20 bytes = 160 bits, the RFC 4226 recommendation
 */
export function randomBase32Secret(bytes = 20) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base32Encode(buf);
}

/** Group a secret into 4-character blocks so it can be typed accurately. */
export function formatSecret(secret) {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}
