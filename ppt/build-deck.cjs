/**
 * build-deck.cjs — the 20-minute presentation deck.
 *
 *   cd ppt && npm run build
 *
 * Themed to match the game itself: the palette is lifted verbatim from
 * src/ui/styles.css, and the recurring motif is the in-game HUD chip, so the
 * slides and the live demo look like one product.
 *
 * Timing: every slide's speaker notes open with a [m:ss] cumulative marker.
 * The plan is 18 minutes of slides + a 2-minute live demo = 20 minutes.
 */
const pptxgen = require('pptxgenjs');
const path = require('path');

const SHOT = (n) => path.join(__dirname, 'shots', 'opt', `${n}.jpg`);

/* Palette copied from src/ui/styles.css so deck and game never drift. */
const C = {
  bg: '0B0F14',
  bg2: '11171E',
  panel: '151C25',
  panel2: '1B2530',
  border: '2A323B',
  text: 'E9EEF4',
  dim: '97A4B2',
  faint: '64717F',
  accent: 'F2B90C',
  accent2: 'FF8A1F',
  danger: 'EF4444',
  success: '22C55E',
  info: '38BDF8',
  major: 'FF4D4D',
  minor: 'FFC14D',
  white: 'FFFFFF',
  ink: '1A1204',
};

const F = { head: 'Arial', body: 'Calibri', mono: 'Consolas' };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';           // 13.333 x 7.5 in
pres.author = 'Kushal Neupane';
pres.company = 'Beat The Hazard';
pres.title = 'Beat The Hazard';

const W = 13.333;
const H = 7.5;
const M = 0.7;

/* ------------------------------------------------------------------ *
 * Building blocks
 * ------------------------------------------------------------------ */

function slide({ image = null, scrim = 74, bg = C.bg } = {}) {
  const s = pres.addSlide();
  s.background = { color: bg };
  if (image) {
    s.addImage({ path: image, x: 0, y: 0, w: W, h: H, sizing: { type: 'cover', w: W, h: H } });
    s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.bg, transparency: 100 - scrim } });
  }
  return s;
}

function txt(s, text, x, y, w, h, o = {}) {
  s.addText(text, {
    x, y, w, h, isTextBox: true, margin: 0,
    fontFace: o.mono ? F.mono : (o.headFont ? F.head : F.body),
    fontSize: o.size ?? 14,
    bold: o.bold ?? false,
    italic: o.italic ?? false,
    color: o.color ?? C.text,
    align: o.align ?? 'left',
    valign: o.valign ?? 'top',
    charSpacing: o.spacing,
    lineSpacingMultiple: o.lh ?? 1.2,
  });
}

/** Amber kicker + big title, the standard slide header. */
function header(s, kicker, title, { titleSize = 32, lines = 1, color = C.text } = {}) {
  txt(s, kicker.toUpperCase(), M, 0.42, W - M * 2, 0.3, {
    size: 11.5, bold: true, color: C.accent, spacing: 1.8, valign: 'middle',
  });
  txt(s, title, M, 0.78, W - M * 2, lines > 1 ? 1.25 : 0.8, {
    size: titleSize, bold: true, headFont: true, color, valign: 'middle', lh: 1.1,
  });
}

function card(s, x, y, w, h, { fill = C.panel, line = C.border, r = 0.1 } = {}) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: r,
    fill: { color: fill },
    line: line ? { color: line, width: 1 } : { type: 'none' },
  });
}

/**
 * The recurring motif: an in-game HUD chip. Small caps label above a big
 * mono value, in a rounded dark panel — exactly what the player sees.
 */
function hudChip(s, x, y, w, label, value, { color = C.text, h = 0.92 } = {}) {
  card(s, x, y, w, h, { fill: C.panel2 });
  txt(s, label.toUpperCase(), x + 0.22, y + 0.16, w - 0.44, 0.22, {
    size: 8, bold: true, color: C.faint, spacing: 1.1,
  });
  txt(s, value, x + 0.22, y + 0.38, w - 0.44, 0.42, {
    size: 20, bold: true, mono: true, color, valign: 'middle',
  });
}

function chip(s, x, y, label, { fill = C.panel2, color = C.dim, size = 10.5 } = {}) {
  // Width from an average ~0.5em glyph advance, converted points -> inches.
  const w = label.length * size * (0.5 / 72) + 0.3;
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h: 0.28, rectRadius: 0.5, fill: { color: fill }, line: { type: 'none' },
  });
  txt(s, label, x, y, w, 0.28, { size, bold: true, color, align: 'center', valign: 'middle' });
  return w;
}

function bullets(s, items, x, y, w, h, { size = 13.5, color = C.text, gap = 9 } = {}) {
  s.addText(
    items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i !== items.length - 1 } })),
    {
      x, y, w, h, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: size, color, valign: 'top', paraSpaceAfter: gap,
    },
  );
}

/** Numbered amber disc, used for steps and hazard numbering. */
function disc(s, n, x, y, d = 0.44, { fill = C.accent, color = C.ink, size = 13 } = {}) {
  s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { type: 'none' } });
  txt(s, String(n), x, y, d, d, { size, bold: true, headFont: true, color, align: 'center', valign: 'middle' });
}

/** Thin amber rule used sparingly under hero text only. */
function rule(s, x, y, w = 1.4) {
  s.addShape(pres.ShapeType.rect, { x, y, w, h: 0.035, fill: { color: C.accent }, line: { type: 'none' } });
}

const notes = (s, t) => s.addNotes(t);

/* ================================================================== *
 * 1 — Title  [0:00 → 0:30]
 * ================================================================== */
{
  const s = slide({ image: SHOT('env01_wide'), scrim: 72 });
  txt(s, 'BEAT THE HAZARD', M, 2.1, W - M * 2, 1.15, {
    size: 58, bold: true, headFont: true, color: C.accent, valign: 'middle',
  });
  txt(s, 'A 3D interactive health & safety training game for\nwarehouse forklift and pedestrian safety',
    M, 3.35, 8.6, 1.0, { size: 19, color: C.white, lh: 1.3 });
  rule(s, M, 4.62);
  txt(s, 'Himalaya Logistics Distribution Centre  ·  Birgunj, Nepal', M, 4.85, 8, 0.35,
    { size: 13.5, color: C.dim, valign: 'middle' });

  hudChip(s, M, 5.5, 1.9, 'Hazards', '15');
  hudChip(s, M + 2.05, 5.5, 1.9, 'Sites', '3');
  hudChip(s, M + 4.1, 5.5, 1.9, 'Tests', '266', { color: C.success });
  hudChip(s, M + 6.15, 5.5, 1.9, 'Frame rate', '60', { color: C.success });

  txt(s, 'Kushal Neupane', M, 6.75, 6, 0.32, { size: 12.5, bold: true, color: C.white });
  notes(s, '[0:00 – 0:30] Open on the screenshot: "this is the actual game, running." ' +
    'One-line pitch: we put the trainee INSIDE the warehouse instead of showing them slides about it. ' +
    'Do not linger — the four numbers do the work. Move on within 30 seconds.');
}

