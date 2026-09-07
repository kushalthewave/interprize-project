/**
 * build-deck.js — generates the client / classroom presentation.
 * Run:  node ppt/build-deck.js
 */
const pptxgen = require('pptxgenjs');
const path = require('path');

const SHOT = (n) => path.join(__dirname, 'shots', 'opt', `${n}.jpg`);

/* ------------------------------------------------------------------ *
 * Palette — industrial safety: charcoal ground, hi-vis amber accent
 * ------------------------------------------------------------------ */
const C = {
  ink: '14181C',        // deepest ground
  charcoal: '1E2227',   // dark slide ground
  slate: '2C333A',      // card on dark
  amber: 'F2B90C',      // primary accent (hi-vis)
  orange: 'E07B12',     // secondary accent
  green: '1F8A4C',      // safe / correct
  red: 'C0182A',        // hazard / major
  paper: 'FFFFFF',      // light slide ground
  mist: 'F1F3F5',       // light card
  body: '3C444C',       // body text on light
  muted: '6B747D',      // muted text on light
  dimText: 'A8B2BB',    // muted text on dark
};

const F = { head: 'Arial', body: 'Calibri' };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in — set BEFORE adding slides
pres.author = 'Kushal Neupane';
pres.company = 'Beat The Hazard';
pres.title = 'Beat The Hazard';

const W = 13.333;
const H = 7.5;
const M = 0.7; // page margin

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Dark slide with optional full-bleed photo + scrim. */
function darkSlide({ image = null, scrim = 62 } = {}) {
  const s = pres.addSlide();
  s.background = { color: C.charcoal };
  if (image) {
    s.addImage({ path: image, x: 0, y: 0, w: W, h: H, sizing: { type: 'cover', w: W, h: H } });
    s.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: W, h: H, fill: { color: C.ink, transparency: 100 - scrim },
    });
  }
  return s;
}

function lightSlide() {
  const s = pres.addSlide();
  s.background = { color: C.paper };
  return s;
}

/** Section title in the top-left. */
function title(slide, text, { color = C.ink, y = 0.78, size = 34, w = W - M * 2, h = 0.8 } = {}) {
  slide.addText(text, {
    x: M, y, w, h,
    isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: size, bold: true, color,
    align: 'left', valign: 'middle',
  });
}

function kicker(slide, text, { color = C.amber, y = 0.42 } = {}) {
  slide.addText(text.toUpperCase(), {
    x: M, y, w: W - M * 2, h: 0.3,
    isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 12, bold: true, color, charSpacing: 2,
    align: 'left', valign: 'middle',
  });
}

/** Amber circle with a number or short glyph. */
function badge(slide, txt, x, y, d = 0.46, { fill = C.amber, color = C.ink, size = 14 } = {}) {
  slide.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill } });
  slide.addText(String(txt), {
    x, y, w: d, h: d, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: size, bold: true, color,
    align: 'center', valign: 'middle',
  });
}

/** Big number + label callout. */
function stat(slide, value, label, x, y, w, { color = C.amber, vSize = 40, sub = null } = {}) {
  slide.addText(value, {
    x, y, w, h: 0.75, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: vSize, bold: true, color, align: 'left', valign: 'bottom',
  });
  slide.addText(label, {
    x, y: y + 0.75, w, h: 0.32, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 12, bold: true, color: C.muted, align: 'left', valign: 'top',
  });
  if (sub) {
    slide.addText(sub, {
      x, y: y + 1.05, w, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 10, color: C.muted, italic: true, align: 'left', valign: 'top',
    });
  }
}

function card(slide, x, y, w, h, { fill = C.mist, line = null, shadow = true } = {}) {
  const opts = {
    x, y, w, h, fill: { color: fill }, rectRadius: 0.08,
  };
  if (line) opts.line = { color: line, width: 1 };
  if (shadow) opts.shadow = { type: 'outer', angle: 90, blur: 8, offset: 0.04, color: '000000', opacity: 0.10 };
  slide.addShape(pres.ShapeType.roundRect, opts);
}

function body(slide, text, x, y, w, h, { size = 14, color = C.body, align = 'left', bold = false, italic = false, lineSpacingMultiple = 1.2 } = {}) {
  slide.addText(text, {
    x, y, w, h, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: size, color, align, bold, italic,
    valign: 'top', lineSpacingMultiple,
  });
}

function bullets(slide, items, x, y, w, h, { size = 14, color = C.body, space = 8 } = {}) {
  slide.addText(
    items.map((t, i) => ({
      text: t,
      options: { bullet: true, breakLine: i !== items.length - 1 },
    })),
    {
      x, y, w, h, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: size, color, valign: 'top', paraSpaceAfter: space,
    },
  );
}

