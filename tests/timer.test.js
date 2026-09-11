/**
 * Reaction clock behaviour.
 */
import { describe, it, expect } from 'vitest';
import { Timer } from '../src/gameplay/Timer.js';

describe('Timer - budget', () => {
  it('sets the total budget from seconds per hazard x hazard count', () => {
    const t = new Timer({ secondsPerHazard: 60, hazardCount: 15 });
    expect(t.total).toBe(900);
    expect(t.remaining).toBe(900);
  });

  it('does not advance until started', () => {
    const t = new Timer({ secondsPerHazard: 60, hazardCount: 2 });
    t.tick(5);
    expect(t.elapsed).toBe(0);
  });

  it('counts down while running', () => {
    const t = new Timer({ secondsPerHazard: 60, hazardCount: 2 });
    t.start();
    t.tick(10);
    expect(t.remaining).toBe(110);
    expect(t.elapsed).toBe(10);
  });

  it('stops at zero and reports expiry exactly once', () => {
    const t = new Timer({ secondsPerHazard: 10, hazardCount: 1 });
    t.start();
    expect(t.tick(9).expired).toBe(false);
    const r = t.tick(2);
    expect(r.expired).toBe(true);
    expect(t.remaining).toBe(0);
    expect(t.finished).toBe(true);
    // further ticks are inert
    expect(t.tick(5).expired).toBe(false);
  });

  it('pauses and resumes', () => {
    const t = new Timer({ secondsPerHazard: 60, hazardCount: 1 });
    t.start();
    t.tick(5);
    t.pause();
    t.tick(20);
    expect(t.elapsed).toBe(5);
    t.resume();
    t.tick(5);
    expect(t.elapsed).toBe(10);
  });

  it('does not resume a finished round', () => {
    const t = new Timer({ secondsPerHazard: 2, hazardCount: 1 });
    t.start();
    t.tick(3);
    t.resume();
    expect(t.running).toBe(false);
  });
});

describe('Timer - per-hazard clock', () => {
  it('reports the per-hazard clock separately from the round clock', () => {
    const t = new Timer({ secondsPerHazard: 60, hazardCount: 5 });
    t.start();
    t.tick(20);
    expect(t.hazardRemaining).toBe(40);
    expect(t.remaining).toBe(280);
  });

  it('restarts the per-hazard clock on nextHazard()', () => {
    const t = new Timer({ secondsPerHazard: 60, hazardCount: 5 });
    t.start();
    t.tick(45);
    t.nextHazard();
    expect(t.hazardRemaining).toBe(60);
    expect(t.elapsed).toBe(45); // round clock is untouched
  });

  it('signals hazardExpired when the per-hazard budget runs out', () => {
    const t = new Timer({ secondsPerHazard: 10, hazardCount: 5 });
    t.start();
    expect(t.tick(9).hazardExpired).toBe(false);
    expect(t.tick(2).hazardExpired).toBe(true);
    // and auto-restarts for the next hazard
    expect(t.hazardElapsed).toBe(0);
  });
});

describe('Timer - warning states', () => {
  it('warns in the last 25% of the hazard clock', () => {
    const t = new Timer({ secondsPerHazard: 60, hazardCount: 1, warnAt: 0.25 });
    t.start();
    t.tick(40);
    expect(t.warning).toBe(false);
    t.tick(6); // 14s left
    expect(t.warning).toBe(true);
  });

  it('goes critical in the last few seconds', () => {
    // Critical threshold is min(10, secondsPerHazard * 0.15) = min(10, 9) = 9s.
    const t = new Timer({ secondsPerHazard: 60, hazardCount: 1 });
    t.start();
    t.tick(48); // 12s left - warning, but not yet critical
    expect(t.warning).toBe(true);
    expect(t.critical).toBe(false);
    t.tick(4); // 8s left - inside the 9s critical band
    expect(t.critical).toBe(true);
  });

  it('caps the critical band at 10s even on a long clock', () => {
    // 0.15 * 90 = 13.5, so the 10s cap applies.
    const t = new Timer({ secondsPerHazard: 90, hazardCount: 1 });
    t.start();
    t.tick(79); // 11s left
    expect(t.critical).toBe(false);
    t.tick(2); // 9s left
    expect(t.critical).toBe(true);
  });
});

describe('Timer.format', () => {
  it('formats as mm:ss', () => {
    expect(Timer.format(0)).toBe('00:00');
    expect(Timer.format(9)).toBe('00:09');
    expect(Timer.format(60)).toBe('01:00');
    expect(Timer.format(605)).toBe('10:05');
  });

  it('rounds up partial seconds and clamps negatives', () => {
    expect(Timer.format(0.2)).toBe('00:01');
    expect(Timer.format(-5)).toBe('00:00');
  });
});

describe('Timer - difficulty integration', () => {
  it('gives a shorter clock on harder difficulties', () => {
    const simple = new Timer({ secondsPerHazard: 90, hazardCount: 10 });
    const hard = new Timer({ secondsPerHazard: 38, hazardCount: 10 });
    expect(simple.total).toBeGreaterThan(hard.total);
  });
});

describe('Timer - fixed round length (Test Mode)', () => {
  it('uses totalSeconds instead of seconds-per-hazard x count', () => {
    const t = new Timer({ secondsPerHazard: 60, hazardCount: 15, totalSeconds: 300 });
    expect(t.total).toBe(300);
    expect(t.display).toBe('05:00');
  });

  it('keeps the per-hazard clock at the difficulty pace underneath', () => {
    const t = new Timer({ secondsPerHazard: 38, hazardCount: 15, totalSeconds: 300 });
    t.start();
    t.tick(10);
    expect(t.hazardRemaining).toBe(28);
    expect(t.remaining).toBe(290);
  });

  it('ends the round at five minutes whatever the difficulty', () => {
    for (const per of [90, 60, 38]) {
      const t = new Timer({ secondsPerHazard: per, hazardCount: 15, totalSeconds: 300 });
      t.start();
      let expired = false;
      for (let i = 0; i < 300 && !expired; i++) expired = t.tick(1).expired;
      expect(expired).toBe(true);
      expect(t.elapsed).toBe(300);
    }
  });

  it('warns at one minute and goes critical at thirty seconds', () => {
    const t = new Timer({ secondsPerHazard: 60, hazardCount: 15, totalSeconds: 300, roundWarnAt: 60, roundCriticalAt: 30 });
    t.start();
    t.tick(239);
    expect(t.roundWarning).toBe(false);
    t.tick(1);
    expect(t.roundWarning).toBe(true);
    expect(t.roundCritical).toBe(false);
    t.tick(30);
    expect(t.roundCritical).toBe(true);
  });

  it('survives a reset with the fixed length intact', () => {
    const t = new Timer({ secondsPerHazard: 60, hazardCount: 15, totalSeconds: 300 });
    t.start();
    t.tick(100);
    t.reset();
    expect(t.total).toBe(300);
    expect(t.remaining).toBe(300);
  });
});
