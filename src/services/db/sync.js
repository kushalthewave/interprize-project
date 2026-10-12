/**
 * sync.js
 * Sends a finished round to the database, and never gets in the way.
 *
 * The rules this follows, in order of importance:
 *
 *   1. Training must not depend on a network. If there is no database
 *      configured, no account signed in, or no connection, the round is still
 *      saved on the device exactly as before and the trainee sees nothing.
 *   2. A round is never lost because an upload failed. It waits in a queue and
 *      goes up on the next sign in, the next finished round, or when the
 *      browser says it is online again.
 *   3. A round is never stored twice. Each one carries an id made in the
 *      browser, and the table has a unique constraint on it, so a retry after
 *      a dropped connection is ignored by the database rather than duplicated.
 */
import { db } from './client.js';

const QUEUE_KEY = 'beat-the-hazard:sync-queue:v1';
const MAX_QUEUE = 50;

/**
 * Turn the game's end-of-round summary into a row for public.sessions.
 *
 * Pure, so it is unit tested: every field the table has, nothing it does not,
 * and no personal data beyond the account the row already belongs to.
 *
 * @param {object} summary  what GameManager reports at the end of a round
 * @param {object} [o]
 * @param {string} [o.userId]
 * @param {string} [o.appVersion]
 * @param {() => number} [o.now]
 */
export function sessionRow(summary, { userId = null, appVersion = '', now = Date.now } = {}) {
  const at = summary.finishedAt ?? now();
  const num = (v, d = null) => (Number.isFinite(v) ? Number(v) : d);
  const round2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null);

  return {
    user_id: userId,
    client_round_id: summary.roundId ?? `${at}-${summary.environment ?? 'unknown'}-${summary.score ?? 0}`,
    mode: summary.mode === 'train' ? 'train' : 'test',
    environment: String(summary.environment ?? 'unknown'),
    difficulty: summary.mode === 'train' ? 'train' : String(summary.difficulty ?? 'simple'),
    score: num(summary.score, 0),
    rank: summary.rank?.id ?? summary.rank ?? null,
    correct: num(summary.correct, 0),
    wrong: num(summary.wrong, 0),
    total_hazards: num(summary.totalHazards, 0),
    accuracy: round2(summary.accuracy),
    best_combo: num(summary.bestCombo, 0),
    avg_reaction_s: round2(summary.averageReactionTime),
    duration_s: round2(summary.durationSeconds ?? summary.elapsed),
    app_version: appVersion || null,
    played_at: new Date(at).toISOString(),
  };
}

/** The rounds waiting to go up. */
export function readQueue(storage = safeStorage()) {
  try {
    const raw = storage?.getItem(QUEUE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeQueue(rows, storage = safeStorage()) {
  try {
    // Oldest first, newest kept: a very long offline spell drops the stalest
    // rounds rather than growing without limit.
    storage?.setItem(QUEUE_KEY, JSON.stringify(rows.slice(-MAX_QUEUE)));
  } catch { /* storage full or blocked: the round still lives in the profile */ }
}

export function queueSize(storage = safeStorage()) {
  return readQueue(storage).length;
}

function safeStorage() {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

/**
 * Store a finished round.
 *
 * @returns {Promise<'sent'|'queued'|'skipped'>}
 *   sent    it is in the database
 *   queued  it is waiting for a connection or a sign in
 *   skipped there is no database in this build, so there is nothing to do
 */
export async function recordSession(summary, { client = db, storage = safeStorage(), appVersion = '' } = {}) {
  if (!client.configured) return 'skipped';

  const row = sessionRow(summary, { userId: client.userId, appVersion });

  if (!client.signedIn) {
    enqueue(row, storage);
    return 'queued';
  }

  try {
    await client.insertSession(row);
  } catch {
    enqueue(row, storage);
    return 'queued';
  }
  // A successful send is a good moment to clear anything still waiting.
  flushQueue({ client, storage }).catch(() => {});
  return 'sent';
}

function enqueue(row, storage) {
  const q = readQueue(storage);
  // Same round twice (a retry inside one session) replaces the earlier copy.
  const without = q.filter((r) => r.client_round_id !== row.client_round_id);
  writeQueue([...without, row], storage);
}

/**
 * Try to send everything that is waiting. Safe to call at any time: it stops
 * at the first failure and leaves the rest for later.
 *
 * @returns {Promise<{sent:number, left:number}>}
 */
export async function flushQueue({ client = db, storage = safeStorage() } = {}) {
  if (!client.configured || !client.signedIn) return { sent: 0, left: queueSize(storage) };

  let rows = readQueue(storage);
  if (rows.length === 0) return { sent: 0, left: 0 };

  let sent = 0;
  for (const row of [...rows]) {
    try {
      // Rounds queued before sign in have no owner yet.
      await client.insertSession({ ...row, user_id: row.user_id ?? client.userId });
      rows = rows.filter((r) => r.client_round_id !== row.client_round_id);
      writeQueue(rows, storage);
      sent += 1;
    } catch {
      break;
    }
  }
  return { sent, left: rows.length };
}

/** Flush when the browser reconnects. Returns an unsubscribe. */
export function flushOnReconnect({ client = db, storage = safeStorage() } = {}) {
  if (typeof window === 'undefined') return () => {};
  const go = () => { flushQueue({ client, storage }).catch(() => {}); };
  window.addEventListener('online', go);
  return () => window.removeEventListener('online', go);
}