/* ================================================================== *
 * 1 — Title
 * ================================================================== */
{
  const s = darkSlide({ image: SHOT('env01_wide'), scrim: 70 });
  s.addText('BEAT THE HAZARD', {
    x: M, y: 2.25, w: W - M * 2, h: 1.25, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 60, bold: true, color: C.amber, align: 'left', valign: 'middle',
  });
  s.addText('A 3D interactive health & safety training game for\nwarehouse forklift and pedestrian safety', {
    x: M, y: 3.6, w: 8.6, h: 1.0, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 20, color: 'FFFFFF', align: 'left', valign: 'top', lineSpacingMultiple: 1.25,
  });
  s.addShape(pres.ShapeType.rect, { x: M, y: 4.95, w: 1.5, h: 0.035, fill: { color: C.amber } });
  s.addText('Himalaya Logistics Distribution Centre  ·  Birgunj, Nepal', {
    x: M, y: 5.2, w: 8, h: 0.35, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 14, color: C.dimText, align: 'left', valign: 'middle',
  });
  s.addText('Kushal Neupane', {
    x: M, y: 6.5, w: 6, h: 0.35, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 13, bold: true, color: 'FFFFFF', align: 'left', valign: 'middle',
  });
  s.addNotes(
    'Open by telling them what they are looking at: this is a real screenshot from the game, not a mock-up. ' +
    'One line pitch: "We put the trainee inside the warehouse, instead of showing them slides about it." ' +
    'Then move quickly to the problem.',
  );
}

/* ================================================================== *
 * 2 — The problem
 * ================================================================== */
{
  const s = lightSlide();
  kicker(s, 'The problem');
  title(s, 'Safety training tests recall.\nThe job needs noticing.', { size: 30, y: 0.74, h: 1.25 });

  const cards = [
    { t: 'Slides, then a quiz', d: 'Most warehouse safety e-learning is a slideshow followed by multiple choice. It checks whether you can repeat a rule.' },
    { t: 'The real skill is visual', d: 'On the floor, nobody labels the hazard. You have to notice one rack upright is not vertical, or a carton overhangs a beam.' },
    { t: 'The gap costs lives', d: 'Forklift and pedestrian incidents are among the most serious in warehousing — and they are spotted, or missed, by eye.' },
  ];
  const cw = (W - M * 2 - 0.5) / 3;
  cards.forEach((c, i) => {
    const x = M + i * (cw + 0.25);
    card(s, x, 2.35, cw, 2.5);
    badge(s, i + 1, x + 0.35, 2.7, 0.44);
    s.addText(c.t, {
      x: x + 0.35, y: 3.3, w: cw - 0.7, h: 0.4, isTextBox: true, margin: 0,
      fontFace: F.head, fontSize: 15, bold: true, color: C.ink, valign: 'top',
    });
    body(s, c.d, x + 0.35, 3.75, cw - 0.7, 1.0, { size: 12, color: C.muted });
  });

  body(s, 'A trainee can score full marks on the quiz and still walk past a blocked fire exit.',
    M, 5.35, W - M * 2, 0.5, { size: 17, color: C.ink, italic: true });
  s.addNotes(
    'Keep this short — 60 to 90 seconds. The one line that lands is the italic sentence at the bottom: ' +
    'passing the quiz and being safe on the floor are two different things. Ask the room: how would you test whether ' +
    'someone would notice a hazard? That sets up the next slide.',
  );
}

/* ================================================================== *
 * 3 — The insight / approach
 * ================================================================== */
{
  const s = lightSlide();
  s.addImage({ path: SHOT('env01_walkway'), x: W / 2, y: 0, w: W / 2, h: H, sizing: { type: 'cover', w: W / 2, h: H } });

  kicker(s, 'Our approach');
  title(s, 'Put them in the building', { size: 32, y: 0.78 });
  body(s,
    'Beat The Hazard is a browser-based 3D warehouse the trainee walks around in first person.',
    M, 1.6, 5.6, 0.8, { size: 15, color: C.body });

  const pts = [
    'Every hazard is built as real geometry, at real scale',
    'Inspect it from any angle, at your own eye level',
    'Train Mode teaches it; Test Mode measures whether it stuck',
    'Runs in any modern browser — no install, no headset',
  ];
  bullets(s, pts, M, 2.7, 5.5, 2.2, { size: 14 });

  card(s, M, 5.25, 5.5, 1.35, { fill: C.ink, shadow: false });
  s.addText('Recognising a hazard is a spatial skill.\nSo we made the training spatial.', {
    x: M + 0.35, y: 5.5, w: 4.8, h: 0.9, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 15, bold: true, color: C.amber, valign: 'middle', lineSpacingMultiple: 1.2,
  });
  s.addNotes(
    'This is the pitch slide. Emphasise "no install, no headset" — it runs on the laptops the client already has. ' +
    'The image on the right is the pedestrian walkway with workers and a forklift; point at it while you talk.',
  );
}