/* ================================================================== *
 * 2 — The problem  [0:30 → 2:00]
 * ================================================================== */
{
  const s = slide();
  header(s, 'The problem', 'Safety training tests recall.\nThe job needs noticing.', { titleSize: 30, lines: 2 });

  const items = [
    ['Slides, then a quiz', 'Most warehouse e-learning is a slideshow and a multiple-choice test. It checks whether you can repeat a rule.'],
    ['The real skill is visual', 'On the floor nobody labels the hazard. You have to notice one upright is not vertical, or a carton overhangs a beam.'],
    ['That gap is where people get hurt', 'Forklift and pedestrian incidents are among the most serious in warehousing — and they are spotted, or missed, by eye.'],
  ];
  const cw = (W - M * 2 - 0.5) / 3;
  items.forEach((it, i) => {
    const x = M + i * (cw + 0.25);
    card(s, x, 2.4, cw, 2.55);
    disc(s, i + 1, x + 0.32, 2.72);
    txt(s, it[0], x + 0.32, 3.32, cw - 0.64, 0.5, { size: 15, bold: true, headFont: true, lh: 1.15 });
    txt(s, it[1], x + 0.32, 3.9, cw - 0.64, 1.0, { size: 12, color: C.dim, lh: 1.35 });
  });

  card(s, M, 5.35, W - M * 2, 0.95, { fill: C.panel2, line: null });
  txt(s, 'A trainee can score full marks on the quiz and still walk past a blocked fire exit.',
    M + 0.4, 5.35, W - M * 2 - 0.8, 0.95, { size: 17, italic: true, color: C.accent, valign: 'middle' });

  notes(s, '[0:30 – 2:00] 90 seconds, no more. The amber line at the bottom is the one that lands — ' +
    'read it out. Then ask the room: how would you test whether someone would NOTICE a hazard? ' +
    'That question sets up the next two slides.');
}

/* ================================================================== *
 * 3 — What we built  [2:00 → 3:00]
 * ================================================================== */
{
  const s = slide();
  s.addImage({ path: SHOT('env01_walkway'), x: W / 2 + 0.15, y: 0, w: W / 2 - 0.15, h: H,
    sizing: { type: 'cover', w: W / 2 - 0.15, h: H } });

  header(s, 'What we built', 'Put them in the building');
  txt(s, 'A browser-based 3D warehouse the trainee walks around in first person.',
    M, 1.75, 5.5, 0.5, { size: 15, color: C.text });

  bullets(s, [
    'Every hazard is real geometry, at real scale',
    'Inspect it from any angle, at your own eye level',
    'Train Mode teaches it; Test Mode measures whether it stuck',
    'Runs in any modern browser — no install, no headset',
    'Works completely offline',
  ], M, 2.5, 5.4, 2.4);

  card(s, M, 5.2, 5.4, 1.45, { fill: C.accent, line: null });
  txt(s, 'Recognising a hazard is a spatial skill.\nSo we made the training spatial.',
    M + 0.35, 5.2, 4.7, 1.45, { size: 15.5, bold: true, color: C.ink, valign: 'middle', lh: 1.25 });

  notes(s, '[2:00 – 3:00] The pitch slide. Emphasise "no install, no headset" — it runs on the laptops ' +
    'they already have, and offline, which matters on a warehouse floor with bad wifi. ' +
    'Point at the image while you say it.');
}

/* ================================================================== *
 * 4 — The core rule  [3:00 → 5:00]
 * ================================================================== */
{
  const s = slide();
  header(s, 'The rule everything is built on', 'A hazard is never an icon');

  card(s, M, 1.78, 4.5, 2.0, { fill: '2A1418', line: '5E2530' });
  disc(s, '✕', M + 0.28, 2.0, 0.4, { fill: C.danger, color: C.white, size: 14 });
  txt(s, 'What most tools do', M + 0.82, 2.0, 3.4, 0.4, { size: 14.5, bold: true, headFont: true, color: C.major, valign: 'middle' });
  txt(s, 'A red marker floating over a photo, labelled "FALLING BOXES". The answer is given away — the trainee only has to click it.',
    M + 0.28, 2.6, 3.95, 1.0, { size: 12, color: C.dim, lh: 1.35 });

  card(s, M + 4.75, 1.78, 4.5, 2.0, { fill: '10281A', line: '235E38' });
  disc(s, '✓', M + 5.03, 2.0, 0.4, { fill: C.success, color: C.white, size: 14 });
  txt(s, 'What we do', M + 5.57, 2.0, 3.4, 0.4, { size: 14.5, bold: true, headFont: true, color: C.success, valign: 'middle' });
  txt(s, 'A rack bay where most cartons sit square — one is displaced, one is tilted, one overhangs the beam and falls. You judge it by looking.',
    M + 5.03, 2.6, 3.95, 1.0, { size: 12, color: C.dim, lh: 1.35 });

  s.addImage({ path: SHOT('hz_falling2'), x: M, y: 4.0, w: 9.25, h: 2.65,
    sizing: { type: 'cover', w: 9.25, h: 2.65 } });
  txt(s, 'Real screenshot — the unstable pallet sits among correctly stacked ones. No label, no marker.',
    M, 6.75, 9.25, 0.3, { size: 11, italic: true, color: C.faint });

  card(s, 10.35, 1.78, 2.3, 4.87, { fill: C.accent, line: null });
  txt(s, 'Why it matters', 10.6, 2.02, 1.85, 0.4, { size: 13.5, bold: true, headFont: true, color: C.ink, valign: 'middle' });
  txt(s, 'If the hazard is a marker, you are training people to spot markers.\n\nIf the hazard is the warehouse itself, you are training people to spot hazards.',
    10.6, 2.55, 1.85, 3.9, { size: 12.5, color: C.ink, lh: 1.3 });

  notes(s, '[3:00 – 5:00] THE most important slide — give it two full minutes. ' +
    'Do not just describe it: point at the screenshot and ask the room to find the bad pallet themselves. ' +
    'That few seconds of searching IS the product. Then read the amber column on the right.');
}

