/**
 * qr.js
 * A minimal QR Code encoder (ISO/IEC 18004), byte mode, versions 1-10.
 *
 * Written from scratch rather than pulled from npm so the game keeps its
 * offline promise: the single-file build must not need a CDN, and adding a
 * dependency for one QR code would be the only runtime package besides Three.js.
 *
 * Supports what we actually need and no more:
 *   - byte mode (an otpauth:// URI is ASCII)
 *   - error correction levels L and M
 *   - versions 1-10 (up to 271 bytes at level L) with automatic selection
 *   - all 8 data masks, chosen by the standard penalty score
 */

/* ------------------------------------------------------------------ *
 * Specification tables
 * ------------------------------------------------------------------ */

/** Total codewords (data + error correction) per version. */
const TOTAL_CODEWORDS = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

/**
 * Block structure per version and EC level:
 *   [ecCodewordsPerBlock, group1Blocks, group1DataCodewords, group2Blocks, group2DataCodewords]
 */
const BLOCKS = {
  L: [
    null,
    [7, 1, 19, 0, 0], [10, 1, 34, 0, 0], [15, 1, 55, 0, 0], [20, 1, 80, 0, 0],
    [26, 1, 108, 0, 0], [18, 2, 68, 0, 0], [20, 2, 78, 0, 0], [24, 2, 97, 0, 0],
    [30, 2, 116, 0, 0], [18, 2, 68, 2, 69],
  ],
  M: [
    null,
    [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0],
    [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39],
    [22, 3, 36, 2, 37], [26, 4, 43, 1, 44],
  ],
};

/** Alignment pattern centre coordinates per version. */
const ALIGNMENT = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
];

/** Two bits identifying the EC level inside the format information. */
const EC_BITS = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };

/* ------------------------------------------------------------------ *
 * GF(256) arithmetic for Reed-Solomon
 * ------------------------------------------------------------------ */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function buildTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // the QR field's primitive polynomial
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/** Generator polynomial for `degree` error-correction codewords. */
function generatorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** Reed-Solomon remainder: the error-correction codewords for one block. */
function ecCodewords(data, ecLen) {
  const gen = generatorPoly(ecLen);
  const res = new Array(data.length + ecLen).fill(0);
  data.forEach((d, i) => { res[i] = d; });

  for (let i = 0; i < data.length; i++) {
    const factor = res[i];
    if (factor === 0) continue;
    for (let j = 0; j < gen.length; j++) {
      res[i + j] ^= gfMul(gen[j], factor);
    }
  }
  return res.slice(data.length);
}

/* ------------------------------------------------------------------ *
 * Bit stream
 * ------------------------------------------------------------------ */

class BitBuffer {
  constructor() { this.bits = []; }
  put(value, length) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  get length() { return this.bits.length; }
  toBytes() {
    const out = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | (this.bits[i + j] ?? 0);
      out.push(b);
    }
    return out;
  }
}

/** Data capacity in codewords for a version + EC level. */
function dataCapacity(version, ec) {
  const [ecLen, g1, g1d, g2, g2d] = BLOCKS[ec][version];
  return g1 * g1d + g2 * g2d;
}

/** Smallest version that fits `byteLength` bytes. */
function chooseVersion(byteLength, ec) {
  for (let v = 1; v <= 10; v++) {
    // 4 bits mode + 8 or 16 bits character count
    const headerBits = 4 + (v <= 9 ? 8 : 16);
    const capacityBits = dataCapacity(v, ec) * 8;
    if (byteLength * 8 + headerBits <= capacityBits) return v;
  }
  throw new Error(
    `Content too long for QR versions 1-10 at EC level ${ec} (${byteLength} bytes).`,
  );
}

/* ------------------------------------------------------------------ *
 * Matrix construction
 * ------------------------------------------------------------------ */