/* ================================================================== *
 * 4 — The core rule
 * ================================================================== */
{
  const s = lightSlide();
  kicker(s, 'The rule everything is built on');
  title(s, 'A hazard is never an icon', { size: 32, y: 0.78 });

  card(s, M, 1.75, 4.5, 2.15, { fill: 'FBEAEC', line: 'E8B4BA' });
  badge(s, '✕', M + 0.3, 2.0, 0.42, { fill: C.red, color: 'FFFFFF', size: 15 });
  s.addText('What most tools do', {
    x: M + 0.9, y: 2.02, w: 3.3, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 15, bold: true, color: C.red, valign: 'middle',
  });
  body(s, 'A red marker floating in a photo, labelled "FALLING BOXES". The answer is given away — the trainee only has to click it.',
    M + 0.3, 2.65, 3.9, 1.1, { size: 12.5, color: C.body });

  card(s, M + 4.75, 1.75, 4.5, 2.15, { fill: 'E8F5EC', line: 'A9D5B9' });
  badge(s, '✓', M + 5.05, 2.0, 0.42, { fill: C.green, color: 'FFFFFF', size: 15 });
  s.addText('What we do', {
    x: M + 5.65, y: 2.02, w: 3.3, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 15, bold: true, color: C.green, valign: 'middle',
  });
  body(s, 'A rack bay where most cartons sit square — one is displaced, one is tilted, and one overhangs the beam and falls. You judge it by looking.',
    M + 5.05, 2.65, 3.9, 1.1, { size: 12.5, color: C.body });

  s.addImage({ path: SHOT('hz_falling2'), x: M, y: 4.15, w: 9.25, h: 2.6, sizing: { type: 'cover', w: 9.25, h: 2.6 } });
  s.addText('Real screenshot — the unstable pallet sits among correctly stacked ones. No label, no marker.', {
    x: M, y: 6.85, w: 9.25, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 11, italic: true, color: C.muted, valign: 'middle',
  });

  card(s, 10.35, 1.75, 2.3, 5.0, { fill: C.ink, shadow: false });
  s.addText('Why it matters', {
    x: 10.6, y: 2.0, w: 1.85, h: 0.35, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 13, bold: true, color: C.amber, valign: 'middle',
  });
  body(s, 'If the hazard is a marker, you are training people to spot markers.\n\nIf the hazard is the warehouse itself, you are training people to spot hazards.',
    10.6, 2.5, 1.85, 3.9, { size: 12.5, color: 'FFFFFF', lineSpacingMultiple: 1.3 });
  s.addNotes(
    'This is the single most important slide in the deck — it is the whole design philosophy in one comparison. ' +
    'Spend time here. Invite them to look at the screenshot and find the bad pallet themselves; that moment of ' +
    'searching IS the product.',
  );
}

/* ================================================================== *
 * 5 — The 15 hazards
 * ================================================================== */
{
  const s = lightSlide();
  kicker(s, 'Coverage');
  title(s, '15 hazard scenarios, all physically modelled', { size: 28, y: 0.78 });

  const hz = [
    ['Forklift on a walkway', 'major'], ['Reversing blind spot', 'major'], ['Falling boxes', 'major'],
    ['Damaged racking', 'major'], ['Unmarked spill', 'minor'], ['Blocked walkway', 'minor'],
    ['Blocked fire exit', 'major'], ['Blocked extinguisher', 'minor'], ['Worker without PPE', 'minor'],
    ['Open dock edge', 'major'], ['Trailing cable', 'minor'], ['Broken pallet', 'minor'],
    ['Over-height stack', 'minor'], ['Unsafe ladder', 'major'], ['Blind corner', 'major'],
  ];
  const cols = 5, rows = 3;
  const cw = (W - M * 2 - (cols - 1) * 0.22) / cols;
  const ch = 1.15;
  hz.forEach(([name, sev], i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const x = M + c * (cw + 0.22);
    const y = 1.7 + r * (ch + 0.22);
    const isMajor = sev === 'major';
    card(s, x, y, cw, ch, { fill: isMajor ? 'FDF0F1' : C.mist, line: isMajor ? 'EFC9CE' : 'DFE3E7' });
    badge(s, i + 1, x + 0.18, y + 0.18, 0.34, {
      fill: isMajor ? C.red : C.amber, color: isMajor ? 'FFFFFF' : C.ink, size: 11,
    });
    s.addText(sev.toUpperCase(), {
      x: x + cw - 0.95, y: y + 0.18, w: 0.78, h: 0.28, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 8, bold: true, color: isMajor ? C.red : C.orange,
      align: 'right', valign: 'middle',
    });
    s.addText(name, {
      x: x + 0.18, y: y + 0.6, w: cw - 0.36, h: 0.45, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 12, bold: true, color: C.ink, valign: 'top',
    });
  });

  s.addText('8 major  ·  7 minor      Each carries a description, why it is dangerous, the correct control, and teaching text.', {
    x: M, y: 6.15, w: W - M * 2, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 13, color: C.muted, valign: 'middle',
  });
  s.addNotes(
    'Do not read all fifteen aloud. Say "these are the fifteen the client specified, and every one is built as ' +
    'geometry you can walk up to." Then pick two examples — falling boxes and blind corner — and describe how they ' +
    'are staged. Major hazards are red; they score three times what a minor one does.',
  );
}

