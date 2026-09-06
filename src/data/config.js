/**
 * config.js
 * Central, tunable configuration for Beat The Hazard.
 * Everything a designer/lecturer might want to rebalance lives here -
 * no gameplay constants should be hard-coded in systems.
 */

export const SCORING = {
  major: { fast: 15, slow: 7 },
  minor: { fast: 5, slow: 2 },
  wrong: 0,
  /** A find is "fast" if made within this fraction of the hazard's allotted time. */
  fastThresholdRatio: 0.5,
  /** Bonus points awarded once a combo is active (per correct find). */
  comboBonus: 3,
  /** Number of consecutive correct finds required to trigger a combo. */
  comboLength: 3,
  /** Points deducted for a wrong flag (0 = no penalty, only feedback). */
  wrongPenalty: 0,
};

export const RANKS = [
  { min: 50, id: 'champion', label: 'Safety Champion', color: '#22c55e' },
  { min: 30, id: 'getting-there', label: 'Getting There', color: '#eab308' },
  { min: -Infinity, id: 'needs-practice', label: 'Needs Practice', color: '#ef4444' },
];

export function rankForScore(score) {
  return RANKS.find((r) => score >= r.min) ?? RANKS[RANKS.length - 1];
}

/**
 * Difficulty presets. These change *actual gameplay*, not just a label:
 *  - secondsPerHazard drives the reaction clock
 *  - highlightHazards / showHazardCount / proximityHints change guidance
 *  - decoyCount injects visually-similar but SAFE distractor props
 *  - movingHazards enables forklift patrols & animated instability
 *  - ambientLight/fogDensity reduce visibility
 *  - flagRadius controls how forgiving the aim/click detection is
 */
export const DIFFICULTIES = {
  simple: {
    id: 'simple',
    label: 'Simple',
    blurb: 'Obvious hazards, generous time, strong guidance.',
    secondsPerHazard: 90,
    scoreMultiplier: 1.0,
    highlightHazards: true,
    showHazardCount: true,
    proximityHints: true,
    decoyCount: 0,
    movingHazards: false,
    ambientIntensity: 0.85,
    fogDensity: 0.006,
    flagRadius: 1.35,
    maxWrongBeforeTip: 1,
  },
  mid: {
    id: 'mid',
    label: 'Mid',
    blurb: 'Standard time, moderate distractions, no highlights.',
    secondsPerHazard: 60,
    scoreMultiplier: 1.25,
    highlightHazards: false,
    showHazardCount: true,
    proximityHints: false,
    decoyCount: 6,
    movingHazards: true,
    ambientIntensity: 0.6,
    fogDensity: 0.011,
    flagRadius: 1.0,
    maxWrongBeforeTip: 2,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    blurb: 'Subtle hazards, short clock, heavy distractions, dim light.',
    secondsPerHazard: 38,
    scoreMultiplier: 1.6,
    highlightHazards: false,
    showHazardCount: false,
    proximityHints: false,
    decoyCount: 12,
    movingHazards: true,
    ambientIntensity: 0.4,
    fogDensity: 0.017,
    flagRadius: 0.8,
    maxWrongBeforeTip: 3,
  },
};

export const DIFFICULTY_ORDER = ['simple', 'mid', 'hard'];

export const PLAYER = {
  eyeHeight: 1.68,
  radius: 0.34,
  walkSpeed: 3.4,
  runSpeed: 6.0,
  crouchSpeed: 1.7,
  crouchHeight: 1.05,
  accel: 22,
  damping: 11,
  lookSensitivity: 0.0022,
  touchLookSensitivity: 0.005,
  /** Max distance (metres) at which the player can flag a hazard. */
  interactRange: 14,
};

export const RENDER = {
  fov: 72,
  near: 0.08,
  far: 220,
  maxPixelRatio: 2,
  shadowMapSize: 2048,
};

export const ACHIEVEMENTS = [
  { id: 'first-hazard', label: 'First Hazard', desc: 'Correctly identify your first hazard.', icon: '🎯' },
  { id: 'training-complete', label: 'Training Complete', desc: 'Finish Train Mode in any environment.', icon: '🎓' },
  { id: 'safety-champion', label: 'Safety Champion', desc: 'Earn the Safety Champion rank in a test.', icon: '🏆' },
  { id: 'fast-responder', label: 'Fast Responder', desc: 'Average reaction time under 15 seconds.', icon: '⚡' },
  { id: 'combo-master', label: 'Combo Master', desc: 'Reach a combo streak of 5 or more.', icon: '🔥' },
  { id: 'perfect-test', label: 'Perfect Test', desc: 'Find every hazard with zero wrong flags.', icon: '💎' },
  { id: 'hard-cleared', label: 'Hard Cleared', desc: 'Complete a Hard test with a passing rank.', icon: '🧗' },
  { id: 'all-environments', label: 'Site Inspector', desc: 'Complete a test in all three environments.', icon: '🗺️' },
];

/** Progression gate order: train -> simple -> mid -> hard. */
export const PROGRESSION = {
  requireTrainBeforeTest: true,
  requireSimpleBeforeMid: true,
  requireMidBeforeHard: true,
  /** Minimum score in the previous difficulty to unlock the next. */
  unlockScore: 30,
};
