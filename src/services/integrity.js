/**
 * integrity.js
 * Telling an edited result from a real one.
 *
 * Scores live in localStorage, which anyone can open and change. For a game
 * that would not matter; for a safety training record it does, because a
 * supervisor reading "14 of 15 found" has to know whether the trainee did
 * that or typed it.
 *
 * What this does: every stored round carries a short tag worked out from its
 * own values and a random salt made when the profile was created. Change the
 * score by hand and the tag no longer matches, so the round is shown as
 * unverified rather than silently trusted.
 *
 * What this does not do: stop a determined person. The salt is in the same
 * browser storage as the data and this file is published, so someone willing
 * to read it can recompute a tag. That is unavoidable without a server, which
 * is exactly why rounds are also sent to the database when there is one: a
 * row there cannot be updated by anybody, by policy. This is the honest
 * middle: it catches casual editing, and it never claims more.
 */

/** The fields a tag covers: everything a cheat would want to change. */
const SIGNED = ['at', 'mode', 'environment', 'difficulty', 'score', 'rank', 'correct', 'wrong', 'total'];

/** A salt per profile, so two trainees' identical rounds do not share a tag. */
export function newSalt(random = Math.random) {
  return Array.from({ length: 4 }, () => Math.floor(random() * 0x100000000).toString(36)).join('');
}

/**
 * FNV-1a over the signed fields plus the salt.
 *
 * Not a cryptographic signature, and not presented as one: a 32-bit hash is
 * enough to notice an edit, and anything stronger would still be forgeable by
 * the person holding the salt.
 */
export function roundTag(entry, salt) {
  const payload = SIGNED.map((k) => `${k}=${entry?.[k] ?? ''}`).join('|') + `|${salt ?? ''}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** The entry, with its tag attached. */
export function tagRound(entry, salt) {
  return { ...entry, tag: roundTag(entry, salt) };
}

/**
 * Is this round what it says it is?
 *
 * A round saved before tagging existed has no tag at all. That is not
 * tampering, so it is reported separately: 'ok' | 'untagged' | 'edited'.
 */
export function checkRound(entry, salt) {
  if (!entry?.tag) return 'untagged';
  return entry.tag === roundTag(entry, salt) ? 'ok' : 'edited';
}

/** @returns {{entry:object, state:'ok'|'untagged'|'edited'}[]} */
export function checkHistory(history = [], salt) {
  return history.map((entry) => ({ entry, state: checkRound(entry, salt) }));
}

/** How many rounds in this history do not add up. */
export function countEdited(history = [], salt) {
  return checkHistory(history, salt).filter((r) => r.state === 'edited').length;
}
