/**
 * Runtime pieces behind the Settings screen that can be tested without a
 * browser: the colour-blind palettes, aim-assist tolerance, and the score
 * snapshot a resumed training round is rebuilt from.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PALETTES, setColourMode, palette, severityHex, colourMode } from '../src/data/palette.js';
import { HazardSystem } from '../src/hazards/HazardSystem.js';
import { ScoreManager } from '../src/gameplay/ScoreManager.js';
import { SCORING } from '../src/data/config.js';

describe('Colour-blind palettes', () => {
  const HEX = /^#[0-9a-f]{6}$/i;

  it('defines all four meaning-carrying colours in every mode', () => {
    for (const [name, p] of Object.entries(PALETTES)) {
      for (const k of ['major', 'minor', 'success', 'danger']) {
        expect(p[k], `${name}.${k}`).toMatch(HEX);
      }
    }
  });

  it('never makes major and minor the same colour', () => {
    for (const p of Object.values(PALETTES)) expect(p.major.toLowerCase()).not.toBe(p.minor.toLowerCase());
  });

  it('actually changes the red-green pair for protanopia and deuteranopia', () => {
    for (const m of ['protanopia', 'deuteranopia']) {
      expect(PALETTES[m].major).not.toBe(PALETTES.none.major);
      expect(PALETTES[m].success).not.toBe(PALETTES.none.success);
    }
  });

  it('moves minor away from amber for tritanopia', () => {
    expect(PALETTES.tritanopia.minor).not.toBe(PALETTES.none.minor);
  });

  it('switches the palette used for the 3D markers', () => {
    setColourMode('deuteranopia');
    expect(colourMode()).toBe('deuteranopia');
    expect(severityHex('major')).toBe(parseInt(PALETTES.deuteranopia.major.slice(1), 16));
    setColourMode('nonsense');
    expect(colourMode()).toBe('none');
    expect(palette()).toBe(PALETTES.none);
  });
});

describe('Aim tolerance', () => {
  const mk = () => new HazardSystem(new THREE.Scene(), new THREE.PerspectiveCamera());

  it('combines the difficulty tolerance with aim assist', () => {
    const h = mk();
    h.setFlagRadius(1.0);
    h.setAimAssist(1.25);
    expect(h.effectiveTolerance).toBeCloseTo(1.25);
  });

  it('never shrinks a target below 85%, even on Hard with no assist', () => {
    const h = mk();
    h.setFlagRadius(0.8);
    h.setAimAssist(1);
    expect(h.effectiveTolerance).toBe(0.85);
  });

  it('caps a huge tolerance so targets cannot swallow the scene', () => {
    const h = mk();
    h.setFlagRadius(1.35);
    h.setAimAssist(3);
    expect(h.effectiveTolerance).toBe(2.2);
  });
});

describe('Score snapshot (training resume)', () => {
  it('round-trips everything the results screen needs', () => {
    const a = new ScoreManager({ multiplier: 1, scoring: SCORING });
    a.recordCorrect({ id: 'blocked-walkway', severity: 'minor', reactionTime: 4, allottedTime: 60 });
    a.recordCorrect({ id: 'damaged-rack', severity: 'major', reactionTime: 9, allottedTime: 60 });
    a.recordWrong({ reason: 'decoy' });
    const b = new ScoreManager({ multiplier: 1, scoring: SCORING }).restore(JSON.parse(JSON.stringify(a.toJSON())));
    expect(b.score).toBe(a.score);
    expect(b.correct).toBe(2);
    expect(b.wrong).toBe(1);
    expect(b.finds.map((f) => f.id)).toEqual(['blocked-walkway', 'damaged-rack']);
    expect(b.accuracy).toBeCloseTo(a.accuracy);
  });

  it('ignores a corrupt snapshot instead of throwing', () => {
    const s = new ScoreManager({ multiplier: 1, scoring: SCORING });
    expect(() => s.restore(null)).not.toThrow();
    expect(() => s.restore({ rawScore: 'x', finds: 'nope' })).not.toThrow();
    expect(s.rawScore).toBe(0);
    expect(s.finds).toEqual([]);
  });
});
