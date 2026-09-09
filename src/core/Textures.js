/**
 * Textures.js
 * Procedurally generated canvas textures.
 *
 * Why procedural: shipping third-party image assets creates licensing and
 * attribution overhead. Canvas-generated textures give us grime, wear, printed
 * signage and floor markings with zero external dependencies, and they are
 * cached so each is only rasterised once.
 *
 * Everything here returns a THREE.CanvasTexture with sRGB colour space set.
 */
import * as THREE from 'three';

const cache = new Map();

function makeCanvas(size = 512, h = size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = h;
  return c;
}

function toTexture(canvas, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

/** Deterministic pseudo-random so the warehouse looks identical every load. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noiseOverlay(ctx, w, h, { seed = 1, amount = 0.09, scale = 1 } = {}) {
  const rnd = mulberry32(seed);
  const step = Math.max(1, Math.round(scale));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const n = (rnd() - 0.5) * amount * 255;
      ctx.fillStyle = n > 0 ? `rgba(255,255,255,${n / 255})` : `rgba(0,0,0,${-n / 255})`;
      ctx.fillRect(x, y, step, step);
    }
  }
}

/** Soft dark blotches - oil marks, tyre scuff, general grime. */
function grime(ctx, w, h, { seed = 5, count = 26, max = 90, alpha = 0.16 } = {}) {
  const rnd = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 12 + rnd() * max;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ------------------------------------------------------------------ *
 * Floor
 * ------------------------------------------------------------------ */

/** Polished-but-worn concrete slab with expansion joints. */
export function concreteFloor() {
  return cached('concreteFloor', () => {
    const S = 1024;
    const c = makeCanvas(S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#8b8d8a';
    ctx.fillRect(0, 0, S, S);

    // subtle mottling
    const rnd = mulberry32(11);
    for (let i = 0; i < 900; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 6 + rnd() * 60;
      ctx.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${0.012 + rnd() * 0.03})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // aggregate speckle
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      ctx.fillStyle = `rgba(60,60,58,${0.10 + rnd() * 0.22})`;
      ctx.fillRect(x, y, 1 + rnd() * 2.2, 1 + rnd() * 2.2);
    }
    grime(ctx, S, S, { seed: 21, count: 20, max: 130, alpha: 0.1 });

    // saw-cut expansion joints on a 1/2 tile grid
    ctx.strokeStyle = 'rgba(40,40,40,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, S / 2);
    ctx.lineTo(S, S / 2);
    ctx.moveTo(S / 2, 0);
    ctx.lineTo(S / 2, S);
    ctx.stroke();
    // joint highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, S / 2 + 2);
    ctx.lineTo(S, S / 2 + 2);
    ctx.moveTo(S / 2 + 2, 0);
    ctx.lineTo(S / 2 + 2, S);
    ctx.stroke();

    noiseOverlay(ctx, S, S, { seed: 3, amount: 0.05, scale: 2 });
    return toTexture(c, { repeat: [1, 1], aniso: 16 });
  });
}

/** Matching roughness map so the floor is not uniformly shiny. */
export function concreteRoughness() {
  return cached('concreteRough', () => {
    const S = 512;
    const c = makeCanvas(S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#b4b4b4';
    ctx.fillRect(0, 0, S, S);
    const rnd = mulberry32(77);
    for (let i = 0; i < 500; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 10 + rnd() * 70;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const v = rnd() > 0.5 ? 255 : 90;
      g.addColorStop(0, `rgba(${v},${v},${v},0.25)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    noiseOverlay(ctx, S, S, { seed: 9, amount: 0.25, scale: 2 });
    return toTexture(c, { srgb: false });
  });
}

/* ------------------------------------------------------------------ *
 * Cardboard / crates
 * ------------------------------------------------------------------ */

/** Cardboard carton face with tape seam, fragile marks and a printed label. */
export function cardboard(variant = 0) {
  return cached(`cardboard${variant}`, () => {
    const S = 512;
    const c = makeCanvas(S);
    const ctx = c.getContext('2d');
    const bases = ['#c69a63', '#b98d58', '#cfa771', '#ab7f4e'];
    ctx.fillStyle = bases[variant % bases.length];
    ctx.fillRect(0, 0, S, S);

    // corrugation striping
    const rnd = mulberry32(100 + variant);
    ctx.globalAlpha = 0.05;
    for (let y = 0; y < S; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? '#000' : '#fff';
      ctx.fillRect(0, y, S, 2);
    }
    ctx.globalAlpha = 1;

    // fibre flecks
    for (let i = 0; i < 1400; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      ctx.fillStyle = `rgba(90,60,30,${0.05 + rnd() * 0.16})`;
      ctx.fillRect(x, y, 1 + rnd() * 3, 1);
    }

    // packing tape seam down the middle
    ctx.fillStyle = 'rgba(215,190,150,0.55)';
    ctx.fillRect(S / 2 - 22, 0, 44, S);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(S / 2 - 22, 0, 6, S);

    // printed shipping label
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(56, 300, 190, 120);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(56, 300, 190, 120);
    ctx.fillStyle = '#2a2a2a';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('HIMALAYA', 68, 330);
    ctx.font = '14px monospace';
    ctx.fillText('LOGISTICS PVT.', 68, 350);
    ctx.fillText('KATHMANDU  NP', 68, 368);
    // barcode
    for (let i = 0, x = 68; i < 34; i++) {
      const w = 1 + Math.round(rnd() * 3);
      ctx.fillStyle = '#111';
      ctx.fillRect(x, 380, w, 26);
      x += w + 1 + Math.round(rnd() * 3);
      if (x > 232) break;
    }

    // "fragile / this way up" stencil
    ctx.strokeStyle = 'rgba(40,40,40,0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(330, 150);
    ctx.lineTo(360, 110);
    ctx.lineTo(390, 150);
    ctx.moveTo(360, 110);
    ctx.lineTo(360, 190);
    ctx.stroke();
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = 'rgba(40,40,40,0.5)';
    ctx.fillText('THIS WAY UP', 300, 218);

    grime(ctx, S, S, { seed: 40 + variant, count: 10, max: 70, alpha: 0.1 });
    noiseOverlay(ctx, S, S, { seed: 12 + variant, amount: 0.06, scale: 2 });
    return toTexture(c);
  });
}

/* ------------------------------------------------------------------ *
 * Wood / metal
 * ------------------------------------------------------------------ */

export function palletWood() {
  return cached('palletWood', () => {
    const S = 256;
    const c = makeCanvas(S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#a9884f';
    ctx.fillRect(0, 0, S, S);
    const rnd = mulberry32(31);
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = `rgba(${90 + rnd() * 50},${60 + rnd() * 40},${25 + rnd() * 30},${0.18 + rnd() * 0.25})`;
      ctx.lineWidth = 1 + rnd() * 2.5;
      ctx.beginPath();
      const y = rnd() * S;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(S * 0.3, y + (rnd() - 0.5) * 14, S * 0.7, y + (rnd() - 0.5) * 14, S, y + (rnd() - 0.5) * 8);
      ctx.stroke();
    }
    // knots
    for (let i = 0; i < 4; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      for (let r = 12; r > 0; r -= 2) {
        ctx.strokeStyle = `rgba(70,45,20,${0.06 + r * 0.012})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.6, rnd(), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    grime(ctx, S, S, { seed: 8, count: 8, max: 40, alpha: 0.14 });
    noiseOverlay(ctx, S, S, { seed: 6, amount: 0.1, scale: 1 });
    return toTexture(c);
  });
}

/** Painted steel with scuffs - used for racking uprights and beams. */
export function paintedSteel(hex = '#2f5fa8', seed = 4) {
  return cached(`steel${hex}${seed}`, () => {
    const S = 256;
    const c = makeCanvas(S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, S, S);
    const rnd = mulberry32(seed);
    // scratches revealing bare metal
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(200,200,205,${0.05 + rnd() * 0.18})`;
      ctx.lineWidth = rnd() * 1.6;
      ctx.beginPath();
      const x = rnd() * S;
      const y = rnd() * S;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 70, y + (rnd() - 0.5) * 70);
      ctx.stroke();
    }
    grime(ctx, S, S, { seed: seed + 3, count: 12, max: 60, alpha: 0.18 });
    noiseOverlay(ctx, S, S, { seed, amount: 0.07, scale: 1 });
    return toTexture(c);
  });
}

/** Corrugated / profiled metal wall cladding. */
export function claddingWall(hex = '#9aa3a8') {
  return cached(`clad${hex}`, () => {
    const S = 512;
    const c = makeCanvas(S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, S, S);
    // vertical profile ribs
    for (let x = 0; x < S; x += 32) {
      const g = ctx.createLinearGradient(x, 0, x + 32, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.22)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.10)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.03)');
      g.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 32, S);
    }
    // horizontal panel joint
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, S - 6, S, 4);
    grime(ctx, S, S, { seed: 55, count: 14, max: 120, alpha: 0.1 });
    noiseOverlay(ctx, S, S, { seed: 15, amount: 0.05, scale: 2 });
    return toTexture(c);
  });
}

/* ------------------------------------------------------------------ *
 * Signage
 * ------------------------------------------------------------------ */

/**
 * Generic sign painter. Draws a rectangular sign face and returns a texture.
 * @param {object} o
 */
export function sign({
  key,
  w = 512,
  h = 256,
  bg = '#ffffff',
  border = null,
  lines = [],
  icon = null,
  iconColor = '#000',
}) {
  return cached(`sign:${key}`, () => {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = Math.max(6, h * 0.045);
      ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
    }

    if (icon === 'running-man') drawRunningMan(ctx, w, h);
    if (icon === 'triangle') drawWarnTriangle(ctx, w, h, iconColor);
    if (icon === 'helmet') drawHelmet(ctx, w, h, iconColor);
    if (icon === 'forklift') drawForkliftGlyph(ctx, w, h, iconColor);
    if (icon === 'flame') drawFlame(ctx, w, h);
    if (icon === 'nepal-flag') drawNepalFlag(ctx, w, h);

    const startY = icon ? h * 0.72 : h / 2 - ((lines.length - 1) * h * 0.13) / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((ln, i) => {
      const text = typeof ln === 'string' ? ln : ln.t;
      const col = typeof ln === 'string' ? '#111' : (ln.c ?? '#111');
      const size = typeof ln === 'string' ? h * 0.15 : h * (ln.s ?? 0.15);
      ctx.fillStyle = col;
      ctx.font = `bold ${size}px "Segoe UI", Arial, sans-serif`;
      ctx.fillText(text, w / 2, startY + i * size * 1.25);
    });

    noiseOverlay(ctx, w, h, { seed: 2, amount: 0.03, scale: 2 });
    return toTexture(c);
  });
}

function drawRunningMan(ctx, w, h) {
  const cx = w / 2;
  const cy = h * 0.4;
  const s = h * 0.0032;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s * 100, s * 100);
  ctx.fillStyle = '#ffffff';
  // head
  ctx.beginPath();
  ctx.arc(0.05, -0.72, 0.17, 0, Math.PI * 2);
  ctx.fill();
  // body + limbs as thick strokes
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.2;
  ctx.beginPath();
  ctx.moveTo(0.02, -0.52);
  ctx.lineTo(-0.08, -0.05);
  ctx.stroke();
  ctx.beginPath(); // front leg
  ctx.moveTo(-0.08, -0.05);
  ctx.lineTo(0.3, 0.2);
  ctx.lineTo(0.42, 0.62);
  ctx.stroke();
  ctx.beginPath(); // back leg
  ctx.moveTo(-0.08, -0.05);
  ctx.lineTo(-0.42, 0.3);
  ctx.lineTo(-0.5, 0.62);
  ctx.stroke();
  ctx.beginPath(); // arms
  ctx.moveTo(0.0, -0.42);
  ctx.lineTo(0.34, -0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.0, -0.42);
  ctx.lineTo(-0.36, -0.5);
  ctx.stroke();
  // door + arrow
  ctx.lineWidth = 0.14;
  ctx.beginPath();
  ctx.moveTo(0.72, -0.85);
  ctx.lineTo(0.98, -0.85);
  ctx.lineTo(0.98, 0.7);
  ctx.lineTo(0.72, 0.7);
  ctx.stroke();
  ctx.restore();
}

function drawWarnTriangle(ctx, w, h, color) {
  const cx = w / 2;
  const cy = h * 0.38;
  const r = h * 0.3;
  ctx.fillStyle = '#f5c400';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = h * 0.035;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.92, cy + r * 0.72);
  ctx.lineTo(cx - r * 0.92, cy + r * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color ?? '#111';
  ctx.font = `bold ${h * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', cx, cy + r * 0.18);
}

function drawHelmet(ctx, w, h, color) {
  const cx = w / 2;
  const cy = h * 0.42;
  ctx.fillStyle = color ?? '#fff';
  ctx.beginPath();
  ctx.arc(cx, cy, h * 0.2, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - h * 0.28, cy - h * 0.03, h * 0.56, h * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy + h * 0.2, h * 0.15, Math.PI, 0, true);
  ctx.fill();
}

function drawForkliftGlyph(ctx, w, h, color) {
  const s = h / 256;
  ctx.save();
  ctx.translate(w / 2 - 70 * s, h * 0.18);
  ctx.scale(s, s);
  ctx.fillStyle = color ?? '#111';
  ctx.fillRect(10, 40, 70, 45); // body
  ctx.fillRect(30, 15, 40, 30); // cab
  ctx.fillRect(84, 0, 8, 90); // mast
  ctx.fillRect(92, 74, 44, 8); // fork
  ctx.beginPath();
  ctx.arc(28, 96, 14, 0, Math.PI * 2);
  ctx.arc(70, 96, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFlame(ctx, w, h) {
  const cx = w / 2;
  const cy = h * 0.42;
  const g = ctx.createLinearGradient(cx, cy - h * 0.25, cx, cy + h * 0.2);
  g.addColorStop(0, '#ffe066');
  g.addColorStop(0.5, '#ff9f1a');
  g.addColorStop(1, '#e63946');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.26);
  ctx.bezierCurveTo(cx + h * 0.22, cy - h * 0.05, cx + h * 0.16, cy + h * 0.2, cx, cy + h * 0.2);
  ctx.bezierCurveTo(cx - h * 0.16, cy + h * 0.2, cx - h * 0.22, cy - h * 0.05, cx, cy - h * 0.26);
  ctx.fill();
}

/**
 * The flag of Nepal - two stacked pennants with a white moon and sun.
 * Drawn to the official 'double pennon' outline rather than a rectangle.
 */
export function drawNepalFlag(ctx, w, h) {
  const pad = Math.min(w, h) * 0.06;
  const H = h - pad * 2;
  const W = W_from(H);
  const ox = (w - W) / 2;
  const oy = pad;

  function W_from(hh) {
    return hh * 0.75;
  }

  const crimson = '#dc143c';
  const blue = '#003893';

  ctx.save();
  ctx.translate(ox, oy);

  // Outline path of the two pennants (approximation of the official geometry)
  const p = new Path2D();
  p.moveTo(0, 0);
  p.lineTo(W * 0.92, H * 0.36); // upper pennant tip
  p.lineTo(W * 0.44, H * 0.36);
  p.lineTo(W * 0.98, H * 0.78); // lower pennant tip
  p.lineTo(0, H * 0.78);
  p.closePath();

  ctx.fillStyle = blue;
  ctx.fill(p);

  // Inset crimson field
  ctx.save();
  ctx.clip(p);
  ctx.translate(W * 0.045, H * 0.03);
  ctx.scale(0.9, 0.92);
  ctx.fillStyle = crimson;
  ctx.fill(p);
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  // Moon (upper pennant): crescent with rays
  const mx = W * 0.28;
  const my = H * 0.17;
  const mr = H * 0.055;
  drawRays(ctx, mx, my, mr * 1.9, 8);
  ctx.beginPath();
  ctx.arc(mx, my + mr * 0.25, mr, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(mx, my + mr * 0.05, mr * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = crimson;
  ctx.beginPath();
  ctx.arc(mx, my - mr * 0.35, mr * 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Sun (lower pennant): twelve rays around a disc
  ctx.fillStyle = '#ffffff';
  const sx = W * 0.3;
  const sy = H * 0.58;
  const sr = H * 0.06;
  drawRays(ctx, sx, sy, sr * 2.0, 12);
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  function drawRays(c2, x, y, r, n) {
    c2.save();
    c2.translate(x, y);
    for (let i = 0; i < n; i++) {
      c2.rotate((Math.PI * 2) / n);
      c2.beginPath();
      c2.moveTo(-r * 0.16, -r * 0.55);
      c2.lineTo(0, -r);
      c2.lineTo(r * 0.16, -r * 0.55);
      c2.closePath();
      c2.fill();
    }
    c2.restore();
  }
}

/** Standalone Nepal flag texture (for the flagpole and wall plaque). */
export function nepalFlagTexture() {
  return cached('nepalFlag', () => {
    const c = makeCanvas(384, 512);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f2f2f0';
    ctx.fillRect(0, 0, 384, 512);
    drawNepalFlag(ctx, 384, 512);
    return toTexture(c);
  });
}

/* ------------------------------------------------------------------ *
 * Decals
 * ------------------------------------------------------------------ */

/** Dark oil/water spill decal with an alpha falloff, for the floor. */
export function spillDecal() {
  return cached('spill', () => {
    const S = 512;
    const c = makeCanvas(S);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, S, S);
    const rnd = mulberry32(303);
    // irregular blob built from overlapping ellipses
    for (let i = 0; i < 26; i++) {
      const x = S / 2 + (rnd() - 0.5) * S * 0.55;
      const y = S / 2 + (rnd() - 0.5) * S * 0.5;
      const rx = 40 + rnd() * 110;
      const ry = 30 + rnd() * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      g.addColorStop(0, 'rgba(18,16,14,0.94)');
      g.addColorStop(0.7, 'rgba(24,22,18,0.75)');
      g.addColorStop(1, 'rgba(30,28,22,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // oily rainbow sheen highlights
    for (let i = 0; i < 9; i++) {
      const x = S / 2 + (rnd() - 0.5) * S * 0.4;
      const y = S / 2 + (rnd() - 0.5) * S * 0.35;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 30 + rnd() * 45);
      g.addColorStop(0, `rgba(${120 + rnd() * 100},${150 + rnd() * 80},${180 + rnd() * 60},0.22)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 30 + rnd() * 45, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTexture(c);
  });
}

/** Hazard-stripe (chevron) strip used for dock edges and barriers. */
export function hazardStripes(a = '#f5c400', b = '#111111', repeat = [6, 1]) {
  return cached(`stripes${a}${b}${repeat.join()}`, () => {
    const w = 256;
    const h = 64;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = b;
    for (let x = -h; x < w + h; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + 32, h);
      ctx.lineTo(x + 32 + h, 0);
      ctx.lineTo(x + h, 0);
      ctx.closePath();
      ctx.fill();
    }
    grime(ctx, w, h, { seed: 71, count: 6, max: 30, alpha: 0.2 });
    return toTexture(c, { repeat });
  });
}

export function disposeTextureCache() {
  for (const t of cache.values()) t?.dispose?.();
  cache.clear();
}
