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
    const t = new Timer({ secondsPerHazard: 60, hazardCount: 1 });
    t.start();
    t.tick(52);
    expect(t.critical).toBe(false);
    t.tick(2); // 6s left, min(10, 9) = 9
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
