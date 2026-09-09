/**
 * build-frames.mjs — generates Figma-importable UI artboards for the prototype.
 *
 *   node design/build-frames.mjs
 *
 * Output: design/frames/*.svg  (1440 x 900, one per screen)
 *
 * These are plain SVG with real <rect>/<text> nodes, so Figma imports them as
 * editable vector layers and editable text - not flattened images. Colours and
 * type match src/ui/styles.css so the prototype and the built game agree.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'frames');
mkdirSync(OUT, { recursive: true });

const W = 1440;
const H = 900;

/* Palette lifted from src/ui/styles.css so the two never drift. */
const C = {
  bg: '#0b0f14',
  bg2: '#0e141b',
  panel: '#121820',
  panelSolid: '#151c25',
  border: '#2a323b',
  text: '#e9eef4',
  dim: '#97a4b2',
  faint: '#64717f',
  accent: '#f2b90c',
  accent2: '#ff8a1f',
  danger: '#ef4444',
  success: '#22c55e',
  info: '#38bdf8',
  major: '#ff4d4d',
  minor: '#ffc14d',
};
const FONT = 'Inter, Segoe UI, system-ui, sans-serif';
const MONO = 'JetBrains Mono, Consolas, monospace';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------------------------------------------------------------- *
 * Primitives
 * ---------------------------------------------------------------- */