function buildMatrix(version) {
  const size = 17 + version * 4;
  // null = free, true/false = a placed module. `reserved` marks function
  // patterns so data placement skips them.
  const m = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

  const set = (r, c, v) => { m[r][c] = v; reserved[r][c] = true; };

  // Finder patterns + separators, at three corners.
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inRing =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6));
        const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        set(rr, cc, inRing || inCore);
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);

  // Timing patterns.
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  // Alignment patterns, skipping the three finder corners.
  const centres = ALIGNMENT[version];
  for (const r of centres) {
    for (const c of centres) {
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc));
          set(r + dr, c + dc, ring !== 1);
        }
      }
    }
  }

  // Dark module — always set, always at this position.
  set(size - 8, 8, true);

  // Reserve the format information areas (filled in after masking).
  for (let i = 0; i < 9; i++) {
    if (!reserved[8][i]) { m[8][i] = false; reserved[8][i] = true; }
    if (!reserved[i][8]) { m[i][8] = false; reserved[i][8] = true; }
  }
  for (let i = 0; i < 8; i++) {
    if (!reserved[8][size - 1 - i]) { m[8][size - 1 - i] = false; reserved[8][size - 1 - i] = true; }
    if (!reserved[size - 1 - i][8]) { m[size - 1 - i][8] = false; reserved[size - 1 - i][8] = true; }
  }

  // Reserve version information for version 7 and above.
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const r = Math.floor(i / 3);
      const c = size - 11 + (i % 3);
      m[r][c] = false; reserved[r][c] = true;
      m[c][r] = false; reserved[c][r] = true;
    }
  }

  return { m, reserved, size };
}

/** Place the data bit stream in the standard upward/downward zigzag. */
function placeData(m, reserved, size, bits) {
  let i = 0;
  let up = true;
  for (let right = size - 1; right > 0; right -= 2) {
    // Column 6 is the vertical timing pattern; the pairs shift left past it.
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      const row = up ? size - 1 - vert : vert;
      for (let k = 0; k < 2; k++) {
        const col = right - k;
        if (reserved[row][col]) continue;
        m[row][col] = i < bits.length ? bits[i] === 1 : false;
        i++;
      }
    }
    up = !up;
  }
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** ISO 18004 penalty scoring — lower is better. */
function penalty(m, size) {
  let score = 0;

  // Rule 1: runs of five or more same-coloured modules in a row or column.
  for (let i = 0; i < size; i++) {
    for (const line of [m[i], m.map((row) => row[i])]) {
      let run = 1;
      for (let j = 1; j < size; j++) {
        if (line[j] === line[j - 1]) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score += 1;
        } else run = 1;
      }
    }
  }

  // Rule 2: 2x2 blocks of one colour.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
    }
  }

  // Rule 3: the 1:1:3:1:1 finder-like pattern with four light modules beside it.
  const A = [true, false, true, true, true, false, true, false, false, false, false];
  const B = [false, false, false, false, true, false, true, true, true, false, true];
  const matches = (line, start, pat) => pat.every((v, k) => line[start + k] === v);
  for (let i = 0; i < size; i++) {
    const row = m[i];
    const col = m.map((r) => r[i]);
    for (const line of [row, col]) {
      for (let j = 0; j + 11 <= size; j++) {
        if (matches(line, j, A) || matches(line, j, B)) score += 40;
      }
    }
  }

  // Rule 4: deviation from a 50/50 light/dark balance.
  let dark = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (m[r][c]) dark++;
  const pct = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(pct - 50) / 5) * 10;

  return score;
}

