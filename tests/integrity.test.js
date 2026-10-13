/**
 * Telling an edited result from a real one.
 *
 * The promise is narrow and the tests keep it that way: an edited round is
 * noticed, an untouched one is not called into question, and a round saved
 * before tagging existed is reported as untagged rather than accused.
 */
import { describe, it, expect } from 'vitest';
import { newSalt, roundTag, tagRound, checkRound, checkHistory, countEdited } from '../src/services/integrity.js';

const round = () => ({
  at: Date.UTC(2026, 9, 12, 9, 30),
  mode: 'test', environment: 'env01', difficulty: 'mid',
  score: 87, rank: 'competent', correct: 11, wrong: 2, total: 15,
});

const SALT = 'test-salt';

describe('Salt', () => {
  it('is different for every profile', () => {
    const salts = new Set(Array.from({ length: 50 }, () => newSalt()));
    expect(salts.size).toBe(50);
  });

  it('makes the same round tag differently for two trainees', () => {
    expect(roundTag(round(), 'salt-a')).not.toBe(roundTag(round(), 'salt-b'));
  });
});

describe('Tagging a round', () => {
  it('gives the same tag for the same values', () => {
    expect(roundTag(round(), SALT)).toBe(roundTag(round(), SALT));
  });

  it('changes when any scored value changes', () => {
    const base = roundTag(round(), SALT);
    for (const [key, value] of Object.entries({ score: 88, correct: 12, wrong: 0, total: 14, difficulty: 'hard' })) {
      expect(roundTag({ ...round(), [key]: value }, SALT)).not.toBe(base);
    }
  });

  it('attaches the tag without disturbing the round', () => {
    const tagged = tagRound(round(), SALT);
    expect(tagged).toMatchObject(round());
    expect(typeof tagged.tag).toBe('string');
  });
});

describe('Checking a round', () => {
  it('accepts a round that has not been touched', () => {
    expect(checkRound(tagRound(round(), SALT), SALT)).toBe('ok');
  });

  it('catches a score edited by hand', () => {
    const tampered = { ...tagRound(round(), SALT), score: 999 };
    expect(checkRound(tampered, SALT)).toBe('edited');
  });

  it('catches hazards found being inflated', () => {
    const tampered = { ...tagRound(round(), SALT), correct: 15, wrong: 0 };
    expect(checkRound(tampered, SALT)).toBe('edited');
  });

  it('calls a round from before tagging untagged, not edited', () => {
    expect(checkRound(round(), SALT)).toBe('untagged');
  });

  it('catches a tag copied from another trainee', () => {
    const theirs = tagRound(round(), 'someone-elses-salt');
    expect(checkRound(theirs, SALT)).toBe('edited');
  });
});

describe('Checking a whole history', () => {
  const history = [
    tagRound({ ...round(), score: 90 }, SALT),
    { ...tagRound({ ...round(), score: 40 }, SALT), score: 95 },
    { ...round(), score: 60 },
  ];

  it('reports each round separately', () => {
    expect(checkHistory(history, SALT).map((r) => r.state)).toEqual(['ok', 'edited', 'untagged']);
  });

  it('counts only the edited ones', () => {
    expect(countEdited(history, SALT)).toBe(1);
  });

  it('handles an empty history', () => {
    expect(checkHistory([], SALT)).toEqual([]);
    expect(countEdited(undefined, SALT)).toBe(0);
  });
});
