/**
 * Scoring, combo and rank rules.
 * These are the rules the brief specifies exactly, so they get exact tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreManager } from '../src/gameplay/ScoreManager.js';
import { rankForScore, SCORING } from '../src/data/config.js';

/** emit:false keeps the global event bus out of unit tests. */
const mk = (multiplier = 1) => new ScoreManager({ multiplier, emit: false });

// 60s budget: "fast" is <= 30s given fastThresholdRatio 0.5
const ALLOTTED = 60;
const fast = (id, severity) =>
  ({ id, severity, reactionTime: 10, allottedTime: ALLOTTED });
const slow = (id, severity) =>
  ({ id, severity, reactionTime: 50, allottedTime: ALLOTTED });

describe('ScoreManager - base scoring table', () => {
  let s;
  beforeEach(() => { s = mk(); });

  it('awards 15 for a fast major hazard', () => {
    const r = s.recordCorrect(fast('a', 'major'));
    expect(r.points).toBe(15);
    expect(s.score).toBe(15);
  });

  it('awards 7 for a slow major hazard', () => {
    expect(s.recordCorrect(slow('a', 'major')).points).toBe(7);
  });

  it('awards 5 for a fast minor hazard', () => {
    expect(s.recordCorrect(fast('a', 'minor')).points).toBe(5);
  });

  it('awards 2 for a slow minor hazard', () => {
    expect(s.recordCorrect(slow('a', 'minor')).points).toBe(2);
  });

  it('awards 0 and no score change for a wrong flag', () => {
    s.recordCorrect(fast('a', 'major'));
    const before = s.score;
    s.recordWrong({ reason: 'nope' });
    expect(s.score).toBe(before);
    expect(s.wrong).toBe(1);
  });

  it('treats a find exactly on the fast threshold as fast', () => {
    const r = s.recordCorrect({ id: 'a', severity: 'major', reactionTime: 30, allottedTime: 60 });
    expect(r.fast).toBe(true);
    expect(r.points).toBe(15);
  });

  it('treats a find just past the threshold as slow', () => {
    const r = s.recordCorrect({ id: 'a', severity: 'major', reactionTime: 30.01, allottedTime: 60 });
    expect(r.fast).toBe(false);
    expect(r.points).toBe(7);
  });

  it('never returns a negative score', () => {
    const p = new ScoreManager({ emit: false, scoring: { ...SCORING, wrongPenalty: 50 } });
    p.recordCorrect(fast('a', 'minor')); // +5
    p.recordWrong({});
    expect(p.score).toBe(0);
  });
});

describe('ScoreManager - combo', () => {
  let s;
  beforeEach(() => { s = mk(); });

  it('does not start a combo before three in a row', () => {
    s.recordCorrect(fast('a', 'minor'));
    s.recordCorrect(fast('b', 'minor'));
    expect(s.comboActive).toBe(false);
  });

  it('starts a combo on the third consecutive correct find', () => {
    s.recordCorrect(fast('a', 'minor'));
    s.recordCorrect(fast('b', 'minor'));
    const r = s.recordCorrect(fast('c', 'minor'));
    expect(s.comboActive).toBe(true);
    expect(r.combo).toBe(true);
    expect(r.comboBonus).toBe(SCORING.comboBonus);
    // 5 + 5 + (5 + 3)
    expect(s.score).toBe(18);
  });

  it('keeps adding the combo bonus while the streak holds', () => {
    for (const id of ['a', 'b', 'c', 'd']) s.recordCorrect(fast(id, 'minor'));
    expect(s.comboBonusTotal).toBe(SCORING.comboBonus * 2);
  });

  it('breaks the combo on a wrong flag', () => {
    for (const id of ['a', 'b', 'c']) s.recordCorrect(fast(id, 'minor'));
    expect(s.comboActive).toBe(true);
    s.recordWrong({});
    expect(s.comboActive).toBe(false);
    expect(s.streak).toBe(0);
  });

  it('breaks the combo when the reaction clock runs out', () => {
    for (const id of ['a', 'b', 'c']) s.recordCorrect(fast(id, 'minor'));
    s.noteSlowSearch();
    expect(s.comboActive).toBe(false);
    expect(s.streak).toBe(0);
  });

  it('counts slow searches without blaming a specific hazard', () => {
    // Regression: expiry used to be attributed to hazards.remaining[0] - an
    // arbitrary hazard the player was probably nowhere near - which produced a
    // wrong "missed" list. It must only record that the search was slow.
    s.recordCorrect(fast('a', 'major'));
    s.noteSlowSearch();
    s.noteSlowSearch();
    const sum = s.summary({ totalHazards: 5 });
    expect(sum.slowSearches).toBe(2);
    expect(sum.correct).toBe(1);
    expect(sum.wrong).toBe(0);          // a slow search is not a wrong answer
    expect(sum.score).toBe(15);         // and it costs no points
  });

  it('records the best streak even after it is broken', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e']) s.recordCorrect(fast(id, 'minor'));
    s.recordWrong({});
    s.recordCorrect(fast('f', 'minor'));
    expect(s.bestStreak).toBe(5);
    expect(s.streak).toBe(1);
  });
});