/** BCH(15,5) format information, XORed with the standard mask. */
function formatBits(ec, mask) {
  let data = (EC_BITS[ec] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

/** BCH(18,6) version information, for version 7 and above. */
function versionBits(version) {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Encode text as a QR matrix.
 * @param {string} text
 * @param {{ec?: 'L'|'M', version?: number}} [opts]
 * @returns {{modules: boolean[][], size: number, version: number, ec: string, mask: number}}
 */
export function encodeQR(text, { ec = 'M', version = null } = {}) {
  const bytes = Array.from(new TextEncoder().encode(String(text)));
  const v = version ?? chooseVersion(bytes.length, ec);
  const [ecLen, g1, g1d, g2, g2d] = BLOCKS[ec][v];

  // --- bit stream: mode, length, payload, terminator, padding
  const bb = new BitBuffer();
  bb.put(0b0100, 4);                       // byte mode
  bb.put(bytes.length, v <= 9 ? 8 : 16);   // character count
  for (const b of bytes) bb.put(b, 8);

  const capacityBits = dataCapacity(v, ec) * 8;
  if (bb.length > capacityBits) {
    throw new Error(`Content does not fit in QR version ${v}${ec}.`);
  }
  bb.put(0, Math.min(4, capacityBits - bb.length));       // terminator
  while (bb.length % 8 !== 0) bb.put(0, 1);               // pad to a byte
  const data = bb.toBytes();
  const PAD = [0xec, 0x11];
  for (let i = 0; data.length < dataCapacity(v, ec); i++) data.push(PAD[i % 2]);

  // --- split into blocks, compute EC for each
  const blocks = [];
  let pos = 0;
  for (let i = 0; i < g1; i++) { blocks.push(data.slice(pos, pos + g1d)); pos += g1d; }
  for (let i = 0; i < g2; i++) { blocks.push(data.slice(pos, pos + g2d)); pos += g2d; }
  const ecBlocks = blocks.map((b) => ecCodewords(b, ecLen));

  // --- interleave data then EC codewords
  const finalCodewords = [];
  const maxData = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxData; i++) {
    for (const b of blocks) if (i < b.length) finalCodewords.push(b[i]);
  }
  for (let i = 0; i < ecLen; i++) {
    for (const b of ecBlocks) finalCodewords.push(b[i]);
  }

  // --- to bits, with the remainder bits some versions require
  const bits = [];
  for (const cw of finalCodewords) for (let i = 7; i >= 0; i--) bits.push((cw >>> i) & 1);
  const { m: base, reserved, size } = buildMatrix(v);
  const freeModules = reserved.flat().filter((x) => !x).length;
  while (bits.length < freeModules) bits.push(0);

  // --- try every mask, keep the lowest penalty
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const m = base.map((row) => row.slice());
    placeData(m, reserved, size, bits);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!reserved[r][c] && MASKS[mask](r, c)) m[r][c] = !m[r][c];
      }
    }
    applyFormat(m, size, ec, mask);
    if (v >= 7) applyVersion(m, size, v);
    const score = penalty(m, size);
    if (!best || score < best.score) best = { m, score, mask };
  }

  return { modules: best.m, size, version: v, ec, mask: best.mask };
}

/**
 * Write the 15-bit format information in both of its required copies.
 *
 * The spec addresses these positions as (column, row). Getting that the wrong
 * way round transposes both copies, which leaves the matrix looking perfectly
 * well-formed while every decoder reads the wrong EC level and mask and gives
 * up. `m` here is [row][column], so each coordinate pair is swapped.
 */
function applyFormat(m, size, ec, mask) {
  const bits = formatBits(ec, mask);
  const bit = (i) => ((bits >>> i) & 1) === 1;

  // Copy 1: down column 8, then left along row 8, around the top-left finder.
  for (let i = 0; i <= 5; i++) m[i][8] = bit(i);
  m[7][8] = bit(6);
  m[8][8] = bit(7);
  m[8][7] = bit(8);
  for (let i = 9; i <= 14; i++) m[8][14 - i] = bit(i);

  // Copy 2: along row 8 near the top-right finder, and up column 8 near the
  // bottom-left one.
  for (let i = 0; i <= 7; i++) m[8][size - 1 - i] = bit(i);
  for (let i = 8; i <= 14; i++) m[size - 15 + i][8] = bit(i);
}

function applyVersion(m, size, version) {
  const bits = versionBits(version);
  for (let i = 0; i < 18; i++) {
    const v = ((bits >>> i) & 1) === 1;
    const r = Math.floor(i / 3);
    const c = size - 11 + (i % 3);
    m[r][c] = v;
    m[c][r] = v;
  }
}

/**
 * Render a QR matrix as a standalone SVG string.
 * SVG so it stays crisp at any size and needs no canvas.
 */
export function qrToSVG(text, { ec = 'M', scale = 6, margin = 4, dark = '#000000', light = '#ffffff' } = {}) {
  const { modules, size } = encodeQR(text, { ec });
  const dim = (size + margin * 2) * scale;

  let path = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        path += `M${(c + margin) * scale} ${(r + margin) * scale}h${scale}v${scale}h-${scale}z`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
    `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
    `<path d="${path}" fill="${dark}"/></svg>`;
}

/** Render to a canvas element (used by the enrolment dialog). */
export function qrToCanvas(text, { ec = 'M', scale = 6, margin = 4, dark = '#000000', light = '#ffffff' } = {}) {
  const { modules, size } = encodeQR(text, { ec });
  const dim = (size + margin * 2) * scale;
  const canvas = document.createElement('canvas');
  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, dim, dim);
  ctx.fillStyle = dark;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
    }
  }
  return canvas;
}