/* ================================================================== *
 * 6 — Decoys
 * ================================================================== */
{
  const s = lightSlide();
  kicker(s, 'What makes it teach');
  title(s, 'We also build the things that look wrong\nbut are actually right', { size: 27, y: 0.74, h: 1.25 });

  body(s, 'Real hazard spotting is discrimination, not detection. A trainee who flags everything has learned nothing — so the warehouse is seeded with correctly-controlled lookalikes. Flagging one is scored wrong, and the game explains why it is fine.',
    M, 2.0, 7.2, 1.2, { size: 14 });

  const pairs = [
    ['Unmarked spill on the floor', 'A spill that IS coned and signed'],
    ['Rack upright bent by an impact', 'A rack carrying a green inspection tag'],
    ['Open dock door, no barrier', 'A dock sealed by a parked trailer'],
    ['Forklift in the pedestrian lane', 'A truck parked in its charging bay'],
  ];
  s.addText('HAZARD', {
    x: M, y: 3.4, w: 3.4, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 10, bold: true, color: C.red, charSpacing: 1.5, valign: 'middle',
  });
  s.addText('CORRECTLY CONTROLLED  (a wrong answer)', {
    x: M + 3.8, y: 3.4, w: 4.5, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 10, bold: true, color: C.green, charSpacing: 1.5, valign: 'middle',
  });
  pairs.forEach(([bad, good], i) => {
    const y = 3.78 + i * 0.66;
    card(s, M, y, 3.4, 0.55, { fill: 'FDF0F1', shadow: false });
    body(s, bad, M + 0.18, y + 0.15, 3.05, 0.35, { size: 11.5, color: C.ink });
    s.addText('vs', {
      x: M + 3.45, y, w: 0.3, h: 0.55, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 10, italic: true, color: C.muted, align: 'center', valign: 'middle',
    });
    card(s, M + 3.8, y, 4.5, 0.55, { fill: 'E8F5EC', shadow: false });
    body(s, good, M + 3.98, y + 0.15, 4.15, 0.35, { size: 11.5, color: C.ink });
  });

  card(s, 9.5, 2.0, 3.15, 4.5, { fill: C.ink, shadow: false });
  s.addText('“', {
    x: 9.75, y: 2.05, w: 1, h: 0.7, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 44, bold: true, color: C.amber, valign: 'top',
  });
  s.addText('This spill is already being managed — it is signed and coned off, which is exactly the correct control. The hazard is an UNMARKED spill.', {
    x: 9.75, y: 2.75, w: 2.65, h: 2.2, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 12.5, color: 'FFFFFF', valign: 'top', lineSpacingMultiple: 1.25,
  });
  s.addText('Actual feedback shown when a trainee flags a decoy', {
    x: 9.75, y: 5.6, w: 2.65, h: 0.7, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 10.5, italic: true, color: C.dimText, valign: 'top',
  });
  s.addNotes(
    'This is the slide that differentiates us from a click-the-hotspot trainer, and clients respond to it. ' +
    'Line to use: "we teach them what good looks like, not just what bad looks like." ' +
    'Note that decoy count rises with difficulty — 0 on Simple, 12 on Hard.',
  );
}

/* ================================================================== *
 * 7 — Train vs Test
 * ================================================================== */
{
  const s = lightSlide();
  kicker(s, 'How a session runs');
  title(s, 'Learn it, then prove it', { size: 32, y: 0.78 });

  const half = (W - M * 2 - 0.4) / 2;

  card(s, M, 1.7, half, 4.15, { fill: C.mist });
  badge(s, '1', M + 0.4, 2.0, 0.5, { size: 15 });
  s.addText('TRAIN MODE', {
    x: M + 1.05, y: 2.02, w: 3.5, h: 0.45, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 17, bold: true, color: C.ink, valign: 'middle',
  });
  body(s, 'Teaches. It gates everything else.', M + 0.4, 2.65, half - 0.8, 0.35, { size: 13, italic: true, color: C.muted });
  bullets(s, [
    'Every hazard is ringed so it can be found',
    'Each find opens a card: what it is, why it is dangerous, the correct control',
    'No meaningful time pressure — nothing is being scored',
    'Finishing a site unlocks testing on that site',
  ], M + 0.4, 3.15, half - 0.8, 2.4, { size: 13 });

  const x2 = M + half + 0.4;
  card(s, x2, 1.7, half, 4.15, { fill: C.ink, shadow: false });
  badge(s, '2', x2 + 0.4, 2.0, 0.5, { size: 15 });
  s.addText('TEST MODE', {
    x: x2 + 1.05, y: 2.02, w: 3.5, h: 0.45, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 17, bold: true, color: 'FFFFFF', valign: 'middle',
  });
  body(s, 'Evaluates. No help.', x2 + 0.4, 2.65, half - 0.8, 0.35, { size: 13, italic: true, color: C.dimText });
  bullets(s, [
    'No rings, no hints — you find them by looking',
    'A reaction clock runs on every hazard',
    'Wrong flags break your combo and return a safety tip',
    'Full breakdown at the end, with personalised coaching',
  ], x2 + 0.4, 3.15, half - 0.8, 2.4, { size: 13, color: 'FFFFFF' });

  const flow = ['Observe', 'Find', 'Flag', 'Validate', 'Result'];
  const fw = 1.9;
  flow.forEach((t, i) => {
    const x = M + i * (fw + 0.42);
    card(s, x, 6.15, fw, 0.6, { fill: i === flow.length - 1 ? C.amber : C.mist, shadow: false });
    s.addText(t, {
      x, y: 6.15, w: fw, h: 0.6, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 13, bold: true, color: C.ink, align: 'center', valign: 'middle',
    });
    if (i < flow.length - 1) {
      s.addText('→', {
        x: x + fw, y: 6.15, w: 0.42, h: 0.6, isTextBox: true, margin: 0,
        fontFace: F.body, fontSize: 15, color: C.muted, align: 'center', valign: 'middle',
      });
    }
  });
  s.addNotes(
    'Stress the gate: you cannot be tested on a site you have not been trained on. That mirrors how a real site ' +
    'induction works, and clients recognise it. The five-step flow at the bottom is the Test Mode loop.',
  );
}

