/**
 * validate.js
 * The only way a name or an email address gets into an account.
 *
 * Both are checked on the way in rather than escaped on the way out. The UI
 * already renders them with textContent, never innerHTML, but a value that
 * could not have been typed into the form (angle brackets, control
 * characters, a 5,000-character "name") has no business being stored at all.
 *
 * Pure functions, no DOM, so every rule is unit-tested.
 */

export const NAME_MIN = 2;
export const NAME_MAX = 32;
export const EMAIL_MAX = 254;
const LOCAL_MAX = 64;

/**
 * Letters from any script (so Nepali, Hindi and accented names work), the
 * combining marks those scripts need, spaces, and the punctuation real names
 * use: full stop, apostrophe and hyphen. It must start with a letter.
 */
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

/**
 * @param {unknown} raw
 * @returns {{ ok: true, value: string } | { ok: false, error: string }}
 */
export function validateName(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'Please enter your name.' };
  const value = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!value) return { ok: false, error: 'Please enter your name.' };
  if ([...value].length > NAME_MAX) {
    return { ok: false, error: `Your name can be at most ${NAME_MAX} characters.` };
  }
  if (!NAME_RE.test(value)) {
    return { ok: false, error: 'Use letters only — spaces, full stops, apostrophes and hyphens are fine.' };
  }
  const letters = value.match(/\p{L}/gu)?.length ?? 0;
  if (letters < NAME_MIN) {
    return { ok: false, error: `Your name needs at least ${NAME_MIN} letters.` };
  }
  return { ok: true, value };
}

/** RFC 5322 "dot-atom" local part: no leading, trailing or doubled dots. */
const LOCAL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const LABEL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

/**
 * Stored lower-case, so "Kushal@Example.com" and "kushal@example.com" are one
 * account.
 *
 * @param {unknown} raw
 * @returns {{ ok: true, value: string } | { ok: false, error: string }}
 */
export function validateEmail(raw) {
  const bad = { ok: false, error: 'Please enter a valid email address, like name@example.com.' };
  if (typeof raw !== 'string') return bad;
  const value = raw.trim().toLowerCase();
  if (!value) return { ok: false, error: 'Please enter your email address.' };
  if (value.length > EMAIL_MAX) return bad;

  const at = value.lastIndexOf('@');
  if (at <= 0 || at !== value.indexOf('@')) return bad;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);

  if (local.length > LOCAL_MAX || !LOCAL_RE.test(local)) return bad;
  const labels = domain.split('.');
  if (labels.length < 2 || !labels.every((l) => LABEL_RE.test(l))) return bad;
  // A real top-level domain is letters only: "name@host.123" is not an address.
  if (!/^[a-z]{2,}$/.test(labels[labels.length - 1])) return bad;

  return { ok: true, value };
}
