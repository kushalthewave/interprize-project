/**
 * data/palette.js
 * Colour-blind-safe palettes for the four colours that carry meaning:
 * major hazard, minor hazard, right, wrong.
 *
 * Built from the Okabe–Ito set, which was designed to stay distinguishable
 * under all three common colour-vision deficiencies. Severity is also always
 * written in words, so colour is never the only signal — these palettes make
 * the colour itself useful as well.
 *
 *   Protanopia / deuteranopia (red–green): red and green collapse towards
 *   the same brown-yellow, so major becomes orange and minor sky blue, and
 *   right/wrong become blue/vermilion.
 *   Tritanopia (blue–yellow): amber and pale blue are the problem, so minor
 *   becomes pink-magenta; red and green stay.
 */
export const PALETTES = {
  none: { major: '#ff4d4d', minor: '#ffc14d', success: '#22c55e', danger: '#ef4444' },
  protanopia: { major: '#ffb000', minor: '#56b4e9', success: '#0072b2', danger: '#d55e00' },
  deuteranopia: { major: '#e69f00', minor: '#56b4e9', success: '#0072b2', danger: '#d55e00' },
  tritanopia: { major: '#ff4d4d', minor: '#e056a0', success: '#009e73', danger: '#d55e00' },
};

let mode = 'none';

export function setColourMode(m) {
  mode = PALETTES[m] ? m : 'none';
  return mode;
}

export function colourMode() {
  return mode;
}

/** The current palette. */
export function palette() {
  return PALETTES[mode];
}

/** A severity colour as a THREE-style 0xRRGGBB number. */
export function severityHex(severity) {
  const c = severity === 'major' ? palette().major : palette().minor;
  return parseInt(c.slice(1), 16);
}