describe('ScoreManager - difficulty multiplier', () => {
  it('scales the final score but not the raw score', () => {
    const s = mk(1.6);
    s.recordCorrect(fast('a', 'major')); // raw 15
    expect(s.rawScore).toBe(15);
    expect(s.score).toBe(24); // 15 * 1.6
  });

  it('rounds the multiplied score to an integer', () => {
    const s = mk(1.25);
    s.recordCorrect(fast('a', 'minor')); // raw 5 -> 6.25
    expect(s.score).toBe(6);
  });
});

describe('ScoreManager - statistics', () => {
  it('computes accuracy from attempts', () => {
    const s = mk();
    s.recordCorrect(fast('a', 'major'));
    s.recordCorrect(fast('b', 'major'));
    s.recordWrong({});
    expect(s.accuracy).toBeCloseTo(2 / 3, 5);
  });

  it('returns null average reaction time before any find', () => {
    expect(mk().averageReactionTime).toBeNull();
  });

  it('averages reaction times across finds', () => {
    const s = mk();
    s.recordCorrect({ id: 'a', severity: 'major', reactionTime: 10, allottedTime: 60 });
    s.recordCorrect({ id: 'b', severity: 'major', reactionTime: 20, allottedTime: 60 });
    expect(s.averageReactionTime).toBe(15);
  });

  it('flags a perfect round only with zero wrong flags and all hazards found', () => {
    const s = mk();
    s.recordCorrect(fast('a', 'major'));
    s.recordCorrect(fast('b', 'major'));
    expect(s.summary({ totalHazards: 2 }).perfect).toBe(true);
    s.recordWrong({});
    expect(s.summary({ totalHazards: 2 }).perfect).toBe(false);
  });

  it('reports missed hazards in the summary', () => {
    const s = mk();
    s.recordCorrect(fast('a', 'major'));
    expect(s.summary({ totalHazards: 5 }).missed).toBe(4);
  });

  it('resets cleanly', () => {
    const s = mk();
    s.recordCorrect(fast('a', 'major'));
    s.recordWrong({});
    s.reset();
    expect(s.score).toBe(0);
    expect(s.attempts).toBe(0);
    expect(s.finds).toHaveLength(0);
  });
});

describe('Ranks', () => {
  it('awards Safety Champion at 50 and above', () => {
    expect(rankForScore(50).id).toBe('champion');
    expect(rankForScore(120).id).toBe('champion');
  });

  it('awards Getting There between 30 and 49', () => {
    expect(rankForScore(30).id).toBe('getting-there');
    expect(rankForScore(49).id).toBe('getting-there');
  });

  it('awards Needs Practice below 30', () => {
    expect(rankForScore(29).id).toBe('needs-practice');
    expect(rankForScore(0).id).toBe('needs-practice');
  });

  it('exposes the rank through the score manager', () => {
    const s = mk();
    for (let i = 0; i < 4; i++) s.recordCorrect(fast(`h${i}`, 'major')); // 15*4 + combo 3*2
    expect(s.score).toBeGreaterThanOrEqual(50);
    expect(s.rank.id).toBe('champion');
  });
});
