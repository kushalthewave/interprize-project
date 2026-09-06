/**
 * Profile: progression gates, achievements and stats folding.
 * Uses MemoryAdapter so no browser storage is involved.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Profile, MemoryAdapter } from '../src/services/Profile.js';
import { PROGRESSION, ACHIEVEMENTS } from '../src/data/config.js';

const mk = () => new Profile(new MemoryAdapter());

/** Minimal summary shaped like ScoreManager.summary() output. */
function summary(over = {}) {
  return {
    mode: 'test',
    environment: 'env01',
    difficulty: 'simple',
    score: 40,
    correct: 5,
    wrong: 0,
    attempts: 5,
    totalHazards: 5,
    missed: 0,
    accuracy: 1,
    averageReactionTime: 20,
    bestCombo: 3,
    rank: { id: 'getting-there', label: 'Getting There' },
    perfect: false,
    finishedAt: Date.now(),
    ...over,
  };
}

describe('Profile - identity', () => {
  it('starts signed out', () => {
    expect(mk().isSignedIn).toBe(false);
  });

  it('signs in and trims the name', () => {
    const p = mk();
    p.signIn({ name: '  Sunita  ', avatar: 'female' });
    expect(p.name).toBe('Sunita');
    expect(p.avatar).toBe('female');
    expect(p.isSignedIn).toBe(true);
  });

  it('falls back to a default name when given only whitespace', () => {
    const p = mk();
    p.signIn({ name: '   ' });
    expect(p.name).toBe('Trainee');
  });

  it('caps very long names', () => {
    const p = mk();
    p.signIn({ name: 'x'.repeat(100) });
    expect(p.name.length).toBeLessThanOrEqual(32);
  });

  it('persists through the adapter', () => {
    const adapter = new MemoryAdapter();
    new Profile(adapter).signIn({ name: 'Ramesh', avatar: 'male' });
    expect(new Profile(adapter).name).toBe('Ramesh');
  });

  it('survives a corrupt/partial saved payload', () => {
    const adapter = new MemoryAdapter();
    adapter.data = { name: 'Legacy' }; // missing every other field
    const p = new Profile(adapter);
    expect(p.name).toBe('Legacy');
    expect(p.data.stats.bestScore).toBe(0);
    expect(p.data.achievements).toEqual([]);
  });
});

describe('Profile - progression gates', () => {
  it('always allows Train Mode', () => {
    expect(mk().isUnlocked('env01', 'train')).toBe(true);
  });

  it('locks testing until training is done', () => {
    const p = mk();
    expect(p.isUnlocked('env01', 'simple')).toBe(false);
    expect(p.lockReason('env01', 'simple')).toMatch(/Train Mode/i);
    p.markTrainComplete('env01');
    expect(p.isUnlocked('env01', 'simple')).toBe(true);
  });

  it('locks Mid until Simple is passed', () => {
    const p = mk();
    p.markTrainComplete('env01');
    expect(p.isUnlocked('env01', 'mid')).toBe(false);
    p.recordResult(summary({ difficulty: 'simple', score: PROGRESSION.unlockScore }));
    expect(p.isUnlocked('env01', 'mid')).toBe(true);
  });

  it('does not unlock Mid on a sub-threshold Simple score', () => {
    const p = mk();
    p.markTrainComplete('env01');
    p.recordResult(summary({ difficulty: 'simple', score: PROGRESSION.unlockScore - 1 }));
    expect(p.isUnlocked('env01', 'mid')).toBe(false);
  });

  it('locks Hard until Mid is passed', () => {
    const p = mk();
    p.markTrainComplete('env01');
    p.recordResult(summary({ difficulty: 'simple', score: 50 }));
    expect(p.isUnlocked('env01', 'hard')).toBe(false);
    p.recordResult(summary({ difficulty: 'mid', score: 50 }));
    expect(p.isUnlocked('env01', 'hard')).toBe(true);
  });

  it('gates each environment independently', () => {
    const p = mk();
    p.markTrainComplete('env01');
    expect(p.isUnlocked('env01', 'simple')).toBe(true);
    expect(p.isUnlocked('env02', 'simple')).toBe(false);
  });
});