/* ================================================================== *
 * 5 — The 15 hazards  [5:00 → 6:00]
 * ================================================================== */
{
  const s = slide();
  header(s, 'Coverage', '15 hazard scenarios, every one physically modelled', { titleSize: 27 });

  const hz = [
    ['Forklift on a walkway', 1], ['Reversing blind spot', 1], ['Falling boxes', 1],
    ['Damaged racking', 1], ['Unmarked spill', 0], ['Blocked walkway', 0],
    ['Blocked fire exit', 1], ['Blocked extinguisher', 0], ['Worker without PPE', 0],
    ['Open dock edge', 1], ['Trailing cable', 0], ['Broken pallet', 0],
    ['Over-height stack', 0], ['Unsafe ladder', 1], ['Blind corner', 1],
  ];
  const cols = 5;
  const cw = (W - M * 2 - (cols - 1) * 0.22) / cols;
  const ch = 1.12;
  hz.forEach(([name, major], i) => {
    const x = M + (i % cols) * (cw + 0.22);
    const y = 1.85 + Math.floor(i / cols) * (ch + 0.22);
    card(s, x, y, cw, ch, { fill: major ? '241318' : C.panel, line: major ? '4A2028' : C.border });
    disc(s, i + 1, x + 0.16, y + 0.16, 0.32, {
      fill: major ? C.danger : C.accent, color: major ? C.white : C.ink, size: 10.5,
    });
    txt(s, major ? 'MAJOR' : 'MINOR', x + cw - 0.92, y + 0.18, 0.76, 0.26,
      { size: 7.5, bold: true, color: major ? C.major : C.accent2, align: 'right', valign: 'middle' });
    txt(s, name, x + 0.16, y + 0.58, cw - 0.32, 0.45, { size: 11.5, bold: true, lh: 1.15 });
  });

  txt(s, '8 major  ·  7 minor       Each carries a description, why it is dangerous, the correct control, and its teaching text.',
    M, 6.25, W - M * 2, 0.4, { size: 12.5, color: C.dim, valign: 'middle' });

  notes(s, '[5:00 – 6:00] Do NOT read fifteen names aloud. Say: "these are the fifteen the brief asked ' +
    'for, and every one is geometry you can walk up to." Then pick two — falling boxes and blind corner — ' +
    'and describe how each is staged. Red are major: worth three times a minor one.');
}

/* ================================================================== *
 * 6 — Decoys  [6:00 → 7:30]
 * ================================================================== */
{
  const s = slide();
  header(s, 'What makes it teach', 'We also build the things that look wrong\nbut are actually right',
    { titleSize: 26, lines: 2 });

  txt(s, 'Real hazard spotting is discrimination, not detection. A trainee who flags everything has learned nothing — so the warehouse is seeded with correctly-controlled lookalikes. Flagging one is scored wrong, and the game explains why it is fine.',
    M, 2.25, 7.2, 1.0, { size: 13.5, color: C.dim, lh: 1.35 });

  txt(s, 'HAZARD', M, 3.4, 3.3, 0.3, { size: 9.5, bold: true, color: C.major, spacing: 1.4, valign: 'middle' });
  txt(s, 'CORRECTLY CONTROLLED  —  a wrong answer', M + 3.75, 3.4, 4.6, 0.3,
    { size: 9.5, bold: true, color: C.success, spacing: 1.4, valign: 'middle' });

  const pairs = [
    ['Unmarked spill on the floor', 'A spill that IS coned and signed'],
    ['Rack upright bent by an impact', 'A rack with a green inspection tag'],
    ['Open dock door, no barrier', 'A dock sealed by a parked trailer'],
    ['Forklift in the pedestrian lane', 'A truck parked in its charging bay'],
  ];
  pairs.forEach(([bad, good], i) => {
    const y = 3.78 + i * 0.66;
    card(s, M, y, 3.3, 0.55, { fill: '241318', line: null, r: 0.06 });
    txt(s, bad, M + 0.18, y, 2.95, 0.55, { size: 11, valign: 'middle' });
    txt(s, '→', M + 3.35, y, 0.32, 0.55, { size: 12, color: C.faint, align: 'center', valign: 'middle' });
    card(s, M + 3.75, y, 4.6, 0.55, { fill: '10281A', line: null, r: 0.06 });
    txt(s, good, M + 3.93, y, 4.25, 0.55, { size: 11, valign: 'middle' });
  });

  card(s, 9.55, 2.25, 3.1, 4.4, { fill: C.panel2 });
  txt(s, '“', 9.8, 2.28, 1, 0.7, { size: 42, bold: true, headFont: true, color: C.accent });
  txt(s, 'This spill is already being managed — it is signed and coned off, which is exactly the correct control. The hazard is an UNMARKED spill.',
    9.8, 2.95, 2.6, 2.2, { size: 12.5, color: C.text, lh: 1.3 });
  txt(s, 'Actual feedback when a trainee flags a decoy', 9.8, 5.75, 2.6, 0.7,
    { size: 10.5, italic: true, color: C.faint, lh: 1.25 });

  notes(s, '[6:00 – 7:30] This is the slide that separates us from a click-the-hotspot trainer. ' +
    'The line to use: "we teach them what GOOD looks like, not just what bad looks like." ' +
    'Mention decoy count scales with difficulty: 0 on Simple, 12 on Hard.');
}

