/**
 * Account rules and the supervisor's totals.
 *
 * Both are pure functions on purpose: the password rule decides whether a
 * trainee can get into their own record from another computer, and the totals
 * are what a supervisor reads at a glance. Neither should need a browser to
 * be checked.
 */
import { describe, it, expect } from 'vitest';
import { passwordProblem } from '../src/ui/AuthScreens.js';
import { overallStats } from '../src/admin/stats.js';

describe('Password rule', () => {
  it('accepts a reasonable password', () => {
    for (const pw of ['warehouse7', 'Forklift2026', 'a1b2c3d4']) {
      expect(passwordProblem(pw)).toBe('');
    }
  });

  it('asks for one when there is none', () => {
    expect(passwordProblem('')).toMatch(/choose a password/i);
    expect(passwordProblem(null)).toMatch(/choose a password/i);
  });

  it('refuses a short one, because a shared warehouse PC is watched', () => {
    expect(passwordProblem('ab1')).toMatch(/8 characters/);
    expect(passwordProblem('abc12')).toMatch(/8 characters/);
  });

  it('wants letters and numbers, not one or the other', () => {
    expect(passwordProblem('abcdefgh')).toMatch(/letter and one number/);
    expect(passwordProblem('12345678')).toMatch(/letter and one number/);
  });

  it('refuses one longer than the service accepts', () => {
    expect(passwordProblem(`a1${'x'.repeat(80)}`)).toMatch(/too long/i);
  });
});

describe('Supervisor totals', () => {
  const rows = [
    { name: 'A', rounds_played: 3, best_score: 92 },
    { name: 'B', rounds_played: 0, best_score: 0 },
    { name: 'C', rounds_played: 5, best_score: 78 },
  ];

  it('counts accounts, who has actually trained, rounds and the top score', () => {
    expect(overallStats(rows)).toEqual({ accounts: 3, trained: 2, totalRounds: 8, best: 92 });
  });

  it('reads zero as zero rather than showing nothing', () => {
    expect(overallStats([])).toEqual({ accounts: 0, trained: 0, totalRounds: 0, best: 0 });
  });

  it('survives rows where the database returned nulls', () => {
    expect(overallStats([{ name: 'A', rounds_played: null, best_score: null }]))
      .toEqual({ accounts: 1, trained: 0, totalRounds: 0, best: 0 });
  });
});
