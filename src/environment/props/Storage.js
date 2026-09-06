/**
 * Storage.js
 * Racking, pallets, cartons and stacks.
 *
 * All dimensions are metres and modelled on real APR (adjustable pallet
 * racking) proportions so the space reads at the right scale:
 *   - upright frame depth 1.1m, bay width 2.7m, beam levels every ~1.8m
 *   - Euro pallet 1.2 x 0.8 x 0.144m
 */
import * as THREE from 'three';
import { materials, boxGeo, cylGeo, planeGeo } from './Materials.js';
import * as T from '../../core/Textures.js';

const rnd = (() => {
  let a = 1337;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();

/* ------------------------------------------------------------------ *
 * Pallets
 * ------------------------------------------------------------------ */

/**
 * A wooden pallet. `broken:true` snaps deck boards and splits a bearer so
 * the damage is readable from a few metres away (hazard: broken-pallet).
 */
export function pallet({ broken = false } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = broken ? 'pallet-broken' : 'pallet';
  const W = 1.2;
  const D = 0.8;
  const boardT = 0.022;
  const bearerH = 0.1;

  const mat = broken ? M.woodBroken : M.wood;

  // three bearers running along X
  for (let i = 0; i < 3; i++) {
    const z = -D / 2 + 0.06 + i * (D / 2 - 0.06);
    const bw = broken && i === 1 ? W * 0.42 : W;
    const bx = broken && i === 1 ? -W * 0.28 : 0;
    const b = new THREE.Mesh(boxGeo(bw, bearerH, 0.1), mat);
    b.position.set(bx, boardT + bearerH / 2, z);
    b.castShadow = b.receiveShadow = true;
    g.add(b);
    if (broken && i === 1) {
      // splintered off-cut lying at an angle
      const s = new THREE.Mesh(boxGeo(W * 0.4, bearerH, 0.1), mat);
      s.position.set(W * 0.3, boardT + bearerH / 2 - 0.02, z + 0.03);
      s.rotation.z = -0.22;
      s.castShadow = true;
      g.add(s);
    }
  }
  // bottom deck boards
  for (let i = 0; i < 3; i++) {
    const z = -D / 2 + 0.06 + i * (D / 2 - 0.06);
    const b = new THREE.Mesh(boxGeo(W, boardT, 0.12), mat);
    b.position.set(0, boardT / 2, z);
    b.receiveShadow = true;
    g.add(b);
  }
  // top deck boards running along Z
  const nTop = 6;
  for (let i = 0; i < nTop; i++) {
    const x = -W / 2 + 0.07 + (i * (W - 0.14)) / (nTop - 1);
    // broken pallet is missing board 2 and has board 4 cracked/lifted
    if (broken && i === 2) continue;
    const b = new THREE.Mesh(boxGeo(0.11, boardT, D), mat);
    b.position.set(x, boardT + bearerH + boardT / 2, 0);
    if (broken && i === 4) {
      b.rotation.x = 0.18;
      b.position.y += 0.03;
    }
    b.castShadow = b.receiveShadow = true;
    g.add(b);
  }

  if (broken) {
    // a protruding nail to sell the damage
    const nail = new THREE.Mesh(cylGeo(0.006, 0.006, 0.09, 6), materials().forkliftSteel);
    nail.position.set(-W / 2 + 0.07 + (2 * (W - 0.14)) / (nTop - 1), 0.2, 0.18);
    g.add(nail);
    g.userData.damaged = true;
  }

  g.userData.height = boardT + bearerH + boardT;
  return g;
}

/* ------------------------------------------------------------------ *
 * Cartons
 * ------------------------------------------------------------------ */

export function carton(w = 0.42, h = 0.36, d = 0.34, variant = null) {
  const M = materials();
  const mat = M.box[(variant ?? Math.floor(rnd() * 4)) % 4];
  const m = new THREE.Mesh(boxGeo(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  m.name = 'carton';
  return m;
}

/**
 * A tidy, correctly-built pallet load: boxes square, inside the footprint,
 * optionally shrink-wrapped. This is the visual "control" that makes the
 * unstable stacks read as wrong.
 */
export function palletLoad({ rows = 3, wrapped = false, seed = 0 } = {}) {
  const g = new THREE.Group();
  g.name = 'pallet-load';
  const p = pallet();
  g.add(p);
  const base = p.userData.height;

  const bw = 0.38;
  const bh = 0.33;
  const bd = 0.38;
  const cols = 3;
  const depth = 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (let dpt = 0; dpt < depth; dpt++) {
        const b = carton(bw, bh, bd, (seed + r + c + dpt) % 4);
        b.position.set(
          -0.4 + c * (bw + 0.01),
          base + bh / 2 + r * bh,
          -0.19 + dpt * (bd + 0.005),
        );
        // brick-bond the layers a touch so it does not look extruded
        if (r % 2 === 1) b.rotation.y = Math.PI / 2;
        g.add(b);
      }
    }
  }

  if (wrapped) {
    const M = materials();
    const h = rows * bh;
    const wrap = new THREE.Mesh(
      new THREE.BoxGeometry(1.16, h + 0.02, 0.82),
      M.wrap,
    );
    wrap.position.set(-0.02, base + h / 2, 0);
    g.add(wrap);
  }

  g.userData.loadHeight = base + rows * bh;
  return g;
}

/**
 * HAZARD GEOMETRY: an unstable pallet load.
 * Most boxes are stacked correctly; the top course is displaced, one carton
 * is tilted and one overhangs the beam edge, ready to fall. The overhanging
 * carton is returned in userData.fallingBox so the hazard system can animate
 * it (see hazards/HazardBehaviours.js).
 */
export function unstableLoad({ seed = 3 } = {}) {
  const g = new THREE.Group();
  g.name = 'unstable-load';
  const p = pallet();
  g.add(p);
  const base = p.userData.height;

  const bw = 0.38;
  const bh = 0.33;
  const bd = 0.38;

  // two tidy bottom courses so the top one reads as the anomaly
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      for (let d = 0; d < 2; d++) {
        const b = carton(bw, bh, bd, (seed + r + c) % 4);
        b.position.set(-0.4 + c * (bw + 0.01), base + bh / 2 + r * bh, -0.19 + d * (bd + 0.005));
        g.add(b);
      }
    }
  }

  const topY = base + bh * 2 + bh / 2;

  // displaced carton - shoved sideways and rotated
  const displaced = carton(bw, bh, bd, 1);
  displaced.position.set(-0.30, topY, 0.06);
  displaced.rotation.y = 0.42;
  g.add(displaced);

  // tilted carton resting on the corner of the one below
  const tilted = carton(bw, bh, bd, 2);
  tilted.position.set(0.06, topY + 0.09, -0.16);
  tilted.rotation.set(0.0, 0.15, -0.34);
  g.add(tilted);

  // the one that is going over the edge
  const falling = carton(bw, bh, bd, 0);
  falling.position.set(0.52, topY + 0.02, 0.1);
  falling.rotation.set(0.1, -0.25, 0.24);
  g.add(falling);

  g.userData.fallingBox = falling;
  g.userData.tiltedBox = tilted;
  g.userData.loadHeight = topY + bh;
  return g;
}