/* ================================================================== *
 * 7 — Train → Test  [7:30 → 8:30]
 * ================================================================== */
{
  const s = slide();
  header(s, 'How a session runs', 'Learn it, then prove it');

  const half = (W - M * 2 - 0.4) / 2;

  card(s, M, 1.8, half, 3.9);
  disc(s, '1', M + 0.35, 2.08, 0.48, { size: 14 });
  txt(s, 'TRAIN MODE', M + 0.98, 2.08, 3.5, 0.48, { size: 16.5, bold: true, headFont: true, valign: 'middle' });
  txt(s, 'Teaches. Optional — never a gate.', M + 0.35, 2.68, half - 0.7, 0.3,
    { size: 12.5, italic: true, color: C.dim });
  bullets(s, [
    'No clock at all — the trainee sets the pace',
    'A guide arrow and distance point to the nearest hazard',
    'Its location is named: “Aisle B, south end — at eye level”',
    'A column of light marks the spot, visible through racking',
    'Each find opens a card: what it is, why, and the control',
  ], M + 0.35, 3.12, half - 0.7, 2.4, { size: 12.5 });

  const x2 = M + half + 0.4;
  card(s, x2, 1.8, half, 3.9, { fill: C.accent, line: null });
  disc(s, '2', x2 + 0.35, 2.08, 0.48, { fill: C.ink, color: C.accent, size: 14 });
  txt(s, 'TEST MODE', x2 + 0.98, 2.08, 3.5, 0.48, { size: 16.5, bold: true, headFont: true, color: C.ink, valign: 'middle' });
  txt(s, 'Evaluates. Open from the start.', x2 + 0.35, 2.68, half - 0.7, 0.3, { size: 12.5, italic: true, color: '5A4A12' });
  bullets(s, [
    'Five minutes on the clock, whatever the difficulty',
    'No guide and no locations — you find them by looking',
    'Wrong flags break your combo and return a safety tip',
    'Decoys punish spraying flags at everything',
    'Full breakdown with personalised coaching',
  ], x2 + 0.35, 3.12, half - 0.7, 2.4, { size: 12.5, color: C.ink });

  const flow = ['Observe', 'Find', 'Flag', 'Validate', 'Result'];
  const fw = 1.94;
  flow.forEach((t, i) => {
    const x = M + i * (fw + 0.44);
    card(s, x, 6.0, fw, 0.62, { fill: i === 4 ? C.success : C.panel2, line: null, r: 0.08 });
    txt(s, t, x, 6.0, fw, 0.62, { size: 13, bold: true, color: i === 4 ? C.ink : C.text, align: 'center', valign: 'middle' });
    if (i < 4) txt(s, '→', x + fw, 6.0, 0.44, 0.62, { size: 15, color: C.faint, align: 'center', valign: 'middle' });
  });

  notes(s, '[7:30 – 8:30] Train Mode has no clock: an arrow, a distance and a named location lead the trainee ' +
    'to the nearest hazard, and a column of light marks the spot. It is optional — an experienced operative ' +
    'can go straight to Test Mode, which is five minutes with no guide and no locations. ' +
    'The strip along the bottom is the Test Mode loop.');
}

/* ================================================================== *
 * 8 — Difficulty  [8:30 → 9:30]
 * ================================================================== */
{
  const s = slide({ image: SHOT('env03_highbay'), scrim: 80 });
  header(s, 'Difficulty', 'Three difficulties that change the game,\nnot the label',
    { titleSize: 26, lines: 2, color: C.white });

  const rows = [
    ['', 'SIMPLE', 'MID', 'HARD'],
    ['Test length', '5:00', '5:00', '5:00'],
    ['Fast bonus if found within', '45 s', '30 s', '19 s'],
    ['Score multiplier', '×1.0', '×1.25', '×1.6'],
    ['Hazards highlighted', 'Yes', 'No', 'No'],
    ['Hazard count shown', 'Yes', 'Yes', 'No'],
    ['Decoys to reject', '0', '6', '12'],
    ['Moving hazards', 'No', 'Yes', 'Yes'],
    ['Ambient light', '0.85', '0.60', '0.40'],
    ['Aim tolerance', '1.35', '1.00', '0.80'],
  ];
  s.addTable(
    rows.map((r, ri) => r.map((cell, ci) => ({
      text: cell,
      options: {
        fontFace: ri === 0 ? F.head : F.body,
        fontSize: ri === 0 ? 11 : 12,
        bold: ri === 0 || ci === 0,
        color: ri === 0 ? C.ink : (ci === 3 ? C.accent : C.white),
        fill: { color: ri === 0 ? C.accent : (ri % 2 ? C.panel : C.panel2) },
        align: ci === 0 ? 'left' : 'center',
        valign: 'middle',
      },
    }))),
    { x: M, y: 2.3, w: 7.5, colW: [3.0, 1.5, 1.5, 1.5], rowH: 0.4,
      border: { type: 'solid', color: C.border, pt: 0.5 } },
  );

  card(s, 8.6, 2.3, 4.05, 3.6, { fill: C.panel2, line: C.accent });
  txt(s, 'On Hard', 8.9, 2.52, 3.4, 0.4, { size: 16, bold: true, headFont: true, color: C.accent, valign: 'middle' });
  bullets(s, [
    'The building is genuinely darker and hazier',
    'Forklifts patrol; cartons actually fall',
    'Twelve safe lookalikes to reject',
    'You are not told how many hazards exist',
    'A tighter reticle — aim has to be deliberate',
  ], 8.9, 3.05, 3.5, 2.7, { size: 12, color: C.white });

  txt(s, 'Background: the High-Bay Annexe on Hard — five levels, narrow aisles, reduced lighting. Not a filter: that is the scene.',
    M, 6.55, W - M * 2, 0.35, { size: 11, italic: true, color: C.dim, valign: 'middle' });

  notes(s, '[8:30 – 9:30] The point: difficulty is not a number we multiply the score by. ' +
    'EIGHT separate things change, including the lighting in the building. ' +
    'The background image IS Hard difficulty — that is what the trainee actually sees.');
}