/* ================================================================== *
 * 8 — Difficulty
 * ================================================================== */
{
  const s = darkSlide({ image: SHOT('env03_highbay'), scrim: 78 });
  kicker(s, 'Difficulty', { y: 0.42 });
  title(s, 'Three difficulties that change the game,\nnot the label', { color: 'FFFFFF', size: 27, y: 0.74, h: 1.25 });

  const rows = [
    ['', 'SIMPLE', 'MID', 'HARD'],
    ['Time per hazard', '90 s', '60 s', '38 s'],
    ['Score multiplier', '×1.0', '×1.25', '×1.6'],
    ['Hazards highlighted', 'Yes', 'No', 'No'],
    ['Hazard count shown', 'Yes', 'Yes', 'No'],
    ['Decoys to reject', '0', '6', '12'],
    ['Moving hazards', 'No', 'Yes', 'Yes'],
    ['Ambient light', '0.85', '0.60', '0.40'],
  ];
  const tbl = rows.map((r, ri) =>
    r.map((cell, ci) => ({
      text: cell,
      options: {
        fontFace: ri === 0 ? F.head : F.body,
        fontSize: ri === 0 ? 12 : 12.5,
        bold: ri === 0 || ci === 0,
        color: ri === 0 ? C.ink : (ci === 3 && ri > 0 ? C.amber : 'FFFFFF'),
        fill: { color: ri === 0 ? C.amber : (ri % 2 ? C.ink : C.slate) },
        align: ci === 0 ? 'left' : 'center',
        valign: 'middle',
      },
    })),
  );
  s.addTable(tbl, {
    x: M, y: 2.2, w: 7.6, colW: [3.1, 1.5, 1.5, 1.5],
    rowH: 0.42, border: { type: 'solid', color: '3A424A', pt: 0.5 },
  });

  card(s, 8.6, 2.2, 4.05, 3.4, { fill: C.ink, line: C.amber, shadow: false });
  s.addText('On Hard', {
    x: 8.9, y: 2.4, w: 3.4, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 16, bold: true, color: C.amber, valign: 'middle',
  });
  bullets(s, [
    'The building is genuinely darker and hazier',
    'Forklifts patrol; cartons actually fall',
    'Twelve safe lookalikes to reject',
    'You are not told how many hazards exist',
  ], 8.9, 2.95, 3.5, 2.4, { size: 12.5, color: 'FFFFFF' });

  s.addText('Background: the High-Bay Annexe on Hard — five levels, narrow aisles, reduced lighting.', {
    x: M, y: 6.5, w: W - M * 2, h: 0.35, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 11, italic: true, color: C.dimText, valign: 'middle',
  });
  s.addNotes(
    'The point to make: difficulty is not a number we multiply the score by. Eight separate things change, including ' +
    'the lighting in the building. The background image IS Hard difficulty — that is what the trainee actually sees.',
  );
}

/* ================================================================== *
 * 9 — Scoring
 * ================================================================== */
{
  const s = lightSlide();
  kicker(s, 'Measurement');
  title(s, 'Scoring rewards the judgement that matters', { size: 30, y: 0.78 });

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
        fontFace: ri === 0 ? F.head : F.body, fontSize: ri === 0 ? 11 : 14,
        bold: ri === 0 || ci === 0,
        color: ri === 0 ? 'FFFFFF' : C.ink,
        fill: { color: ri === 0 ? C.ink : (ri % 2 ? 'FFFFFF' : C.mist) },
        align: ci === 0 ? 'left' : 'center', valign: 'middle',
      },
    }))),
    { x: M, y: 1.75, w: 6.2, colW: [2.6, 1.8, 1.8], rowH: 0.5, border: { type: 'solid', color: 'DDE1E5', pt: 0.5 } },
  );
  body(s, 'A major hazard is worth three times a minor one. A trainee who prioritises vehicles, racking and edges over housekeeping is prioritising correctly — and the score should say so.',
    M, 4.0, 6.2, 1.0, { size: 13, color: C.muted });

  card(s, 7.35, 1.75, 5.3, 1.5, { fill: C.mist });
  s.addText('COMBO', {
    x: 7.65, y: 1.95, w: 2, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 10, bold: true, color: C.orange, charSpacing: 1.5, valign: 'middle',
  });
  s.addText('3 correct in a row  →  +3 on every find', {
    x: 7.65, y: 2.3, w: 4.7, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 15, bold: true, color: C.ink, valign: 'middle',
  });
  body(s, 'Broken by a wrong flag. Spraying flags becomes a losing strategy.',
    7.65, 2.75, 4.7, 0.4, { size: 12, color: C.muted });

  const ranks = [
    ['Safety Champion', '50+', C.green],
    ['Getting There', '30 – 49', C.amber],
    ['Needs Practice', 'Below 30', C.red],
  ];
  s.addText('RANKS', {
    x: 7.35, y: 3.5, w: 3, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 10, bold: true, color: C.muted, charSpacing: 1.5, valign: 'middle',
  });
  ranks.forEach(([label, range, col], i) => {
    const y = 3.9 + i * 0.72;
    card(s, 7.35, y, 5.3, 0.6, { fill: C.mist, shadow: false });
    s.addShape(pres.ShapeType.ellipse, { x: 7.6, y: y + 0.16, w: 0.28, h: 0.28, fill: { color: col } });
    s.addText(label, {
      x: 8.05, y, w: 3, h: 0.6, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 14, bold: true, color: C.ink, valign: 'middle',
    });
    s.addText(range, {
      x: 11.0, y, w: 1.4, h: 0.6, isTextBox: true, margin: 0,
      fontFace: F.head, fontSize: 14, bold: true, color: col, align: 'right', valign: 'middle',
    });
  });

  body(s, 'Every value here lives in one configuration file and can be retuned to a client\'s own standards without touching game code.',
    M, 6.3, 11.9, 0.5, { size: 12.5, italic: true, color: C.muted });
  s.addNotes(
    'The last line is a selling point for the client: their safety officer can change the thresholds, the timings ' +
    'and the point values themselves. Mention that the results screen also gives written coaching based on how they ' +
    'actually played — for example, "you missed 3 major hazards; those are the ones that kill".',
  );
}