const rect = (x, y, w, h, fill, { r = 0, stroke = null, sw = 1, opacity = 1 } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"` +
  (stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : '') +
  (opacity !== 1 ? ` opacity="${opacity}"` : '') + '/>';

const text = (x, y, s, {
  size = 14, fill = C.text, weight = 400, anchor = 'start', font = FONT,
  spacing = null, opacity = 1,
} = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="${fill}" ` +
  `font-weight="${weight}" text-anchor="${anchor}"` +
  (spacing ? ` letter-spacing="${spacing}"` : '') +
  (opacity !== 1 ? ` opacity="${opacity}"` : '') +
  `>${esc(s)}</text>`;

const circle = (cx, cy, r, fill, { stroke = null, sw = 2 } = {}) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"` +
  (stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : '') + '/>';

const line = (x1, y1, x2, y2, stroke, sw = 1) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"/>`;

/** Wrap long copy onto multiple lines at an approximate character width. */
function paragraph(x, y, s, { size = 13, fill = C.dim, width = 60, lh = 1.5, weight = 400 } = {}) {
  const words = String(s).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > width) { lines.push(cur.trim()); cur = w; }
    else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.map((l, i) => text(x, y + i * size * lh, l, { size, fill, weight })).join('\n  ');
}

const btn = (x, y, w, h, label, { primary = false, size = 15 } = {}) => `
  ${rect(x, y, w, h, primary ? C.accent : '#1b232c', { r: 8, stroke: primary ? 'none' : C.border })}
  ${text(x + w / 2, y + h / 2 + size * 0.36, label, {
    size, weight: primary ? 800 : 600, fill: primary ? '#1a1204' : C.text, anchor: 'middle',
  })}`;

const card = (x, y, w, h, { fill = C.panel } = {}) =>
  rect(x, y, w, h, fill, { r: 12, stroke: C.border });

const chip = (x, y, label, { fill = '#1e2630', color = C.dim, size = 11, pad = 10 } = {}) => {
  const w = label.length * size * 0.58 + pad * 2;
  return `${rect(x, y, w, size + 12, fill, { r: 999 })}
  ${text(x + pad, y + size + 3, label, { size, fill: color, weight: 700 })}`;
};

/** Frame wrapper. `title` becomes the Figma layer name via <title>. */
function frame(name, body, { bg = C.bg } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>${esc(name)}</title>
  <rect width="${W}" height="${H}" fill="${bg}"/>
  ${body}
</svg>`;
}

/** The brand lock-up used on menu screens. */
const brandBlock = (cy) => `
  ${text(W / 2, cy, 'BEAT THE HAZARD', { size: 46, weight: 900, fill: C.accent, anchor: 'middle', spacing: -0.5 })}
  ${text(W / 2, cy + 30, 'Warehouse Forklift & Pedestrian Safety Training', { size: 15, fill: C.dim, anchor: 'middle' })}
  ${text(W / 2, cy + 56, 'HIMALAYA LOGISTICS · BIRGUNJ DISTRIBUTION CENTRE', { size: 11, fill: C.faint, anchor: 'middle', spacing: 1.6 })}`;

/* ================================================================== *
 * 01 — Login
 * ================================================================== */
const login = frame('01 Login', `
  ${brandBlock(150)}
  ${card(480, 250, 480, 430)}
  ${text(520, 300, 'Start training', { size: 24, weight: 800 })}
  ${text(520, 326, 'Your name and progress are stored on this device only.', { size: 12.5, fill: C.dim })}

  ${text(520, 372, 'YOUR NAME', { size: 10.5, fill: C.dim, weight: 700, spacing: 1.2 })}
  ${rect(520, 384, 400, 44, '#080c11', { r: 8, stroke: C.border })}
  ${text(538, 412, 'e.g. Sunita Shrestha', { size: 14, fill: C.faint })}

  ${text(520, 462, 'CHOOSE YOUR AVATAR', { size: 10.5, fill: C.dim, weight: 700, spacing: 1.2 })}
  ${rect(520, 474, 192, 104, '#1a2129', { r: 10, stroke: C.accent, sw: 2 })}
  ${text(616, 516, '🧑🏽‍🏭', { size: 30, anchor: 'middle' })}
  ${text(616, 540, 'Ramesh', { size: 13, weight: 700, anchor: 'middle' })}
  ${text(616, 558, 'Daura-surwal · dhaka topi', { size: 10, fill: C.faint, anchor: 'middle' })}
  ${rect(728, 474, 192, 104, '#161d25', { r: 10, stroke: C.border })}
  ${text(824, 516, '👩🏽‍🏭', { size: 30, anchor: 'middle' })}
  ${text(824, 540, 'Sunita', { size: 13, weight: 700, anchor: 'middle' })}
  ${text(824, 558, 'Kurti-surwal · dupatta', { size: 10, fill: C.faint, anchor: 'middle' })}

  ${btn(520, 604, 400, 50, 'Enter the warehouse', { primary: true, size: 16 })}
  ${text(520, 676, 'Continue as guest', { size: 12, fill: C.dim, weight: 600 })}
  ${text(920, 676, 'Google sign-in not configured', { size: 11.5, fill: C.faint, anchor: 'end' })}

  ${text(W / 2, 726, 'This is a training simulation. Hazards shown are staged for teaching purposes.', { size: 11.5, fill: C.faint, anchor: 'middle' })}
`);

/* ================================================================== *
 * 02 — Main menu
 * ================================================================== */
const tiles = [
  ['🎓', 'Train Mode', 'Guided tour. Hazards are highlighted and explained. Unlocks testing.', true],
  ['🎯', 'Test Mode', 'Find the hazards yourself against the clock. Scored and ranked.', true],
  ['🏭', 'Environments', 'Three warehouses: general storage, dispatch bay, high-bay annexe.', false],
  ['📊', 'Progress', 'Scores, ranks, achievements and your session history.', false],
  ['📖', 'Hazard Guide', 'Reference for all 15 hazard types and their controls.', false],
  ['⚙️', 'Settings', 'Audio, controls, gameplay, accessibility and data.', false],
];
const menu = frame('02 Main Menu', `
  ${card(220, 60, 1000, 68)}
  ${circle(268, 94, 22, '#232c36')}
  ${text(268, 102, '🧑🏽‍🏭', { size: 19, anchor: 'middle' })}
  ${text(302, 89, 'Kushal', { size: 15, weight: 800 })}
  ${text(302, 108, 'Best score 243 · 5/8 achievements', { size: 11.5, fill: C.faint })}
  ${chip(1000, 82, '58% complete')}
  ${btn(1112, 78, 88, 34, 'Profile', { size: 12.5 })}

  ${brandBlock(210)}

  ${tiles.map((t, i) => {
    const x = 220 + (i % 3) * 336;
    const y = 320 + Math.floor(i / 3) * 168;
    return `${rect(x, y, 312, 144, t[3] ? '#1c1f16' : C.panel, { r: 12, stroke: t[3] ? '#4a4420' : C.border })}
  ${text(x + 26, y + 48, t[0], { size: 26 })}
  ${text(x + 26, y + 82, t[1], { size: 17, weight: 800 })}
  ${paragraph(x + 26, y + 104, t[2], { size: 11.5, width: 42, fill: C.dim })}`;
  }).join('\n  ')}

  ${text(W / 2, 700, 'Desktop: mouse + keyboard.  Tablet/phone: on-screen sticks.', { size: 12, fill: C.faint, anchor: 'middle' })}
`);

/* ================================================================== *
 * 03 — Environment select
 * ================================================================== */
const envs = [
  ['1', 'GENERAL WAREHOUSE · BIRGUNJ DC', 'Main Storage Hall',
   'Four racking runs, a central pedestrian spine and an active forklift aisle. Every hazard type appears here.',
   ['15 hazards', '62×44 m', '✓ Trained', 'Best 243']],
  ['2', 'CROSS-DOCK · HEAVY VEHICLE TRAFFIC', 'Loading & Dispatch Bay',
   'Six dock doors and constant forklift movement. Vehicle/pedestrian conflict and dock edges.',
   ['12 hazards', '70×30 m', '✓ Trained', 'Best 175']],
  ['3', 'NARROW AISLE · LOW LIGHT · HIGH RISK', 'High-Bay Annexe',
   'Five-level narrow-aisle store, poor lighting, heavy congestion. All 15 hazards, harder to see.',
   ['15 hazards', '54×40 m', 'Not trained']],
];
const envSelect = frame('03 Environment Select', `
  ${text(120, 96, 'TEST MODE · CHOOSE A SITE', { size: 11, fill: C.accent, weight: 700, spacing: 1.8 })}
  ${text(120, 138, 'Where are you working today?', { size: 30, weight: 800 })}
  ${text(120, 168, 'You will be scored on what you find, how fast, and how few wrong calls you make.', { size: 13.5, fill: C.dim })}

  ${envs.map((e, i) => {
    const x = 120 + i * 404;
    return `${card(x, 220, 380, 400)}
  ${text(x + 348, 268, e[0], { size: 44, weight: 800, fill: '#1e242c', anchor: 'end' })}
  ${text(x + 28, 266, e[1], { size: 10, fill: C.accent, weight: 700, spacing: 1.1 })}
  ${text(x + 28, 300, e[2], { size: 20, weight: 800 })}
  ${paragraph(x + 28, 332, e[3], { size: 12.5, width: 44, fill: C.dim })}
  ${e[4].map((m, j) => chip(x + 28 + (j % 2) * 160, 440 + Math.floor(j / 2) * 34, m)).join('\n  ')}
  ${btn(x + 28, 548, 324, 44, i === 2 ? '🔒 Complete training first' : 'Select this site', { primary: i !== 2 })}`;
  }).join('\n  ')}

  ${text(120, 676, '← Back', { size: 13.5, fill: C.dim, weight: 600 })}
`);

/* ================================================================== *
 * 04 — Difficulty select
 * ================================================================== */
const diffs = [
  ['Simple', C.success, 'Obvious hazards, generous time, strong guidance.',
   ['90 s per hazard', '×1.0 score', 'Hazards highlighted', '0 decoys']],
  ['Mid', C.accent, 'Standard time, moderate distractions, no highlights.',
   ['60 s per hazard', '×1.25 score', 'No highlights', '6 decoys', 'Moving hazards']],
  ['Hard', C.danger, 'Subtle hazards, short clock, heavy distractions, dim light.',
   ['38 s per hazard', '×1.6 score', 'Count hidden', '12 decoys', 'Moving hazards']],
];
const diffSelect = frame('04 Difficulty Select', `
  ${text(120, 96, 'MAIN STORAGE HALL', { size: 11, fill: C.accent, weight: 700, spacing: 1.8 })}
  ${text(120, 138, 'Choose difficulty', { size: 30, weight: 800 })}
  ${text(120, 168, 'Difficulty changes the clock, the lighting, the number of decoys and whether hazards move.', { size: 13.5, fill: C.dim })}

  ${diffs.map((d, i) => {
    const x = 120 + i * 404;
    return `${card(x, 220, 380, 380)}
  ${rect(x, 220, 5, 380, d[1], { r: 3 })}
  ${text(x + 30, 272, d[0], { size: 24, weight: 800 })}
  ${paragraph(x + 30, 302, d[2], { size: 12.5, width: 44, fill: C.dim })}
  ${d[3].map((m, j) => chip(x + 30, 350 + j * 34, m)).join('\n  ')}
  ${btn(x + 30, 528, 320, 44, `Start ${d[0]}`, { primary: i === 0 })}`;
  }).join('\n  ')}

  ${text(120, 660, '← Back', { size: 13.5, fill: C.dim, weight: 600 })}
`);

/* ================================================================== *
 * 05 — In-game HUD  (the key frame)
 * ================================================================== */
const hudChip = (x, y, w, k, v, { accent = false, crit = false } = {}) => `
  ${rect(x, y, w, 58, '#0a0e13cc', { r: 10, stroke: crit ? '#ef444488' : C.border })}
  ${text(x + 14, y + 20, k, { size: 8.5, fill: C.faint, weight: 700, spacing: 1.2 })}
  ${text(x + 14, y + 45, v, { size: 21, weight: 800, font: MONO, fill: crit ? C.danger : (accent ? C.accent : C.text) })}`;

const hud = frame('05 In-Game HUD', `
  <!-- warehouse stand-in: the real frame shows the 3D view -->
  ${rect(0, 0, W, H, '#20262d')}
  ${rect(0, 470, W, 430, '#6f767d')}
  ${rect(300, 470, 240, 430, '#1f8a4c', { opacity: 0.85 })}
  ${rect(300, 470, 8, 430, '#dedede')}
  ${rect(532, 470, 8, 430, '#dedede')}
  ${rect(720, 470, 6, 430, '#e8c000')}
  ${[0, 1, 2, 3].map((i) => `${rect(60 + i * 330, 150, 60, 330, '#c2521a')}
  ${rect(60 + i * 330, 210, 250, 16, '#1f4e9c')}
  ${rect(60 + i * 330, 320, 250, 16, '#1f4e9c')}
  ${rect(96 + i * 330, 150, 190, 58, '#c69a63')}
  ${rect(96 + i * 330, 258, 190, 58, '#b98d58')}`).join('\n  ')}
  ${rect(0, 0, W, 150, '#161b21')}

  <!-- top bar -->
  ${hudChip(24, 24, 110, 'MODE', 'TRAIN')}
  ${hudChip(146, 24, 130, 'DIFFICULTY', 'Simple')}
  ${hudChip(880, 24, 190, 'HAZARDS FOUND', '4/15')}
  ${rect(894, 70, 162, 5, '#ffffff22', { r: 3 })}
  ${rect(894, 70, 43, 5, C.accent, { r: 3 })}
  ${hudChip(1082, 24, 130, 'SCORE', '58', { accent: true })}
  ${hudChip(1224, 24, 192, 'REACTION CLOCK', '00:12', { crit: true })}

  <!-- combo badge -->
  ${rect(742, 24, 124, 34, C.accent2, { r: 999 })}
  ${text(804, 46, '🔥 COMBO x4', { size: 12.5, weight: 900, fill: '#1a1204', anchor: 'middle' })}

  <!-- reticle -->
  ${line(720, 438, 720, 462, C.accent, 2)}
  ${line(708, 450, 732, 450, C.accent, 2)}
  ${circle(720, 450, 3, C.accent)}
  ${rect(636, 476, 168, 30, '#0a0e13dd', { r: 8, stroke: C.accent })}
  ${text(652, 496, 'Flag this hazard', { size: 12.5, weight: 700 })}
  ${rect(770, 482, 22, 18, C.accent, { r: 4 })}
  ${text(781, 496, 'E', { size: 11, weight: 900, fill: '#1a1204', anchor: 'middle' })}

  <!-- Train Mode panel -->
  ${card(24, 178, 320, 214, C.panel)}
  ${text(46, 208, 'TRAINING · 4/15 LEARNED', { size: 9.5, fill: C.accent, weight: 800, spacing: 1.2 })}
  ${text(46, 236, 'Find the next hazard', { size: 16, weight: 800 })}
  ${paragraph(46, 260, 'Compare this pallet with the ones beside it. Look at the edges.', { size: 12, width: 40, fill: C.dim })}
  ${rect(46, 306, 190, 26, '#3a2f10', { r: 6 })}
  ${text(58, 324, 'Unstable / falling boxes', { size: 11.5, weight: 700, fill: '#ffdf8a' })}
  ${rect(46, 342, 276, 30, '#3a2f1099', { r: 8 })}
  ${text(58, 362, '📍 Aisle C, north end — high up', { size: 12, weight: 700, fill: '#ffdf8a' })}

  <!-- feedback card -->
  ${card(430, 560, 580, 268, C.panel)}
  ${rect(430, 560, 5, 268, C.success, { r: 3 })}
  ${text(462, 596, '✓ Damaged / Leaning Racking', { size: 17, weight: 800 })}
  ${chip(752, 582, 'MAJOR', { fill: '#3a1418', color: '#ffb0b0' })}
  ${text(980, 598, '+15', { size: 20, weight: 900, fill: C.success, anchor: 'end', font: MONO })}
  ${text(462, 622, '📍 Aisle B, south end — at eye level', { size: 12.5, weight: 700, fill: C.accent })}
  ${paragraph(462, 646, 'Damaged uprights lose a large part of their load capacity. Racking failure is progressive.', { size: 12.5, width: 62, fill: C.dim })}
  ${rect(462, 682, 520, 52, '#0d2a3a', { r: 8 })}
  ${rect(462, 682, 3, 52, C.info)}
  ${paragraph(478, 702, 'Safe practice: report and barrier off impact damage immediately, and off-load the bay.', { size: 11.5, width: 66, fill: '#cfe9fa' })}
  ${line(462, 750, 982, 750, C.border)}
  ${text(462, 772, 'REMEMBER', { size: 9.5, fill: C.accent, weight: 800, spacing: 1.4 })}
  ${['impact damage', 'rack inspection', 'green-amber-red', 'off-load']
    .map((k, i) => chip(462 + i * 132, 784, k, { fill: C.accent, color: '#1a1204', size: 10.5 })).join('\n  ')}

  <!-- controls hint -->
  ${rect(24, 846, 700, 34, '#0a0e1399', { r: 8, stroke: C.border })}
  ${text(40, 868, 'W A S D  Move    Mouse  Look    Shift  Run    C  Crouch    E / Click  Flag hazard    Esc  Pause', { size: 11, fill: C.faint })}
`, { bg: '#20262d' });

/* ================================================================== *
 * 06 — Results
 * ================================================================== */
const stats = [
  ['12', 'CORRECT'], ['2', 'WRONG FLAGS'], ['12/15', 'HAZARDS FOUND'], ['86%', 'ACCURACY'],
  ['18.4s', 'AVG REACTION'], ['x6', 'BEST COMBO'], ['14', 'ATTEMPTS'], ['×1.25', 'DIFFICULTY'],
];
const results = frame('06 Results', `
  ${text(W / 2, 96, 'TEST COMPLETE · MAIN STORAGE HALL · MID', { size: 11.5, fill: C.faint, anchor: 'middle', spacing: 1.2 })}
  ${text(W / 2, 176, '243', { size: 76, weight: 900, anchor: 'middle', font: MONO, fill: C.text })}
  ${rect(W / 2 - 96, 200, 192, 40, '#12331f', { r: 999, stroke: C.success })}
  ${text(W / 2, 226, 'Safety Champion', { size: 16, weight: 900, fill: C.success, anchor: 'middle' })}

  ${card(120, 276, 580, 250)}
  ${text(148, 310, 'Performance', { size: 16, weight: 700 })}
  ${stats.map((s, i) => {
    const x = 148 + (i % 4) * 134;
    const y = 336 + Math.floor(i / 4) * 90;
    return `${rect(x, y, 122, 76, '#161d26', { r: 8, stroke: C.border })}
  ${text(x + 61, y + 34, s[0], { size: 21, weight: 800, anchor: 'middle', font: MONO })}
  ${text(x + 61, y + 56, s[1], { size: 8.5, fill: C.faint, weight: 700, anchor: 'middle', spacing: 0.6 })}`;
  }).join('\n  ')}

  ${card(740, 276, 580, 250)}
  ${text(768, 310, 'How to improve', { size: 16, weight: 700 })}
  ${[
    'You missed 3 major hazards. Major hazards are the ones that kill — prioritise vehicles, racking and edges.',
    'Three correct finds in a row triggers a combo bonus. Slow down slightly and confirm before you flag.',
  ].map((t, i) => `${rect(768, 330 + i * 84, 524, 72, '#0d2a3a', { r: 8 })}
  ${rect(768, 330 + i * 84, 3, 72, C.info)}
  ${paragraph(786, 356 + i * 84, t, { size: 12, width: 64, fill: '#d3e9f7' })}`).join('\n  ')}

  ${card(120, 548, 580, 236)}
  ${text(148, 582, '✓ Hazards you found (12)', { size: 15, weight: 700 })}
  ${[
    ['Damaged / Leaning Racking', 'Aisle B, south end', '6.2s · +15'],
    ['Unstable / Falling Boxes', 'Aisle C, north end', '11.8s · +15'],
    ['Blocked Emergency Exit', 'west wall', '24.1s · +7'],
  ].map((r, i) => `${rect(148, 600 + i * 58, 524, 50, '#161d26', { r: 8 })}
  ${rect(148, 600 + i * 58, 3, 50, C.success)}
  ${text(168, 620 + i * 58, r[0], { size: 12.5, weight: 700 })}
  ${text(168, 638 + i * 58, '📍 ' + r[1], { size: 10.5, fill: C.accent, weight: 700 })}
  ${text(656, 630 + i * 58, r[2], { size: 10.5, fill: C.faint, anchor: 'end', font: MONO })}`).join('\n  ')}

  ${card(740, 548, 580, 236)}
  ${text(768, 582, '✗ Hazards you missed (3)', { size: 15, weight: 700 })}
  ${[
    ['Blind Corner Conflict', 'Aisle B / cross aisle'],
    ['Person at an Open Dock Edge', 'loading dock area'],
    ['Trailing Electrical Cable', 'east wall'],
  ].map((r, i) => `${rect(768, 600 + i * 58, 524, 50, '#161d26', { r: 8 })}
  ${rect(768, 600 + i * 58, 3, 50, C.danger)}
  ${text(788, 620 + i * 58, r[0], { size: 12.5, weight: 700 })}
  ${text(788, 638 + i * 58, '📍 ' + r[1], { size: 10.5, fill: C.accent, weight: 700 })}`).join('\n  ')}

  ${btn(120, 812, 200, 46, '↻ Retry this round', { primary: true })}
  ${btn(332, 812, 180, 46, 'Change difficulty')}
  ${btn(524, 812, 180, 46, 'Other sites')}
  ${btn(716, 812, 160, 46, 'Main menu')}
`);

/* ================================================================== *
 * 07 — Settings
 * ================================================================== */
const settingsGroups = [
  ['🔊 Audio', [
    ['Sound', 'Ambience, forklift engines, reversing alarms and feedback cues.', 'toggle-on'],
    ['Volume', 'Overall loudness of every sound.', 'slider:70%'],
  ]],
  ['🎮 Controls', [
    ['Look sensitivity', 'How fast the camera turns with the mouse.', 'slider:1.00×'],
    ['Invert vertical look', 'Push the mouse forward to look down.', 'toggle-off'],
  ]],
  ['🎯 Gameplay', [
    ['Timed Test Mode', 'Run tests against the reaction clock. Off = untimed practice.', 'toggle-on'],
    ['Show hazard locations', 'Name the aisle or area a hazard is in.', 'toggle-on'],
  ]],
  ['♿ Accessibility & display', [
    ['Reduce motion', 'Turns off camera head bob while walking.', 'toggle-off'],
    ['Show performance overlay', 'Displays frame rate and draw calls while playing.', 'toggle-off'],
  ]],
];
let sy = 200;
const settingsBody = settingsGroups.map(([g, rows]) => {
  const h = 56 + rows.length * 62;
  const block = `${card(420, sy, 600, h)}
  ${text(448, sy + 34, g, { size: 15, weight: 700 })}
  ${rows.map((r, i) => {
    const y = sy + 56 + i * 62;
    const ctrl = r[2].startsWith('slider')
      ? `${rect(760, y + 26, 180, 5, '#2c343d', { r: 3 })}
  ${rect(760, y + 26, 118, 5, C.accent, { r: 3 })}
  ${circle(878, y + 28, 8, C.accent)}
  ${text(990, y + 33, r[2].split(':')[1], { size: 12.5, weight: 700, fill: C.accent, anchor: 'end', font: MONO })}`
      : `${rect(958, y + 16, 34, 20, r[2] === 'toggle-on' ? C.accent : '#2c343d', { r: 999 })}
  ${circle(r[2] === 'toggle-on' ? 982 : 968, y + 26, 7, r[2] === 'toggle-on' ? '#1a1204' : C.dim)}`;
    return `${text(448, y + 20, r[0], { size: 13.5, weight: 700 })}
  ${paragraph(448, y + 38, r[1], { size: 11, width: 56, fill: C.dim })}
  ${ctrl}
  ${i < rows.length - 1 ? line(448, y + 54, 992, y + 54, C.border) : ''}`;
  }).join('\n  ')}`;
  sy += h + 18;
  return block;
}).join('\n  ');

const settings = frame('07 Settings', `
  ${text(420, 96, 'SETTINGS', { size: 11, fill: C.accent, weight: 700, spacing: 1.8 })}
  ${text(420, 138, 'Settings', { size: 30, weight: 800 })}
  ${text(420, 166, 'Changes apply immediately and are saved to this device.', { size: 13, fill: C.dim })}
  ${settingsBody}
`);

/* ================================================================== *
 * 08 — Flow map
 * ================================================================== */
const flowNode = (x, y, w, label, sub, fill) => `
  ${rect(x, y, w, 76, fill, { r: 10, stroke: C.border })}
  ${text(x + w / 2, y + 32, label, { size: 15, weight: 800, anchor: 'middle' })}
  ${text(x + w / 2, y + 54, sub, { size: 10.5, fill: C.dim, anchor: 'middle' })}`;

const arrow = (x1, y1, x2, y2) =>
  `${line(x1, y1, x2, y2, C.accent, 2)}
  <polygon points="${x2},${y2} ${x2 - 8},${y2 - 5} ${x2 - 8},${y2 + 5}" fill="${C.accent}"/>`;

const flow = frame('08 User Flow', `
  ${text(120, 96, 'PROTOTYPE FLOW', { size: 11, fill: C.accent, weight: 700, spacing: 1.8 })}
  ${text(120, 138, 'How a trainee moves through the game', { size: 28, weight: 800 })}

  ${flowNode(120, 240, 180, 'Login', 'name + avatar', C.panel)}
  ${arrow(300, 278, 348, 278)}
  ${flowNode(356, 240, 180, 'Main Menu', 'six entry points', C.panel)}
  ${arrow(536, 278, 584, 278)}
  ${flowNode(592, 240, 200, 'Choose Site', '3 environments', C.panel)}
  ${arrow(792, 278, 840, 278)}
  ${flowNode(848, 240, 200, 'Train Mode', 'guided, highlighted', '#1c1f16')}
  ${arrow(1048, 278, 1096, 278)}
  ${flowNode(1104, 240, 200, 'Trained ✓', 'unlocks testing', '#12331f')}

  ${arrow(948, 316, 948, 386)}
  ${flowNode(848, 390, 200, 'Choose Difficulty', 'Simple / Mid / Hard', C.panel)}
  ${arrow(848, 428, 800, 428)}
  ${flowNode(592, 390, 200, 'Test Mode', 'timed, scored', '#1c1f16')}
  ${arrow(592, 428, 544, 428)}
  ${flowNode(356, 390, 180, 'Results', 'rank + coaching', '#12331f')}
  ${arrow(356, 428, 308, 428)}
  ${flowNode(120, 390, 180, 'Progress', 'history, badges', C.panel)}

  ${card(120, 530, 1200, 250)}
  ${text(150, 566, 'Test Mode loop', { size: 16, weight: 700 })}
  ${['Observe', 'Find', 'Flag', 'Validate', 'Score'].map((s, i) => {
    const x = 150 + i * 224;
    return `${rect(x, 596, 196, 56, i === 4 ? C.accent : '#161d26', { r: 8, stroke: C.border })}
  ${text(x + 98, 630, s, { size: 14, weight: 700, fill: i === 4 ? '#1a1204' : C.text, anchor: 'middle' })}
  ${i < 4 ? arrow(x + 196, 624, x + 220, 624) : ''}`;
  }).join('\n  ')}
  ${paragraph(150, 690, 'Correct: points scored by severity and speed, plus a teaching card with the control and the safety keywords. Wrong: zero points, the combo breaks, and the game explains why the thing you flagged is actually under control.', { size: 12.5, width: 108, fill: C.dim })}
  ${paragraph(150, 742, 'A decoy — a spill that IS coned and signed, a rack with a green inspection tag — is a wrong answer on purpose. Learning what "good" looks like is half of hazard spotting.', { size: 12.5, width: 108, fill: C.accent })}
`);

/* ---------------------------------------------------------------- */
const frames = {
  '01-login': login,
  '02-main-menu': menu,
  '03-environment-select': envSelect,
  '04-difficulty-select': diffSelect,
  '05-in-game-hud': hud,
  '06-results': results,
  '07-settings': settings,
  '08-user-flow': flow,
};

let total = 0;
for (const [name, svg] of Object.entries(frames)) {
  const file = join(OUT, `${name}.svg`);
  writeFileSync(file, svg);
  total += svg.length;
  console.log(`  ${name}.svg  ${(svg.length / 1024).toFixed(1)} kB`);
}
console.log(`\n${Object.keys(frames).length} frames, ${(total / 1024).toFixed(0)} kB total → ${OUT}`);
