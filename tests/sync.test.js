/**
 * Sending a finished round to the database.
 *
 * The behaviour that matters is not "it uploads", it is everything around
 * that: a round is never lost when the upload fails, never stored twice, and
 * never blocks a trainee who has no network or no account.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  sessionRow, recordSession, flushQueue, readQueue, writeQueue, queueSize,
} from '../src/services/db/sync.js';

/** localStorage, small enough to read in a test. */
function memStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

/** A client that can be told to succeed, fail, or not be there at all. */
function fakeClient({ configured = true, signedIn = true, fails = false, userId = 'u1' } = {}) {
  return {
    configured,
    signedIn,
    userId,
    sent: [],
    async insertSession(row) {
      if (fails) throw new Error('network');
      this.sent.push(row);
    },
  };
}

const summary = {
  roundId: 'r-1',
  mode: 'test',
  environment: 'env01',
  difficulty: 'mid',
  score: 87,
  rank: { id: 'competent' },
  correct: 11,
  wrong: 2,
  totalHazards: 15,
  accuracy: 84.615,
  bestCombo: 4,
  averageReactionTime: 12.3456,
  durationSeconds: 300,
  finishedAt: Date.UTC(2026, 9, 12, 9, 30),
};

describe('sessionRow', () => {
  it('maps a finished round onto the columns the table has', () => {
    const row = sessionRow(summary, { userId: 'u1', appVersion: '1.2.3' });

    expect(row).toMatchObject({
      user_id: 'u1',
      client_round_id: 'r-1',
      mode: 'test',
      environment: 'env01',
      difficulty: 'mid',
      score: 87,
      rank: 'competent',
      correct: 11,
      wrong: 2,
      total_hazards: 15,
      best_combo: 4,
      app_version: '1.2.3',
    });
    expect(row.played_at).toBe('2026-10-12T09:30:00.000Z');
  });

  it('rounds the measured numbers rather than storing full precision', () => {
    const row = sessionRow(summary);
    expect(row.accuracy).toBe(84.62);
    expect(row.avg_reaction_s).toBe(12.35);
    expect(row.duration_s).toBe(300);
  });

  it('files a training round as training, whatever difficulty was selected', () => {
    const row = sessionRow({ ...summary, mode: 'train', difficulty: 'hard' });
    expect(row.mode).toBe('train');
    expect(row.difficulty).toBe('train');
  });

  it('survives a half-filled summary instead of writing undefined', () => {
    const row = sessionRow({ mode: 'test', environment: 'env02' }, { now: () => 1000 });
    expect(row.score).toBe(0);
    expect(row.correct).toBe(0);
    expect(row.accuracy).toBeNull();
    expect(row.rank).toBeNull();
    expect(row.client_round_id).toContain('env02');
  });

  it('carries no personal data beyond the account the row belongs to', () => {
    const row = sessionRow({ ...summary, playerName: 'Kushal', email: 'k@example.com' }, { userId: 'u1' });
    expect(Object.keys(row)).not.toContain('playerName');
    expect(JSON.stringify(row)).not.toContain('example.com');
  });
});

describe('recordSession', () => {
  let storage;
  beforeEach(() => { storage = memStore(); });

  it('does nothing at all when the build has no database', async () => {
    const client = fakeClient({ configured: false });
    expect(await recordSession(summary, { client, storage })).toBe('skipped');
    expect(queueSize(storage)).toBe(0);
  });

  it('sends the round when signed in', async () => {
    const client = fakeClient();
    expect(await recordSession(summary, { client, storage })).toBe('sent');
    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].score).toBe(87);
  });

  it('queues rather than losing the round when the upload fails', async () => {
    const client = fakeClient({ fails: true });
    expect(await recordSession(summary, { client, storage })).toBe('queued');
    expect(readQueue(storage)).toHaveLength(1);
  });

  it('queues when nobody is signed in yet', async () => {
    const client = fakeClient({ signedIn: false });
    expect(await recordSession(summary, { client, storage })).toBe('queued');
  });

  it('never queues the same round twice', async () => {
    const client = fakeClient({ fails: true });
    await recordSession(summary, { client, storage });
    await recordSession(summary, { client, storage });
    expect(readQueue(storage)).toHaveLength(1);
  });
});

describe('flushQueue', () => {
  let storage;
  beforeEach(() => { storage = memStore(); });

  it('sends everything waiting and empties the queue', async () => {
    writeQueue([sessionRow({ ...summary, roundId: 'a' }), sessionRow({ ...summary, roundId: 'b' })], storage);
    const client = fakeClient();

    expect(await flushQueue({ client, storage })).toEqual({ sent: 2, left: 0 });
    expect(queueSize(storage)).toBe(0);
  });

  it('stops at the first failure and keeps the rest for later', async () => {
    writeQueue([sessionRow({ ...summary, roundId: 'a' })], storage);
    const client = fakeClient({ fails: true });

    expect(await flushQueue({ client, storage })).toEqual({ sent: 0, left: 1 });
    expect(queueSize(storage)).toBe(1);
  });

  it('gives a round queued before sign in to the account that sends it', async () => {
    writeQueue([sessionRow({ ...summary, roundId: 'a' }, { userId: null })], storage);
    const client = fakeClient({ userId: 'u9' });

    await flushQueue({ client, storage });
    expect(client.sent[0].user_id).toBe('u9');
  });

  it('does nothing when there is no account to send as', async () => {
    writeQueue([sessionRow(summary)], storage);
    const client = fakeClient({ signedIn: false });

    expect(await flushQueue({ client, storage })).toEqual({ sent: 0, left: 1 });
  });

  it('keeps the queue to a sane size during a long spell offline', async () => {
    const many = Array.from({ length: 80 }, (_, i) => sessionRow({ ...summary, roundId: `r${i}` }));
    writeQueue(many, storage);
    expect(queueSize(storage)).toBe(50);
    // The newest rounds are the ones kept.
    expect(readQueue(storage).at(-1).client_round_id).toBe('r79');
  });

  it('treats unreadable storage as an empty queue rather than throwing', () => {
    const broken = { getItem: () => '{not json', setItem: () => {}, removeItem: () => {} };
    expect(readQueue(broken)).toEqual([]);
  });
});