/**
 * HAZARD GEOMETRY: an over-height free-standing block stack.
 * Narrow base, far too tall, leaning. Compare against blockStack().
 */
export function overloadedStack() {
  const g = new THREE.Group();
  g.name = 'overloaded-stack';
  const p = pallet();
  g.add(p);
  const base = p.userData.height;
  const bh = 0.34;
  const levels = 9;

  for (let r = 0; r < levels; r++) {
    // base is only 2x1 boxes wide - far too narrow for the height
    const n = r < 2 ? 2 : 2;
    for (let c = 0; c < n; c++) {
      const b = carton(0.44, bh, 0.44, (r + c) % 4);
      const lean = (r / levels) ** 1.6;
      b.position.set(
        -0.22 + c * 0.45 + lean * 0.34,
        base + bh / 2 + r * bh,
        lean * 0.16 + (rnd() - 0.5) * 0.03,
      );
      b.rotation.set(lean * 0.05, (rnd() - 0.5) * 0.12, -lean * 0.13);
      g.add(b);
    }
  }
  g.userData.loadHeight = base + levels * bh;
  return g;
}

/** A safe free-standing block stack - wide base, low, square. */
export function blockStack({ rows = 3, cols = 3, levels = 3, seed = 1 } = {}) {
  const g = new THREE.Group();
  g.name = 'block-stack';
  const bw = 0.44;
  const bh = 0.34;
  for (let l = 0; l < levels; l++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const b = carton(bw, bh, bw, (seed + l + r + c) % 4);
        b.position.set(
          (c - (cols - 1) / 2) * (bw + 0.02),
          bh / 2 + l * bh,
          (r - (rows - 1) / 2) * (bw + 0.02),
        );
        g.add(b);
      }
    }
  }
  g.userData.loadHeight = levels * bh;
  return g;
}