/* ================================================================== *
 * 9 — Scoring  [9:30 → 10:15]
 * ================================================================== */
{
  const s = slide();
  header(s, 'Measurement', 'Scoring rewards the judgement that matters', { titleSize: 29 });

  const scoreRows = [
    ['', 'FAST', 'SLOW'],
    ['Major hazard', '+15', '+7'],
    ['Minor hazard', '+5', '+2'],
    ['Wrong flag', '0  + a safety tip', ''],
  ];
  s.addTable(
    scoreRows.map((r, ri) => r.map((cell, ci) => ({
      text: cell,
      options: {
        fontFace: ri === 0 ? F.head : F.body, fontSize: ri === 0 ? 10.5 : 14,
        bold: ri === 0 || ci === 0,
        color: ri === 0 ? C.ink : C.text,
        fill: { color: ri === 0 ? C.accent : (ri % 2 ? C.panel : C.panel2) },
        align: ci === 0 ? 'left' : 'center', valign: 'middle',
      },
    }))),
    { x: M, y: 1.85, w: 6.0, colW: [2.5, 1.75, 1.75], rowH: 0.5,
      border: { type: 'solid', color: C.border, pt: 0.5 } },
  );
  txt(s, 'A major hazard is worth three times a minor one, deliberately. A trainee who prioritises vehicles, racking and edges over housekeeping is prioritising correctly — and the score should say so.',
    M, 4.05, 6.0, 1.0, { size: 12.5, color: C.dim, lh: 1.35 });

  card(s, 7.3, 1.85, 5.35, 1.4, { fill: C.accent2, line: null });
  txt(s, 'COMBO', 7.6, 2.02, 2, 0.28, { size: 9.5, bold: true, color: C.ink, spacing: 1.4 });
  txt(s, '3 correct in a row  →  +3 on every find', 7.6, 2.32, 4.8, 0.4,
    { size: 15, bold: true, headFont: true, color: C.ink });
  txt(s, 'Broken by a wrong flag. Spraying flags becomes a losing strategy.', 7.6, 2.76, 4.8, 0.35,
    { size: 11.5, color: '5A2C05' });

  txt(s, 'RANKS', 7.3, 3.5, 3, 0.28, { size: 9.5, bold: true, color: C.faint, spacing: 1.4 });
  [['Safety Champion', '50+', C.success], ['Getting There', '30 – 49', C.accent], ['Needs Practice', 'Below 30', C.danger]]
    .forEach(([label, range, col], i) => {
      const y = 3.86 + i * 0.7;
      card(s, 7.3, y, 5.35, 0.58, { fill: C.panel2, line: null, r: 0.06 });
      s.addShape(pres.ShapeType.ellipse, { x: 7.55, y: y + 0.16, w: 0.26, h: 0.26, fill: { color: col }, line: { type: 'none' } });
      txt(s, label, 7.98, y, 3, 0.58, { size: 13.5, bold: true, valign: 'middle' });
      txt(s, range, 10.9, y, 1.5, 0.58, { size: 13.5, bold: true, mono: true, color: col, align: 'right', valign: 'middle' });
    });

  txt(s, 'Every value here lives in one configuration file — a safety officer can retune the thresholds to their own standard without touching game code.',
    M, 6.35, 11.9, 0.5, { size: 12, italic: true, color: C.dim });

  notes(s, '[9:30 – 10:15] Quick slide. The last line is the client-facing point: THEY can retune it. ' +
    'Also mention the results screen writes coaching based on how they actually played, ' +
    'e.g. "you missed 3 major hazards — those are the ones that kill".');
}

/* ================================================================== *
 * 10 — Locations  [10:15 → 11:00]
 * ================================================================== */
{
  const s = slide();
  header(s, 'Added after playtesting', 'Knowing what to look for is not enough —\nyou need to know where',
    { titleSize: 26, lines: 2 });

  txt(s, 'A 62-metre building is a lot of floor. Every hazard now reports its position using the same aisle letters and dock numbers that are stencilled on the floor in-world.',
    M, 2.3, 7.0, 0.8, { size: 13.5, color: C.dim, lh: 1.35 });

  const locs = [
    ['Aisle C, north end — high up', 'Falling boxes, on a level-3 beam'],
    ['Dock door 3', 'Person on an unguarded dock edge'],
    ['Run B, south end — at floor level', 'Unmarked spill in a dark aisle'],
    ['Outbound bay 4', 'Broken pallet still carrying a load'],
  ];
  locs.forEach(([where, what], i) => {
    const y = 3.3 + i * 0.78;
    card(s, M, y, 7.0, 0.66, { fill: C.panel2, line: null, r: 0.07 });
    txt(s, '📍  ' + where, M + 0.25, y, 3.7, 0.66, { size: 12.5, bold: true, color: C.accent, valign: 'middle' });
    txt(s, what, M + 3.95, y, 2.85, 0.66, { size: 11.5, color: C.dim, valign: 'middle' });
  });

  card(s, 8.15, 2.3, 4.5, 4.1, { fill: C.panel });
  txt(s, 'Where it shows up', 8.45, 2.55, 3.9, 0.4, { size: 15, bold: true, headFont: true, valign: 'middle' });
  bullets(s, [
    'The Train Mode panel, naming the next hazard',
    'The feedback card when you find one',
    'Beside every hazard you missed, on the results screen',
  ], 8.45, 3.05, 3.9, 1.7, { size: 12.5 });
  card(s, 8.45, 4.85, 3.9, 1.25, { fill: C.panel2, line: C.accent, r: 0.07 });
  txt(s, 'Turn it off in Settings if you want the search to stay unaided.',
    8.7, 4.85, 3.4, 1.25, { size: 12, color: C.accent, valign: 'middle', lh: 1.3 });

  notes(s, '[10:15 – 11:00] Frame this as a playtest finding, not a feature we planned: ' +
    '"we could find the hazards because we built them — a new trainee could not." ' +
    'It shows the process, which is what a tutor wants to hear.');
}

/* ================================================================== *
 * 11 — Environments  [11:00 → 12:00]
 * ================================================================== */
{
  const s = slide();
  header(s, 'Content', 'Three warehouses, three risk profiles', { titleSize: 29 });

  const envs = [
    { n: '01', tag: 'GENERAL STORAGE', name: 'Main Storage Hall', img: SHOT('env01_wide'),
      d: 'Four racking runs, a central pedestrian spine, an active forklift aisle.', m: ['15 hazards', '62×44 m'] },
    { n: '02', tag: 'CROSS-DOCK', name: 'Loading & Dispatch Bay', img: SHOT('env01_walkway'),
      d: 'Six dock doors and constant vehicle movement. Dock edges and marshalling.', m: ['12 hazards', '70×30 m'] },
    { n: '03', tag: 'NARROW AISLE · LOW LIGHT', name: 'High-Bay Annexe', img: SHOT('env03_aisle'),
      d: 'Five levels, poor light, heavy congestion. The hard site.', m: ['15 hazards', '54×40 m'] },
  ];
  const cw = (W - M * 2 - 0.5) / 3;
  envs.forEach((e, i) => {
    const x = M + i * (cw + 0.25);
    card(s, x, 1.85, cw, 4.4);
    s.addImage({ path: e.img, x: x + 0.002, y: 1.85, w: cw - 0.004, h: 1.75,
      sizing: { type: 'cover', w: cw, h: 1.75 } });
    txt(s, e.n, x + 0.25, 3.7, 1, 0.4, { size: 19, bold: true, headFont: true, color: C.accent });
    txt(s, e.tag, x + 0.25, 4.08, cw - 0.5, 0.26, { size: 8.5, bold: true, color: C.accent2, spacing: 0.9 });
    txt(s, e.name, x + 0.25, 4.34, cw - 0.5, 0.4, { size: 14.5, bold: true, headFont: true });
    txt(s, e.d, x + 0.25, 4.78, cw - 0.5, 0.9, { size: 11.5, color: C.dim, lh: 1.3 });
    let cx = x + 0.25;
    for (const mm of e.m) cx += chip(s, cx, 5.72, mm) + 0.12;
  });

  txt(s, 'All three share one prop and scenario library — environments 2 and 3 are about 250 lines each, not copies of the application. A fourth site is one file plus one line.',
    M, 6.45, W - M * 2, 0.5, { size: 12.5, color: C.text });

  notes(s, '[11:00 – 12:00] The closing line is the commercial point: adding a site is cheap because ' +
    'the hazard library is shared. If they ask "could you build OUR warehouse?" — yes, and this is ' +
    'why that is not a rewrite.');
}