/* ================================================================== *
 * 10 — Environments
 * ================================================================== */
{
  const s = lightSlide();
  kicker(s, 'Content');
  title(s, 'Three warehouses, three risk profiles', { size: 30, y: 0.78 });

  const envs = [
    { n: '01', name: 'Main Storage Hall', size: '62 × 44 m', hz: '15 hazards', img: SHOT('env01_wide'),
      d: 'General storage. Four racking runs, a central pedestrian spine, an active forklift aisle.' },
    { n: '02', name: 'Loading & Dispatch Bay', size: '70 × 30 m', hz: '12 hazards', img: SHOT('env01_walkway'),
      d: 'Cross-dock. Six dock doors, constant vehicle movement, marshalling housekeeping.' },
    { n: '03', name: 'High-Bay Annexe', size: '54 × 40 m', hz: '15 hazards', img: SHOT('env03_aisle'),
      d: 'Narrow aisle, five levels, poor light and heavy congestion. The hard site.' },
  ];
  const cw = (W - M * 2 - 0.5) / 3;
  envs.forEach((e, i) => {
    const x = M + i * (cw + 0.25);
    card(s, x, 1.65, cw, 4.55);
    s.addImage({ path: e.img, x: x + 0.001, y: 1.65, w: cw - 0.002, h: 1.85, sizing: { type: 'cover', w: cw, h: 1.85 } });
    s.addText(e.n, {
      x: x + 0.25, y: 3.6, w: 1, h: 0.4, isTextBox: true, margin: 0,
      fontFace: F.head, fontSize: 20, bold: true, color: C.amber, valign: 'middle',
    });
    s.addText(e.name, {
      x: x + 0.25, y: 4.0, w: cw - 0.5, h: 0.45, isTextBox: true, margin: 0,
      fontFace: F.head, fontSize: 15, bold: true, color: C.ink, valign: 'top',
    });
    body(s, e.d, x + 0.25, 4.5, cw - 0.5, 1.05, { size: 12, color: C.muted });
    s.addText(`${e.hz}   ·   ${e.size}`, {
      x: x + 0.25, y: 5.65, w: cw - 0.5, h: 0.35, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 11, bold: true, color: C.orange, valign: 'middle',
    });
  });

  body(s, 'All three share one prop and scenario library — environments 2 and 3 are about 250 lines each, not copies of the application. A fourth site is one file plus one line.',
    M, 6.45, W - M * 2, 0.5, { size: 13, color: C.body });
  s.addNotes(
    'The closing line is the commercial point: adding a new site is cheap because the hazard library is shared. ' +
    'If the client asks "could you build OUR warehouse?" — yes, and this is why that is not a rewrite.',
  );
}

