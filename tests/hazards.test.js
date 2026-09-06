/**
 * Hazard data integrity and difficulty configuration.
 *
 * These guard the content, not just the code: a hazard with a missing safety
 * tip or a difficulty that does not actually differ from another would be a
 * silent regression in a *training* product.
 */
import { describe, it, expect } from 'vitest';
import { HAZARDS, HAZARD_BY_ID, HAZARD_CATEGORIES, getHazard, hazardsByCategory } from '../src/data/hazards.js';
import { DIFFICULTIES, DIFFICULTY_ORDER, SCORING, RANKS } from '../src/data/config.js';

describe('Hazard catalogue', () => {
  it('contains the 15 required hazard scenarios', () => {
    expect(HAZARDS).toHaveLength(15);
  });

  it('covers every scenario named in the brief', () => {
    const required = [
      'forklift-pedestrian-collision',
      'forklift-reversing-blind',
      'falling-boxes',
      'damaged-rack',
      'floor-spill',
      'blocked-walkway',
      'blocked-fire-exit',
      'blocked-extinguisher',
      'no-ppe-worker',
      'open-dock-edge',
      'trailing-cable',
      'broken-pallet',
      'overloaded-stack',
      'unsafe-ladder',
      'blind-corner',
    ];
    for (const id of required) {
      expect(HAZARD_BY_ID[id], `missing hazard: ${id}`).toBeDefined();
    }
  });

  it('has unique ids', () => {
    const ids = HAZARDS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every hazard the teaching fields the UI renders', () => {
    for (const h of HAZARDS) {
      expect(h.name, `${h.id} name`).toBeTruthy();
      expect(h.description, `${h.id} description`).toBeTruthy();
      expect(h.whyDangerous, `${h.id} whyDangerous`).toBeTruthy();
      expect(h.safetyTip, `${h.id} safetyTip`).toBeTruthy();
      expect(h.trainExplanation, `${h.id} trainExplanation`).toBeTruthy();
      expect(h.regulation, `${h.id} regulation`).toBeTruthy();
      expect(Array.isArray(h.keywords) && h.keywords.length > 0, `${h.id} keywords`).toBe(true);
    }
  });

  it('uses only valid severities and both are represented', () => {
    const sevs = new Set(HAZARDS.map((h) => h.severity));
    for (const s of sevs) expect(['major', 'minor']).toContain(s);
    expect(sevs.has('major')).toBe(true);
    expect(sevs.has('minor')).toBe(true);
  });

  it('assigns every hazard to a declared category', () => {
    for (const h of HAZARDS) {
      expect(HAZARD_CATEGORIES[h.category], `${h.id} category "${h.category}"`).toBeDefined();
    }
  });

  it('writes substantial teaching text, not placeholders', () => {
    for (const h of HAZARDS) {
      expect(h.trainExplanation.length, `${h.id} trainExplanation too short`).toBeGreaterThan(80);
      expect(h.safetyTip.length, `${h.id} safetyTip too short`).toBeGreaterThan(40);
    }
  });

  it('classifies the life-threatening scenarios as major', () => {
    for (const id of [
      'forklift-pedestrian-collision',
      'forklift-reversing-blind',
      'falling-boxes',
      'damaged-rack',
      'blocked-fire-exit',
      'open-dock-edge',
      'unsafe-ladder',
      'blind-corner',
    ]) {
      expect(getHazard(id).severity, `${id} should be major`).toBe('major');
    }
  });

  it('throws a clear error for an unknown id', () => {
    expect(() => getHazard('nope')).toThrow(/Unknown hazard/);
  });

  it('groups by category without losing any hazard', () => {
    const grouped = hazardsByCategory();
    const total = Object.values(grouped).reduce((n, list) => n + list.length, 0);
    expect(total).toBe(HAZARDS.length);
  });
});

describe('Difficulty configuration', () => {
  it('defines all three difficulties in order', () => {
    expect(DIFFICULTY_ORDER).toEqual(['simple', 'mid', 'hard']);
    for (const id of DIFFICULTY_ORDER) expect(DIFFICULTIES[id]).toBeDefined();
  });

  it('shortens the reaction clock as difficulty rises', () => {
    const [s, m, h] = DIFFICULTY_ORDER.map((d) => DIFFICULTIES[d].secondsPerHazard);
    expect(s).toBeGreaterThan(m);
    expect(m).toBeGreaterThan(h);
  });

  it('raises the score multiplier as difficulty rises', () => {
    const [s, m, h] = DIFFICULTY_ORDER.map((d) => DIFFICULTIES[d].scoreMultiplier);
    expect(m).toBeGreaterThan(s);
    expect(h).toBeGreaterThan(m);
  });

  it('adds more decoys as difficulty rises', () => {
    const [s, m, h] = DIFFICULTY_ORDER.map((d) => DIFFICULTIES[d].decoyCount);
    expect(m).toBeGreaterThan(s);
    expect(h).toBeGreaterThan(m);
  });

  it('dims the environment as difficulty rises', () => {
    const [s, m, h] = DIFFICULTY_ORDER.map((d) => DIFFICULTIES[d].ambientIntensity);
    expect(s).toBeGreaterThan(m);
    expect(m).toBeGreaterThan(h);
  });

  it('tightens aim tolerance as difficulty rises', () => {
    const [s, m, h] = DIFFICULTY_ORDER.map((d) => DIFFICULTIES[d].flagRadius);
    expect(s).toBeGreaterThan(m);
    expect(m).toBeGreaterThan(h);
  });

  it('only guides the player on Simple', () => {
    expect(DIFFICULTIES.simple.highlightHazards).toBe(true);
    expect(DIFFICULTIES.mid.highlightHazards).toBe(false);
    expect(DIFFICULTIES.hard.highlightHazards).toBe(false);
    expect(DIFFICULTIES.hard.showHazardCount).toBe(false);
  });

  it('enables moving hazards above Simple', () => {
    expect(DIFFICULTIES.simple.movingHazards).toBe(false);
    expect(DIFFICULTIES.mid.movingHazards).toBe(true);
    expect(DIFFICULTIES.hard.movingHazards).toBe(true);
  });

  it('makes each difficulty genuinely different, not just relabelled', () => {
    const shape = (d) => JSON.stringify({
      t: d.secondsPerHazard, m: d.scoreMultiplier, hi: d.highlightHazards,
      dc: d.decoyCount, mv: d.movingHazards, amb: d.ambientIntensity, fr: d.flagRadius,
    });
    const shapes = DIFFICULTY_ORDER.map((id) => shape(DIFFICULTIES[id]));
    expect(new Set(shapes).size).toBe(3);
  });
});

describe('Scoring configuration', () => {
  it('matches the values specified in the brief', () => {
    expect(SCORING.major.fast).toBe(15);
    expect(SCORING.major.slow).toBe(7);
    expect(SCORING.minor.fast).toBe(5);
    expect(SCORING.minor.slow).toBe(2);
    expect(SCORING.wrong).toBe(0);
    expect(SCORING.comboLength).toBe(3);
  });

  it('always scores a major hazard above a minor one', () => {
    expect(SCORING.major.fast).toBeGreaterThan(SCORING.minor.fast);
    expect(SCORING.major.slow).toBeGreaterThan(SCORING.minor.slow);
  });

  it('defines the rank thresholds from the brief', () => {
    expect(RANKS.find((r) => r.id === 'champion').min).toBe(50);
    expect(RANKS.find((r) => r.id === 'getting-there').min).toBe(30);
  });

  it('orders ranks from highest to lowest threshold', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i - 1].min).toBeGreaterThan(RANKS[i].min);
    }
  });
});