/* ------------------------------------------------------------------ *
 * Racking
 * ------------------------------------------------------------------ */

/**
 * A run of adjustable pallet racking.
 *
 * @param {object} o
 * @param {number} o.bays       number of 2.7m bays
 * @param {number} o.levels     number of beam levels above floor level
 * @param {boolean} o.doubleSided back-to-back run (adds a second depth)
 * @param {number} o.damagedBay index of a bay whose upright is impact-damaged
 *                              (-1 for none) -> hazard: damaged-rack
 */
export function racking({
  bays = 4,
  levels = 3,
  bayWidth = 2.7,
  depth = 1.1,
  levelHeight = 1.85,
  doubleSided = false,
  damagedBay = -1,
} = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'racking';

  const height = levels * levelHeight + 0.45;
  const frameCount = bays + 1;
  const totalW = bays * bayWidth;
  const rows = doubleSided ? 2 : 1;

  for (let row = 0; row < rows; row++) {
    const zOff = doubleSided ? (row === 0 ? -depth / 2 - 0.05 : depth / 2 + 0.05) : 0;

    for (let f = 0; f < frameCount; f++) {
      const x = -totalW / 2 + f * bayWidth;
      const isDamaged =
        damagedBay >= 0 && row === 0 && (f === damagedBay || f === damagedBay + 1);
      const frame = rackFrame({
        height,
        depth,
        damaged: isDamaged,
        lean: isDamaged ? (f === damagedBay ? 0.055 : 0.03) : 0,
      });
      frame.position.set(x, 0, zOff);
      g.add(frame);
    }

    // beams
    for (let l = 1; l <= levels; l++) {
      const y = l * levelHeight;
      for (let b = 0; b < bays; b++) {
        const x = -totalW / 2 + b * bayWidth + bayWidth / 2;
        for (const z of [-depth / 2 + 0.06, depth / 2 - 0.06]) {
          const beam = new THREE.Mesh(boxGeo(bayWidth - 0.09, 0.12, 0.05), M.rackBeam);
          beam.position.set(x, y, z + zOff);
          beam.castShadow = true;
          beam.receiveShadow = true;
          if (damagedBay >= 0 && row === 0 && b === damagedBay) {
            beam.rotation.z = -0.02;
            beam.position.y -= 0.03;
          }
          g.add(beam);
        }
        // deck bars across the bay
        for (let k = 0; k < 3; k++) {
          const bar = new THREE.Mesh(boxGeo(bayWidth - 0.12, 0.03, 0.04), M.mesh);
          bar.position.set(x, y + 0.07, -depth / 2 + 0.28 + k * (depth / 2 - 0.28 + 0.02) + zOff);
          bar.receiveShadow = true;
          g.add(bar);
        }
      }
    }
  }

  g.userData.bayWidth = bayWidth;
  g.userData.levelHeight = levelHeight;
  g.userData.bays = bays;
  g.userData.levels = levels;
  g.userData.height = height;
  g.userData.totalWidth = totalW;

  /** Helper for scenes: world-local position of a bay/level slot. */
  g.userData.slot = (bay, level, side = 0) => {
    const x = -totalW / 2 + bay * bayWidth + bayWidth / 2;
    const y = level * levelHeight + 0.09;
    const z = doubleSided ? (side === 0 ? -depth / 2 - 0.05 : depth / 2 + 0.05) : 0;
    return new THREE.Vector3(x, y, z);
  };

  return g;
}