/* ================================================================== *
 * 11 — Built and proven
 * ================================================================== */
{
  const s = lightSlide();
  kicker(s, 'Where the project stands');
  title(s, 'Built, tested and running', { size: 32, y: 0.78 });

  stat(s, '15', 'HAZARDS MODELLED', M, 1.75, 2.6, { sub: 'All physically built' });
  stat(s, '3', 'ENVIRONMENTS', M + 2.9, 1.75, 2.6, { sub: 'Shared prop library' });
  stat(s, '94', 'AUTOMATED TESTS', M + 5.8, 1.75, 2.6, { sub: 'All passing', color: C.green });
  stat(s, '60', 'FRAMES PER SECOND', M + 8.7, 1.75, 2.9, { sub: 'Measured in-browser', color: C.green });

  card(s, M, 3.5, 5.8, 2.9, { fill: C.mist });
  s.addText('Verified by playing it, not by assuming', {
    x: M + 0.35, y: 3.75, w: 5.1, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 15, bold: true, color: C.ink, valign: 'middle',
  });
  body(s, 'A test harness walks the player around every hazard from 24 vantage points and confirms each one can actually be found and flagged.',
    M + 0.35, 4.2, 5.1, 0.85, { size: 12.5, color: C.muted });
  const res = [
    ['Main Storage Hall — Mid', '15 / 15'],
    ['Loading & Dispatch — Mid', '12 / 12'],
    ['High-Bay Annexe — Hard', '15 / 15'],
  ];
  res.forEach(([label, val], i) => {
    const y = 5.1 + i * 0.42;
    s.addText(label, {
      x: M + 0.35, y, w: 3.7, h: 0.38, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 12.5, color: C.body, valign: 'middle',
    });
    s.addText(val, {
      x: M + 4.05, y, w: 1.4, h: 0.38, isTextBox: true, margin: 0,
      fontFace: F.head, fontSize: 12.5, bold: true, color: C.green, align: 'right', valign: 'middle',
    });
  });

  card(s, M + 6.1, 3.5, 5.5, 2.9, { fill: C.ink, shadow: false });
  s.addText('Engineering highlight', {
    x: M + 6.45, y: 3.75, w: 4.8, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 15, bold: true, color: C.amber, valign: 'middle',
  });
  body(s, 'A believable warehouse needs thousands of cartons. Drawn naively that is 9,587 draw calls per frame — unusable.',
    M + 6.45, 4.2, 4.8, 0.7, { size: 12.5, color: 'FFFFFF' });
  s.addText('9,587', {
    x: M + 6.45, y: 4.95, w: 1.9, h: 0.6, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 26, bold: true, color: '8A939B', align: 'left', valign: 'middle',
  });
  s.addText('→', {
    x: M + 8.3, y: 4.95, w: 0.6, h: 0.6, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 20, color: C.dimText, align: 'center', valign: 'middle',
  });
  s.addText('994', {
    x: M + 8.9, y: 4.95, w: 1.9, h: 0.6, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 26, bold: true, color: C.amber, align: 'left', valign: 'middle',
  });
  body(s, 'Static geometry is merged into 74 batches at load — same picture, a fraction of the cost.',
    M + 6.45, 5.6, 4.8, 0.6, { size: 11.5, color: C.dimText });
  s.addNotes(
    'For a classroom audience, the 9,587 → 994 number is the strongest technical story: a real problem, measured, ' +
    'and solved with a specific technique. For a client audience, the three green rows on the left matter more — ' +
    'it means every hazard is genuinely reachable, verified automatically.',
  );
}

/* ================================================================== *
 * 12 — Honest limitations
 * ================================================================== */
{
  const s = lightSlide();
  kicker(s, 'Being straight with you', { color: C.orange });
  title(s, 'What it does not do yet', { size: 32, y: 0.78 });

  body(s, 'A training tool that overstates itself is worse than one that does not. These are stated plainly in the project documentation.',
    M, 1.6, 8.5, 0.5, { size: 14, color: C.muted });

  const lims = [
    ['Not photorealistic', 'Stylised, procedurally generated geometry. Built for believable scale and hazard readability, not for a rendered CAD walkthrough.'],
    ['No VR', 'No headset was available to test on, so rather than ship untested VR code we left it out. Desktop play never depended on it.'],
    ['Google sign-in unconfigured', 'The code path exists but has never been run against Google. The app says so instead of pretending. Local sign-in is used.'],
    ['Limited device testing', 'Touch controls are built and the layout is responsive, but they have not been tested on a real phone or tablet. Chromium only so far.'],
  ];
  const cw = (W - M * 2 - 0.45) / 2;
  lims.forEach(([t, d], i) => {
    const x = M + (i % 2) * (cw + 0.45);
    const y = 2.35 + Math.floor(i / 2) * 1.75;
    card(s, x, y, cw, 1.5, { fill: C.mist });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.3, y: y + 0.32, w: 0.3, h: 0.3, fill: { color: C.orange } });
    s.addText(t, {
      x: x + 0.75, y: y + 0.22, w: cw - 1.05, h: 0.45, isTextBox: true, margin: 0,
      fontFace: F.head, fontSize: 14, bold: true, color: C.ink, valign: 'middle',
    });
    body(s, d, x + 0.75, y + 0.7, cw - 1.05, 0.7, { size: 11.5, color: C.muted });
  });

  card(s, M, 5.95, W - M * 2, 0.85, { fill: C.ink, shadow: false });
  s.addText('Everything above is written into the repository documentation — not discovered later.', {
    x: M + 0.35, y: 5.95, w: 11.2, h: 0.85, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 14, bold: true, color: C.amber, valign: 'middle',
  });
  s.addNotes(
    'Do not skip this slide, and do not apologise through it. Presenting limitations confidently is what makes the ' +
    'rest of the claims credible — especially in front of a client. If asked "why no VR?", the answer is: we had no ' +
    'headset to test on, and untested VR is worse than no VR.',
  );
}