/* ================================================================== *
 * 12 — Login & security  [12:00 → 13:30]
 * ================================================================== */
{
  const s = slide();
  header(s, 'Access', 'Four ways in, plus a second factor', { titleSize: 30 });

  const methods = [
    ['🔐', 'Passkey', 'Fingerprint, face or device PIN — or your phone. Nothing typed.', C.accent],
    ['🔵', 'Google / Facebook', 'One free Client ID and the button goes live. No secret needed.', C.info],
    ['👤', 'Name only', 'The original zero-friction path. Still the default.', C.dim],
    ['🔢', 'Authenticator app', 'A 6-digit code as a second step. Real RFC 6238.', C.success],
  ];
  const cw = (W - M * 2 - 0.75) / 4;
  methods.forEach(([icon, name, desc, col], i) => {
    const x = M + i * (cw + 0.25);
    card(s, x, 1.85, cw, 2.15);
    txt(s, icon, x + 0.25, 2.08, 0.6, 0.45, { size: 20 });
    txt(s, name, x + 0.25, 2.6, cw - 0.5, 0.4, { size: 14.5, bold: true, headFont: true, color: col, lh: 1.1 });
    txt(s, desc, x + 0.25, 3.05, cw - 0.5, 0.85, { size: 11.5, color: C.dim, lh: 1.3 });
  });

  card(s, M, 4.25, 6.15, 2.3, { fill: C.panel2 });
  txt(s, 'Built properly, proven properly', M + 0.35, 4.5, 5.4, 0.4,
    { size: 15, bold: true, headFont: true, valign: 'middle' });
  bullets(s, [
    'TOTP checked against the official RFC 4226 and 6238 vectors',
    'QR encoder written from scratch — the offline build needs no CDN',
    'Every QR decoded back by an independent decoder, 100 random secrets',
  ], M + 0.35, 5.0, 5.4, 1.4, { size: 12, color: C.text, gap: 7 });

  card(s, 7.15, 4.25, 5.5, 2.3, { fill: C.panel2, line: C.accent2 });
  txt(s, 'And stated honestly', 7.5, 4.5, 4.9, 0.4,
    { size: 15, bold: true, headFont: true, color: C.accent2, valign: 'middle' });
  txt(s, 'The game has no backend, so passkeys and 2FA are a local device gate — not server-verified identity. GitHub cannot work in a browser at all: its exchange needs a client secret. So its button is visibly disabled and says why, rather than failing silently.',
    7.5, 5.0, 4.9, 1.45, { size: 12, color: C.dim, lh: 1.32 });

  notes(s, '[12:00 – 13:30] Two beats. First: it is real — official test vectors, QR built from scratch. ' +
    'Second, and more important for credibility: we say what it does NOT do. ' +
    'No backend means these are local gates. GitHub is disabled ON PURPOSE with the reason shown. ' +
    'A safety product that overstates its own security teaches the wrong lesson.');
}

/* ================================================================== *
 * 13 — How it is built  [13:30 → 14:15]
 * ================================================================== */
{
  const s = slide();
  header(s, 'Under the hood', 'How it is built', { titleSize: 30 });

  const stack = [
    ['Three.js', '3D rendering', 'Direct control of the scene graph and the frame loop.'],
    ['Vite', 'Build & dev server', 'Instant reload, ES-module output, almost no config.'],
    ['Vanilla JS', 'No framework', 'A canvas game owns its own loop; a virtual DOM would fight it.'],
    ['Vitest', 'Testing', 'Gameplay logic is pure, so it tests in Node with no browser.'],
    ['Custom', 'Collision', '~60 lines. A physics engine is 500 kB for a flat floor.'],
    ['Procedural', 'All art & audio', 'Every mesh, texture and sound generated in code.'],
  ];
  const cw = (W - M * 2 - 0.5) / 3;
  stack.forEach(([name, role, why], i) => {
    const x = M + (i % 3) * (cw + 0.25);
    const y = 1.9 + Math.floor(i / 3) * 1.75;
    card(s, x, y, cw, 1.55);
    txt(s, name, x + 0.28, y + 0.22, cw - 0.56, 0.35, { size: 15, bold: true, headFont: true, color: C.accent });
    txt(s, role.toUpperCase(), x + 0.28, y + 0.58, cw - 0.56, 0.24, { size: 8.5, bold: true, color: C.faint, spacing: 0.9 });
    txt(s, why, x + 0.28, y + 0.85, cw - 0.56, 0.6, { size: 11.5, color: C.dim, lh: 1.3 });
  });

  card(s, M, 5.45, W - M * 2, 1.15, { fill: C.panel2, line: null });
  txt(s, 'Zero third-party assets. No downloaded models, stock textures, sound files or web fonts — which means no licences to track and nothing to attribute. It also keeps the whole game to one 828 kB file.',
    M + 0.4, 5.45, W - M * 2 - 0.8, 1.15, { size: 13, color: C.text, valign: 'middle', lh: 1.35 });

  notes(s, '[13:30 – 14:15] Keep it brisk — this is credibility, not the story. ' +
    'The line that matters is the box at the bottom: everything is generated in code, ' +
    'so there is no licensing overhead and the whole game fits in one file.');
}