/** A single upright frame with diagonal bracing. */
function rackFrame({ height, depth, damaged = false, lean = 0 }) {
  const M = materials();
  const g = new THREE.Group();
  const mat = damaged ? M.rackDamaged : M.rackUpright;
  const post = 0.09;

  for (const z of [-depth / 2, depth / 2]) {
    const p = new THREE.Mesh(boxGeo(post, height, post), mat);
    p.position.set(0, height / 2, z);
    p.castShadow = true;
    p.receiveShadow = true;
    if (damaged) {
      // bow the post: shift the top and add a visible kink section
      p.rotation.x = lean * (z < 0 ? 1 : 0.7);
      const kink = new THREE.Mesh(boxGeo(post * 1.15, 0.34, post * 0.65), mat);
      kink.position.set(0, 0.55, z + 0.02);
      kink.rotation.x = 0.28;
      kink.castShadow = true;
      g.add(kink);
    }
    g.add(p);
  }

  // horizontal + diagonal bracing between the two posts
  const braceCount = Math.max(3, Math.round(height / 0.9));
  for (let i = 0; i < braceCount; i++) {
    const y = 0.35 + (i * (height - 0.6)) / braceCount;
    const h = new THREE.Mesh(boxGeo(0.05, 0.05, depth), mat);
    h.position.set(0, y, 0);
    g.add(h);
    if (i < braceCount - 1) {
      const len = Math.hypot(depth, (height - 0.6) / braceCount);
      const d = new THREE.Mesh(boxGeo(0.04, 0.04, len), mat);
      d.position.set(0, y + (height - 0.6) / braceCount / 2, 0);
      d.rotation.x = (i % 2 === 0 ? 1 : -1) * Math.atan2((height - 0.6) / braceCount, depth);
      if (damaged && i === 0) d.rotation.z = 0.25; // buckled brace
      g.add(d);
    }
  }

  // base footplates
  for (const z of [-depth / 2, depth / 2]) {
    const fp = new THREE.Mesh(boxGeo(0.2, 0.02, 0.16), M.forkliftSteel);
    fp.position.set(0, 0.01, z);
    fp.receiveShadow = true;
    g.add(fp);
  }

  // column guard at floor level (present on healthy frames, absent/mangled on the damaged one)
  if (!damaged) {
    const guard = new THREE.Mesh(boxGeo(0.16, 0.4, depth + 0.18), M.barrier);
    guard.position.set(0, 0.2, 0);
    guard.castShadow = true;
    g.add(guard);
  } else {
    const guard = new THREE.Mesh(boxGeo(0.16, 0.34, depth * 0.6), M.barrier);
    guard.position.set(0.08, 0.16, -0.1);
    guard.rotation.set(0.3, 0.2, 0.4);
    g.add(guard);
  }

  return g;
}

/** Small warning label mesh that can be pinned to damaged racking. */
export function rackInspectionTag(status = 'red') {
  const M = materials();
  const colors = { green: M.green, amber: M.yellow, red: M.red };
  const m = new THREE.Mesh(planeGeo(0.18, 0.26), colors[status] ?? M.red);
  m.name = 'rack-tag';
  return m;
}