/* ================================================================== *
 * 13 — Access / deployment
 * ================================================================== */
{
  const s = lightSlide();
  kicker(s, 'Getting it in front of people');
  title(s, 'Three ways to run it today', { size: 32, y: 0.78 });

  const ways = [
    ['Open a link', 'Hosted online. Nothing to install — it runs in the browser the trainee already has.', C.amber],
    ['Open one file', 'The entire game is also a single 677 kB HTML file. Double-click it. No server, no internet.', C.orange],
    ['Host it yourself', 'A plain static site. Drops onto the client\'s own intranet or any web host.', C.green],
  ];
  const cw = (W - M * 2 - 0.5) / 3;
  ways.forEach(([t, d, col], i) => {
    const x = M + i * (cw + 0.25);
    card(s, x, 1.7, cw, 2.5);
    badge(s, i + 1, x + 0.35, 2.0, 0.46, { fill: col, color: i === 2 ? 'FFFFFF' : C.ink });
    s.addText(t, {
      x: x + 0.35, y: 2.6, w: cw - 0.7, h: 0.45, isTextBox: true, margin: 0,
      fontFace: F.head, fontSize: 16, bold: true, color: C.ink, valign: 'top',
    });
    body(s, d, x + 0.35, 3.1, cw - 0.7, 1.1, { size: 12.5, color: C.muted });
  });

  card(s, M, 4.5, W - M * 2, 1.85, { fill: C.mist });
  s.addText('Works offline, on the machines they already have', {
    x: M + 0.4, y: 4.75, w: 7.5, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 16, bold: true, color: C.ink, valign: 'middle',
  });
  body(s, 'No server, no database and no account are required for the core training. That matters on a warehouse site, where network coverage on the floor is often poor and IT approval for new software is slow.',
    M + 0.4, 5.2, 8.2, 0.9, { size: 13, color: C.body });

  s.addText('677 kB', {
    x: 9.3, y: 4.8, w: 3.2, h: 0.65, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 32, bold: true, color: C.amber, align: 'right', valign: 'middle',
  });
  s.addText('the whole game, one file', {
    x: 9.3, y: 5.45, w: 3.2, h: 0.35, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 12, color: C.muted, align: 'right', valign: 'middle',
  });
  s.addNotes(
    'The offline point is a genuine client benefit — say it plainly. Warehouse floors have bad wifi and slow IT ' +
    'approval; a single file that runs from a USB stick sidesteps both. If you are demoing live, this is the moment ' +
    'to switch to the game.',
  );
}

/* ================================================================== *
 * 14 — Roadmap
 * ================================================================== */
{
  const s = lightSlide();
  kicker(s, 'Where it goes next');
  title(s, 'Roadmap', { size: 32, y: 0.78 });

  const items = [
    ['Near term', ['Real-device testing for touch controls', 'Firefox and Safari verification', 'Further draw-call optimisation'], C.amber],
    ['Client value', ['The client\'s own warehouse as a fourth site', 'Instructor dashboard for cohort results', 'Multi-language UI (signage is already bilingual)'], C.orange],
    ['Longer term', ['VR support, once a headset is available', 'Round replay showing what was missed and where', 'Optional server-backed record keeping'], C.green],
  ];
  const cw = (W - M * 2 - 0.5) / 3;
  items.forEach(([head, list, col], i) => {
    const x = M + i * (cw + 0.25);
    card(s, x, 1.75, cw, 3.9);
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.35, y: 2.05, w: 0.32, h: 0.32, fill: { color: col } });
    s.addText(head, {
      x: x + 0.8, y: 1.98, w: cw - 1.1, h: 0.45, isTextBox: true, margin: 0,
      fontFace: F.head, fontSize: 16, bold: true, color: C.ink, valign: 'middle',
    });
    bullets(s, list, x + 0.35, 2.65, cw - 0.7, 2.7, { size: 12.5, color: C.body, space: 10 });
  });

  body(s, 'The data layer is already behind a swappable adapter, so record keeping can move to a server without rewriting the game.',
    M, 5.95, W - M * 2, 0.5, { size: 13, italic: true, color: C.muted });
  s.addNotes(
    'The middle column is the one the client cares about. If there is appetite in the room, the natural next step to ' +
    'propose is building their own site as environment four — and slide 10 already explained why that is cheap.',
  );
}

/* ================================================================== *
 * 15 — Close
 * ================================================================== */
{
  const s = darkSlide({ image: SHOT('hz_exit2'), scrim: 74 });
  s.addText('Thank you', {
    x: M, y: 2.3, w: 9, h: 1.0, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 46, bold: true, color: C.amber, valign: 'middle',
  });
  s.addText('Questions — and a live demo whenever you are ready.', {
    x: M, y: 3.4, w: 9, h: 0.5, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 19, color: 'FFFFFF', valign: 'middle',
  });
  s.addShape(pres.ShapeType.rect, { x: M, y: 4.15, w: 1.5, h: 0.035, fill: { color: C.amber } });

  const facts = [['15', 'hazards'], ['3', 'environments'], ['94', 'tests passing'], ['60', 'fps']];
  facts.forEach(([v, l], i) => {
    const x = M + i * 2.6;
    s.addText(v, {
      x, y: 4.6, w: 2.4, h: 0.6, isTextBox: true, margin: 0,
      fontFace: F.head, fontSize: 30, bold: true, color: 'FFFFFF', valign: 'middle',
    });
    s.addText(l, {
      x, y: 5.2, w: 2.4, h: 0.35, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 12, color: C.dimText, valign: 'middle',
    });
  });

  s.addText('BEAT THE HAZARD   ·   Kushal Neupane', {
    x: M, y: 6.6, w: 9, h: 0.35, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 12, bold: true, color: C.dimText, valign: 'middle',
  });
  s.addNotes(
    'Close on the demo, not on the slide. Have the game already loaded in another window so you can switch instantly. ' +
    'Suggested demo order: (1) walk the main hall, (2) find the falling boxes, (3) flag a decoy on purpose so they see ' +
    'the game teach, (4) show the results screen. Keep it under three minutes.',
  );
}

/* ------------------------------------------------------------------ */
const out = path.join(__dirname, '..', 'Beat-The-Hazard-Presentation.pptx');
pres.writeFile({ fileName: out }).then(() => console.log('written:', out));