/* ================================================================== *
 * 14 — Performance  [14:15 → 15:15]
 * ================================================================== */
{
  const s = slide();
  header(s, 'Engineering highlight', 'A believable warehouse needs thousands of boxes', { titleSize: 28 });

  txt(s, 'Drawn naively, Environment 1 was 9,587 draw calls per frame. Unusable on any machine.',
    M, 1.85, 8.5, 0.4, { size: 14, color: C.dim });

  card(s, M, 2.5, 5.4, 2.0, { fill: '241318', line: '4A2028' });
  txt(s, 'BEFORE', M + 0.35, 2.72, 2, 0.28, { size: 9.5, bold: true, color: C.major, spacing: 1.4 });
  txt(s, '9,587', M + 0.35, 3.02, 4.7, 0.85, { size: 46, bold: true, mono: true, color: C.major });
  txt(s, 'individual meshes, one draw call each', M + 0.35, 3.92, 4.7, 0.35, { size: 12, color: C.dim });

  txt(s, '→', 6.32, 2.5, 0.9, 2.0, { size: 34, color: C.accent, align: 'center', valign: 'middle' });

  card(s, 7.25, 2.5, 5.4, 2.0, { fill: '10281A', line: '235E38' });
  txt(s, 'AFTER', 7.6, 2.72, 2, 0.28, { size: 9.5, bold: true, color: C.success, spacing: 1.4 });
  txt(s, '994', 7.6, 3.02, 4.7, 0.85, { size: 46, bold: true, mono: true, color: C.success });
  txt(s, 'objects in 74 merged batches — same picture', 7.6, 3.92, 4.7, 0.35, { size: 12, color: C.dim });

  card(s, M, 4.75, W - M * 2, 1.05, { fill: C.panel2, line: null });
  txt(s, 'Static geometry is merged by material at load. Anything animated — forklifts, workers, the falling carton — is excluded so it still moves.',
    M + 0.4, 4.75, W - M * 2 - 0.8, 1.05, { size: 13, color: C.text, valign: 'middle', lh: 1.35 });

  hudChip(s, M, 6.05, 2.6, 'Frame rate', '60 fps', { color: C.success });
  hudChip(s, M + 2.75, 6.05, 2.6, 'Draw calls', '1,520');
  hudChip(s, M + 5.5, 6.05, 2.6, 'Triangles', '272k');
  hudChip(s, M + 8.25, 6.05, 2.6, 'Bundle (gzip)', '183 kB');

  notes(s, '[14:15 – 15:15] For a technical audience this is the strongest story in the deck: ' +
    'a real problem, measured, and solved with a specific named technique. ' +
    'Say the number out loud — nine and a half thousand down to under a thousand.');
}

/* ================================================================== *
 * 15 — Testing  [15:15 → 16:15]
 * ================================================================== */
{
  const s = slide();
  header(s, 'Quality', 'Proven, not assumed', { titleSize: 30 });

  hudChip(s, M, 1.85, 2.85, 'Automated tests', '266', { color: C.success, h: 1.05 });
  hudChip(s, M + 3.0, 1.85, 2.85, 'Passing', '100%', { color: C.success, h: 1.05 });
  hudChip(s, M + 6.0, 1.85, 2.85, 'Hazards reachable', '42/42', { color: C.success, h: 1.05 });
  hudChip(s, M + 9.0, 1.85, 2.9, 'Console errors', '0', { color: C.success, h: 1.05 });

  card(s, M, 3.15, 6.0, 3.2);
  txt(s, 'What the tests lock down', M + 0.35, 3.4, 5.3, 0.4, { size: 15, bold: true, headFont: true });
  bullets(s, [
    'Scoring, combo, ranks — the exact rules from the brief',
    'The reaction clock, including its warning bands',
    'All 15 hazards present, with complete teaching text',
    'Difficulty genuinely differs — not just a label',
    'Profile progression, gates and every achievement',
    'TOTP against the official RFC test vectors',
  ], M + 0.35, 3.9, 5.3, 2.3, { size: 12.5, gap: 7 });

  card(s, 7.15, 3.15, 5.5, 3.2, { fill: C.panel2 });
  txt(s, 'And a robot that plays the game', 7.5, 3.4, 4.9, 0.4, { size: 15, bold: true, headFont: true, color: C.accent });
  txt(s, 'A harness walks the player to 24 vantage points around every hazard, aims the camera and tries a real flag. It reports anything unreachable.',
    7.5, 3.9, 4.9, 0.9, { size: 12, color: C.dim, lh: 1.32 });
  [['Main Storage Hall — Mid', '15 / 15'], ['Loading & Dispatch — Mid', '12 / 12'], ['High-Bay Annexe — Hard', '15 / 15']]
    .forEach(([label, val], i) => {
      const y = 4.95 + i * 0.44;
      txt(s, label, 7.5, y, 3.6, 0.4, { size: 12, valign: 'middle' });
      txt(s, val, 11.1, y, 1.3, 0.4, { size: 12, bold: true, mono: true, color: C.success, align: 'right', valign: 'middle' });
    });

  notes(s, '[15:15 – 16:15] The right-hand box is the one to dwell on: we did not just unit-test the ' +
    'maths, we wrote something that plays the game and proves every hazard can actually be found. ' +
    'That is what caught the biggest bug — next slide.');
}