describe('Profile - results and stats', () => {
  it('keeps the best score per difficulty, never regressing', () => {
    const p = mk();
    p.recordResult(summary({ difficulty: 'simple', score: 45 }));
    p.recordResult(summary({ difficulty: 'simple', score: 20 }));
    expect(p.envProgress('env01').simple).toBe(45);
  });

  it('accumulates lifetime stats', () => {
    const p = mk();
    p.recordResult(summary({ score: 30, correct: 4, wrong: 1 }));
    p.recordResult(summary({ score: 50, correct: 6, wrong: 2 }));
    const s = p.data.stats;
    expect(s.sessions).toBe(2);
    expect(s.bestScore).toBe(50);
    expect(s.totalScore).toBe(80);
    expect(s.hazardsFound).toBe(10);
    expect(s.wrongFlags).toBe(3);
  });

  it('tracks the fastest average reaction time', () => {
    const p = mk();
    p.recordResult(summary({ averageReactionTime: 22 }));
    p.recordResult(summary({ averageReactionTime: 14 }));
    p.recordResult(summary({ averageReactionTime: 30 }));
    expect(p.data.stats.fastestAverage).toBe(14);
  });

  it('records history newest first and caps it', () => {
    const p = mk();
    for (let i = 0; i < 60; i++) p.recordResult(summary({ score: i }));
    expect(p.data.history.length).toBe(50);
    expect(p.data.history[0].score).toBe(59);
  });

  it('does not record test progress for a training round', () => {
    const p = mk();
    p.recordResult(summary({ mode: 'train', score: 99 }));
    expect(p.envProgress('env01').simple).toBe(0);
  });
});

describe('Profile - achievements', () => {
  it('unlocks first-hazard on any correct find', () => {
    const p = mk();
    p.recordResult(summary({ correct: 1 }));
    expect(p.hasAchievement('first-hazard')).toBe(true);
  });

  it('unlocks safety-champion only at champion rank', () => {
    const p = mk();
    p.recordResult(summary({ rank: { id: 'getting-there' } }));
    expect(p.hasAchievement('safety-champion')).toBe(false);
    p.recordResult(summary({ rank: { id: 'champion' } }));
    expect(p.hasAchievement('safety-champion')).toBe(true);
  });

  it('unlocks fast-responder under 15s average', () => {
    const p = mk();
    p.recordResult(summary({ averageReactionTime: 15 }));
    expect(p.hasAchievement('fast-responder')).toBe(false);
    p.recordResult(summary({ averageReactionTime: 14.9 }));
    expect(p.hasAchievement('fast-responder')).toBe(true);
  });

  it('unlocks combo-master at a streak of 5', () => {
    const p = mk();
    p.recordResult(summary({ bestCombo: 4 }));
    expect(p.hasAchievement('combo-master')).toBe(false);
    p.recordResult(summary({ bestCombo: 5 }));
    expect(p.hasAchievement('combo-master')).toBe(true);
  });

  it('unlocks perfect-test only on a perfect round', () => {
    const p = mk();
    p.recordResult(summary({ perfect: true }));
    expect(p.hasAchievement('perfect-test')).toBe(true);
  });

  it('returns only newly unlocked ids, never duplicates', () => {
    const p = mk();
    const first = p.recordResult(summary({ correct: 1 }));
    expect(first).toContain('first-hazard');
    const second = p.recordResult(summary({ correct: 1 }));
    expect(second).not.toContain('first-hazard');
    expect(p.data.achievements.filter((a) => a === 'first-hazard')).toHaveLength(1);
  });

  it('ignores unknown achievement ids', () => {
    const p = mk();
    expect(p.unlock('not-a-real-achievement')).toBe(false);
  });

  it('unlocks all-environments after clearing three sites', () => {
    const p = mk();
    for (const env of ['env01', 'env02', 'env03']) {
      p.recordResult(summary({ environment: env, score: 40 }));
    }
    expect(p.hasAchievement('all-environments')).toBe(true);
  });

  it('has no duplicate achievement ids in the catalogue', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Profile - completion and reset', () => {
  it('reports 0% completion for a new profile', () => {
    expect(mk().completion(['env01', 'env02', 'env03'])).toBe(0);
  });

  it('increases completion as milestones are reached', () => {
    const p = mk();
    const envs = ['env01', 'env02', 'env03'];
    p.markTrainComplete('env01');
    const a = p.completion(envs);
    p.recordResult(summary({ score: 40 }));
    expect(p.completion(envs)).toBeGreaterThan(a);
  });

  it('reaches 100% when everything is done', () => {
    const p = mk();
    const envs = ['env01', 'env02', 'env03'];
    for (const env of envs) {
      p.markTrainComplete(env);
      for (const d of ['simple', 'mid', 'hard']) {
        p.recordResult(summary({ environment: env, difficulty: d, score: 60 }));
      }
    }
    expect(p.completion(envs)).toBe(1);
  });

  it('clears progress but keeps identity on reset', () => {
    const p = mk();
    p.signIn({ name: 'Bikash', avatar: 'male' });
    p.recordResult(summary({ score: 60 }));
    p.resetProgress();
    expect(p.name).toBe('Bikash');
    expect(p.data.stats.bestScore).toBe(0);
    expect(p.data.achievements).toEqual([]);
    expect(p.envProgress('env01').simple).toBe(0);
  });
});