/* ================================================================== *
 * 16 — What went wrong  [16:15 → 17:15]
 * ================================================================== */
{
  const s = slide();
  header(s, 'What we tried, and what broke', 'The bugs are the interesting part', { titleSize: 29 });

  txt(s, 'Every one of these looked fine on screen. They were only found by driving the real game — unit tests could not have caught any of them.',
    M, 1.85, 9.5, 0.4, { size: 13, color: C.dim });

  const bugs = [
    ['Hazards could not be clicked', 'Proxies never had their world matrix updated, so for raycasting they all sat at the origin. 14 of 15 unflaggable — and the 15th was a false positive.'],
    ['A wall in every warehouse', 'The spawn angle faced a blank wall, with the whole building behind the player.'],
    ['Invisible interface', 'The DOM helper did not parse "#id", so the HUD had no CSS applied at all.'],
    ['The timer blamed the wrong hazard', 'On expiry it penalised an arbitrary hazard the player was nowhere near.'],
    ['Settings that did nothing', '"Invert look" and "Reduce motion" were saved but never applied.'],
    ['A QR nothing could scan', 'Format bits were written transposed. The matrix looked perfect; no scanner could read it.'],
  ];
  const cw = (W - M * 2 - 0.45) / 2;
  bugs.forEach(([title, body], i) => {
    const x = M + (i % 2) * (cw + 0.45);
    const y = 2.42 + Math.floor(i / 2) * 1.38;
    card(s, x, y, cw, 1.2, { fill: C.panel2, line: null });
    s.addShape(pres.ShapeType.rect, { x, y, w: 0.055, h: 1.2, fill: { color: C.danger }, line: { type: 'none' } });
    txt(s, title, x + 0.3, y + 0.16, cw - 0.6, 0.32, { size: 13, bold: true, headFont: true, color: C.text });
    txt(s, body, x + 0.3, y + 0.5, cw - 0.6, 0.66, { size: 10.5, color: C.dim, lh: 1.28 });
  });

  card(s, M, 6.5, W - M * 2, 0.5, { fill: C.accent, line: null });
  txt(s, 'All nine found and fixed. This is why we tested by playing it, not by reading it.',
    M + 0.4, 6.5, W - M * 2 - 0.8, 0.5, { size: 13, bold: true, color: C.ink, valign: 'middle' });

  notes(s, '[16:15 – 17:15] Do not rush past this and do not apologise for it — a tutor or client ' +
    'rates a team that finds its own bugs far above one that claims it had none. ' +
    'The strongest example is the first: fourteen of fifteen hazards were unclickable and it LOOKED fine.');
}

/* ================================================================== *
 * 17 — Limitations  [17:15 → 18:00]
 * ================================================================== */
{
  const s = slide();
  header(s, 'Being straight with you', 'What it does not do yet', { titleSize: 30 });

  const lims = [
    ['Not photorealistic', 'Stylised procedural geometry, built for believable scale and hazard readability — not a rendered CAD walkthrough.'],
    ['No VR', 'No headset was available to test on. Shipping untested VR and calling it done would be dishonest.'],
    ['Social login unconfigured', 'Google and Facebook work the moment you add a free Client ID. GitHub needs a small server, and says so.'],
    ['Limited device testing', 'Touch controls are built and the layout is responsive, but untested on a real phone. Chromium only so far.'],
  ];
  const cw = (W - M * 2 - 0.45) / 2;
  lims.forEach(([t, d], i) => {
    const x = M + (i % 2) * (cw + 0.45);
    const y = 2.0 + Math.floor(i / 2) * 1.85;
    card(s, x, y, cw, 1.6);
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.3, y: y + 0.34, w: 0.3, h: 0.3, fill: { color: C.accent2 }, line: { type: 'none' } });
    txt(s, t, x + 0.75, y + 0.24, cw - 1.05, 0.42, { size: 14, bold: true, headFont: true, valign: 'middle' });
    txt(s, d, x + 0.75, y + 0.72, cw - 1.05, 0.75, { size: 11.5, color: C.dim, lh: 1.3 });
  });

  card(s, M, 5.85, W - M * 2, 0.95, { fill: C.panel2, line: C.accent });
  txt(s, 'All of this is written into the repository documentation — found by us, not discovered later by you.',
    M + 0.4, 5.85, W - M * 2 - 0.8, 0.95, { size: 13.5, bold: true, color: C.accent, valign: 'middle' });

  notes(s, '[17:15 – 18:00] Present this confidently, do not apologise through it. ' +
    'Stating limits clearly is what makes every other claim in the deck believable. ' +
    'If asked "why no VR?": we had no headset to test on, and untested VR is worse than no VR.');
}

/* ================================================================== *
 * 18 — Close & demo  [18:00 → 20:00]
 * ================================================================== */
{
  const s = slide({ image: SHOT('hz_exit2'), scrim: 78 });
  txt(s, 'Thank you', M, 1.5, 9, 1.0, { size: 44, bold: true, headFont: true, color: C.accent, valign: 'middle' });
  txt(s, 'Live demo — and then your questions.', M, 2.55, 9, 0.5,
    { size: 19, color: C.white, valign: 'middle' });
  rule(s, M, 3.25);

  card(s, M, 3.6, 6.0, 2.6, { fill: C.panel2 });
  txt(s, 'Two-minute demo route', M + 0.35, 3.85, 5.3, 0.4, { size: 15, bold: true, headFont: true, color: C.accent });
  [['1', 'Walk the Main Storage Hall'], ['2', 'Find the falling boxes'],
   ['3', 'Flag a decoy on purpose — watch it teach'], ['4', 'Show the results screen']]
    .forEach(([n, t], i) => {
      const y = 4.35 + i * 0.45;
      disc(s, n, M + 0.35, y, 0.32, { size: 10.5 });
      txt(s, t, M + 0.8, y, 4.9, 0.32, { size: 12.5, valign: 'middle' });
    });

  card(s, 7.15, 3.6, 5.5, 2.6, { fill: C.panel2 });
  txt(s, 'Play it yourself', 7.5, 3.85, 4.9, 0.4, { size: 15, bold: true, headFont: true, color: C.accent });
  txt(s, 'kushalthewave.github.io/interprize-project', 7.5, 4.35, 4.9, 0.4,
    { size: 13, bold: true, mono: true, color: C.info });
  txt(s, 'Source, documentation and tests:', 7.5, 4.9, 4.9, 0.3, { size: 11.5, color: C.dim });
  txt(s, 'github.com/kushalthewave/interprize-project', 7.5, 5.2, 4.9, 0.4,
    { size: 12, bold: true, mono: true, color: C.info });
  txt(s, 'Also ships as one 828 kB file that runs offline.', 7.5, 5.7, 4.9, 0.35,
    { size: 11.5, italic: true, color: C.faint });

  txt(s, 'BEAT THE HAZARD   ·   Kushal Neupane', M, 6.7, 9, 0.35,
    { size: 12, bold: true, color: C.dim, valign: 'middle' });

  notes(s, '[18:00 – 20:00] Two minutes. Have the game ALREADY LOADED in another window — do not ' +
    'load it in front of them. Follow the four steps on the left and resist exploring. ' +
    'Step 3 is the one that sells it: flag the coned-off spill on purpose and let the game explain ' +
    'why that is a wrong answer. Finish on the results screen and take questions.');
}

/* ------------------------------------------------------------------ */
const out = path.join(__dirname, '..', 'Beat-The-Hazard-Presentation.pptx');
pres.writeFile({ fileName: out }).then(() => console.log('written:', out));
