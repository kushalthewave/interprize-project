/**
 * SafetyProps.js
 * Fire points, signage, barriers, cones, ladders, cables, spills, flags.
 * These carry most of the "this is a real workplace" signal, and several of
 * them ARE the hazards, so their geometry is deliberately readable.
 */
import * as THREE from 'three';
import { materials, signMaterial, boxGeo, cylGeo, planeGeo, sphereGeo } from './Materials.js';
import * as T from '../../core/Textures.js';

/* ------------------------------------------------------------------ *
 * Fire point
 * ------------------------------------------------------------------ */

export function fireExtinguisher() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'fire-extinguisher';
  const body = new THREE.Mesh(cylGeo(0.085, 0.085, 0.5, 16), M.red);
  body.position.y = 0.3;
  body.castShadow = true;
  g.add(body);
  const dome = new THREE.Mesh(sphereGeo(0.085, 14), M.red);
  dome.scale.y = 0.55;
  dome.position.y = 0.55;
  g.add(dome);
  const base = new THREE.Mesh(cylGeo(0.088, 0.092, 0.05, 16), M.forkliftDark);
  base.position.y = 0.03;
  g.add(base);
  const neck = new THREE.Mesh(cylGeo(0.024, 0.024, 0.07, 10), M.forkliftSteel);
  neck.position.y = 0.61;
  g.add(neck);
  const handle = new THREE.Mesh(boxGeo(0.09, 0.02, 0.03), M.forkliftDark);
  handle.position.set(0.02, 0.65, 0);
  g.add(handle);
  // hose
  const hose = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.012, 6, 14, Math.PI * 1.3),
    M.rubber,
  );
  hose.position.set(0, 0.42, 0.04);
  hose.rotation.set(Math.PI / 2, 0, 0.4);
  g.add(hose);
  // label band
  const band = new THREE.Mesh(cylGeo(0.087, 0.087, 0.13, 16), M.paintWhite);
  band.position.y = 0.34;
  g.add(band);
  return g;
}

/** Red backboard fire point with extinguisher, sign and floor keep-clear box. */
export function firePoint({ blocked = false } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = blocked ? 'fire-point-blocked' : 'fire-point';

  const board = new THREE.Mesh(boxGeo(1.0, 1.3, 0.04), M.red);
  board.position.set(0, 0.9, 0);
  board.castShadow = true;
  g.add(board);

  const ext = fireExtinguisher();
  ext.position.set(-0.22, 0.42, 0.14);
  g.add(ext);
  const ext2 = fireExtinguisher();
  ext2.position.set(0.24, 0.42, 0.14);
  g.add(ext2);

  // bracket shelf
  const shelf = new THREE.Mesh(boxGeo(0.9, 0.03, 0.22), M.forkliftSteel);
  shelf.position.set(0, 0.4, 0.13);
  g.add(shelf);

  // high-level location sign so it can be seen over racking
  const tex = T.sign({
    key: 'fire-point',
    w: 256,
    h: 320,
    bg: '#c0182a',
    icon: 'flame',
    lines: [
      { t: 'FIRE POINT', c: '#ffffff', s: 0.11 },
      { t: 'आगो नियन्त्रण', c: '#ffe08a', s: 0.085 },
    ],
  });
  const board2 = new THREE.Mesh(planeGeo(0.55, 0.7), signMaterial(tex, { emissive: 0x220008, emissiveIntensity: 0.25 }));
  board2.position.set(0, 1.95, 0.03);
  g.add(board2);

  // yellow keep-clear hatching on the floor in front
  const keepClear = new THREE.Mesh(planeGeo(1.4, 1.0), new THREE.MeshStandardMaterial({
    map: T.hazardStripes('#f2c200', '#1a1a1a', [4, 1]),
    roughness: 0.8,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  }));
  keepClear.rotation.x = -Math.PI / 2;
  keepClear.position.set(0, 0.005, 0.72);
  keepClear.receiveShadow = true;
  g.add(keepClear);

  g.userData.blocked = blocked;
  return g;
}

/* ------------------------------------------------------------------ *
 * Signage
 * ------------------------------------------------------------------ */

/** Green running-man emergency exit sign, optionally lit. */
export function exitSign({ lit = true } = {}) {
  const tex = T.sign({
    key: 'exit',
    w: 512,
    h: 256,
    bg: '#0f8a3c',
    icon: 'running-man',
    lines: [{ t: 'EXIT  ·  निकास', c: '#ffffff', s: 0.13 }],
  });
  const m = new THREE.Mesh(
    planeGeo(0.62, 0.31),
    signMaterial(tex, { emissive: lit ? 0x0f8a3c : 0x000000, emissiveIntensity: lit ? 0.85 : 0 }),
  );
  m.name = 'exit-sign';
  return m;
}

const SIGN_PRESETS = {
  forkliftWarning: {
    key: 'w-forklift',
    w: 384, h: 448, bg: '#f2f2f0', border: '#111',
    icon: 'forklift',
    lines: [{ t: 'FORKLIFT', c: '#111', s: 0.1 }, { t: 'OPERATING AREA', c: '#111', s: 0.075 }, { t: 'फोर्कलिफ्ट क्षेत्र', c: '#444', s: 0.065 }],
  },
  ppeRequired: {
    key: 'ppe',
    w: 384, h: 448, bg: '#1250b0', border: '#0b3a80',
    icon: 'helmet', iconColor: '#ffffff',
    lines: [{ t: 'PPE MUST BE WORN', c: '#ffffff', s: 0.078 }, { t: 'हेलमेट अनिवार्य', c: '#dce8ff', s: 0.07 }],
  },
  pedestrianRoute: {
    key: 'ped',
    w: 384, h: 448, bg: '#0f8a3c',
    icon: 'running-man',
    lines: [{ t: 'PEDESTRIAN ROUTE', c: '#ffffff', s: 0.072 }, { t: 'पैदल मार्ग', c: '#d9ffe6', s: 0.07 }],
  },
  speedLimit: {
    key: 'speed',
    w: 384, h: 384, bg: '#f2f2f0', border: '#c0182a',
    lines: [{ t: '5', c: '#111', s: 0.42 }, { t: 'km/h', c: '#111', s: 0.1 }],
  },
  blindCorner: {
    key: 'blind',
    w: 384, h: 448, bg: '#f5c400', border: '#111',
    icon: 'triangle',
    lines: [{ t: 'BLIND CORNER', c: '#111', s: 0.08 }, { t: 'SOUND HORN', c: '#111', s: 0.07 }],
  },
  dockDanger: {
    key: 'dock',
    w: 384, h: 448, bg: '#f5c400', border: '#111',
    icon: 'triangle',
    lines: [{ t: 'OPEN DOCK EDGE', c: '#111', s: 0.075 }, { t: 'FALL HAZARD', c: '#111', s: 0.075 }],
  },
  siteRules: {
    key: 'rules',
    w: 512, h: 640, bg: '#f4f4f2', border: '#1250b0',
    lines: [
      { t: 'SITE SAFETY RULES', c: '#1250b0', s: 0.062 },
      { t: '1. Hi-vis at all times', c: '#222', s: 0.045 },
      { t: '2. Walk in green lanes', c: '#222', s: 0.045 },
      { t: '3. Give way to forklifts', c: '#222', s: 0.045 },
      { t: '4. Report all damage', c: '#222', s: 0.045 },
      { t: '5. Keep exits clear', c: '#222', s: 0.045 },
      { t: 'सुरक्षा पहिलो प्राथमिकता', c: '#1250b0', s: 0.05 },
    ],
  },
  companyBoard: {
    key: 'company',
    w: 640, h: 320, bg: '#12213a',
    lines: [
      { t: 'HIMALAYA LOGISTICS', c: '#f2c200', s: 0.14 },
      { t: 'Distribution Centre · Birgunj, Nepal', c: '#cfd8e8', s: 0.072 },
    ],
  },
  daysSafe: {
    key: 'days',
    w: 512, h: 384, bg: '#0f8a3c',
    lines: [
      { t: 'DAYS WITHOUT', c: '#ffffff', s: 0.085 },
      { t: 'AN ACCIDENT', c: '#ffffff', s: 0.085 },
      { t: '127', c: '#ffe08a', s: 0.24 },
    ],
  },
  firstAid: {
    key: 'firstaid',
    w: 384, h: 384, bg: '#0f8a3c',
    lines: [{ t: '+', c: '#ffffff', s: 0.55 }, { t: 'FIRST AID', c: '#ffffff', s: 0.08 }],
  },
  keepClear: {
    key: 'keepclear',
    w: 512, h: 256, bg: '#c0182a',
    lines: [{ t: 'FIRE EXIT', c: '#fff', s: 0.15 }, { t: 'KEEP CLEAR', c: '#fff', s: 0.15 }],
  },
  assemblyPoint: {
    key: 'assembly',
    w: 384, h: 448, bg: '#0f8a3c',
    icon: 'running-man',
    lines: [{ t: 'ASSEMBLY POINT', c: '#ffffff', s: 0.072 }],
  },
};

/**
 * A wall/post mounted safety sign.
 * @param {keyof SIGN_PRESETS} preset
 */
export function safetySign(preset, { width = 0.5 } = {}) {
  const cfg = SIGN_PRESETS[preset];
  if (!cfg) throw new Error(`Unknown sign preset: ${preset}`);
  const tex = T.sign(cfg);
  const aspect = cfg.h / cfg.w;
  const g = new THREE.Group();
  g.name = `sign-${preset}`;
  const face = new THREE.Mesh(planeGeo(width, width * aspect), signMaterial(tex));
  g.add(face);
  const backing = new THREE.Mesh(boxGeo(width + 0.02, width * aspect + 0.02, 0.012), materials().forkliftSteel);
  backing.position.z = -0.009;
  g.add(backing);
  return g;
}

/** Free-standing sign on a post, for aisle ends. */
export function signPost(preset, { height = 2.0, width = 0.5 } = {}) {
  const M = materials();
  const g = new THREE.Group();
  const post = new THREE.Mesh(cylGeo(0.035, 0.035, height, 10), M.forkliftSteel);
  post.position.y = height / 2;
  post.castShadow = true;
  g.add(post);
  const base = new THREE.Mesh(cylGeo(0.2, 0.24, 0.05, 14), M.forkliftDark);
  base.position.y = 0.025;
  g.add(base);
  const s = safetySign(preset, { width });
  s.position.y = height - 0.34;
  s.position.z = 0.02;
  g.add(s);
  return g;
}

/** Nepal flag on a wall-mounted pole - national identity without kitsch. */
export function nepalFlag({ scale = 1 } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'nepal-flag';
  const pole = new THREE.Mesh(cylGeo(0.022, 0.022, 1.5 * scale, 10), M.forkliftSteel);
  pole.rotation.z = -0.42;
  pole.position.set(0.3 * scale, 0.28 * scale, 0);
  g.add(pole);
  const cloth = new THREE.Mesh(
    planeGeo(0.52 * scale, 0.68 * scale),
    signMaterial(T.nepalFlagTexture(), { emissive: 0x111111, emissiveIntensity: 0.12 }),
  );
  cloth.position.set(0.72 * scale, 0.5 * scale, 0.01);
  g.add(cloth);
  g.userData.cloth = cloth;
  g.userData.dynamic = true;
  return g;
}

/* ------------------------------------------------------------------ *
 * Barriers, cones, mirrors
 * ------------------------------------------------------------------ */

export function safetyBarrier({ length = 2.4, height = 1.1 } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'barrier';
  for (const x of [-length / 2, length / 2]) {
    const post = new THREE.Mesh(boxGeo(0.11, height, 0.11), M.barrier);
    post.position.set(x, height / 2, 0);
    post.castShadow = true;
    g.add(post);
    const foot = new THREE.Mesh(boxGeo(0.26, 0.02, 0.26), M.forkliftSteel);
    foot.position.set(x, 0.01, 0);
    g.add(foot);
  }
  for (const y of [height * 0.42, height * 0.86]) {
    const rail = new THREE.Mesh(boxGeo(length, 0.11, 0.06), M.barrier);
    rail.position.set(0, y, 0);
    rail.castShadow = true;
    g.add(rail);
  }
  return g;
}

export function trafficCone({ h = 0.62 } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'cone';
  const base = new THREE.Mesh(boxGeo(0.34, 0.03, 0.34), M.forkliftDark);
  base.position.y = 0.015;
  base.receiveShadow = true;
  g.add(base);
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.15, h, 14, 1, true), M.cone);
  body.position.y = h / 2 + 0.02;
  body.castShadow = true;
  body.material = M.cone.clone();
  body.material.side = THREE.DoubleSide;
  g.add(body);
  const band = new THREE.Mesh(cylGeo(0.108, 0.126, 0.09, 14), M.paintWhite);
  band.position.y = h * 0.55;
  g.add(band);
  return g;
}

/** Wet-floor A-board. Used as the CONTROL next to managed spills. */
export function wetFloorSign() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'wet-floor-sign';
  const tex = T.sign({
    key: 'wetfloor',
    w: 256, h: 384, bg: '#f2c200', icon: 'triangle',
    lines: [{ t: 'CAUTION', c: '#111', s: 0.08 }, { t: 'WET FLOOR', c: '#111', s: 0.075 }],
  });
  for (const s of [1, -1]) {
    const panel = new THREE.Mesh(planeGeo(0.32, 0.52), signMaterial(tex));
    panel.position.set(0, 0.3, s * 0.09);
    panel.rotation.x = s * 0.18;
    panel.rotation.y = s > 0 ? 0 : Math.PI;
    g.add(panel);
  }
  return g;
}

/** Convex mirror - the CONTROL that is missing at the hazard blind corner. */
export function convexMirror({ height = 2.4 } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'convex-mirror';
  const arm = new THREE.Mesh(cylGeo(0.03, 0.03, 0.5, 8), M.forkliftDark);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.25, height, 0);
  g.add(arm);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 8, 24), M.cone);
  rim.position.set(0.55, height, 0);
  g.add(rim);
  const face = new THREE.Mesh(sphereGeo(0.36, 18), new THREE.MeshStandardMaterial({
    color: 0xd8e2e8, roughness: 0.08, metalness: 0.95,
  }));
  face.scale.z = 0.35;
  face.position.set(0.55, height, 0.02);
  g.add(face);
  return g;
}

/* ------------------------------------------------------------------ *
 * Hazard-specific props
 * ------------------------------------------------------------------ */

/** HAZARD: a leaning ladder at an unsafe angle, unfooted and untied. */
export function ladder({ length = 3.6, unsafe = false } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = unsafe ? 'ladder-unsafe' : 'ladder';
  const rails = [];
  for (const x of [-0.22, 0.22]) {
    const rail = new THREE.Mesh(boxGeo(0.055, length, 0.035), M.wood);
    rail.position.set(x, length / 2, 0);
    rail.castShadow = true;
    g.add(rail);
    rails.push(rail);
  }
  const rungs = Math.floor(length / 0.28);
  for (let i = 1; i < rungs; i++) {
    const r = new THREE.Mesh(cylGeo(0.018, 0.018, 0.44, 8), M.wood);
    r.rotation.z = Math.PI / 2;
    r.position.set(0, i * 0.28, 0);
    r.castShadow = true;
    g.add(r);
  }
  // rubber feet - present but on a smooth floor with no footing
  for (const x of [-0.22, 0.22]) {
    const f = new THREE.Mesh(boxGeo(0.07, 0.03, 0.07), M.rubber);
    f.position.set(x, 0.015, 0);
    g.add(f);
  }
  // 1-in-4 rule = about 75 degrees. Unsafe version is set at ~55 degrees.
  g.rotation.x = unsafe ? -(Math.PI / 2 - 0.96) : -(Math.PI / 2 - 1.31);
  g.userData.unsafe = unsafe;
  g.userData.length = length;
  return g;
}

/** HAZARD: damaged trailing extension lead across the floor. */
export function trailingCable({ points = null, damaged = true } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'trailing-cable';

  const pts =
    points ??
    [
      new THREE.Vector3(0, 0.02, 0),
      new THREE.Vector3(1.2, 0.03, 0.5),
      new THREE.Vector3(2.6, 0.02, -0.3),
      new THREE.Vector3(4.1, 0.035, 0.7),
      new THREE.Vector3(5.4, 0.02, 0.2),
    ];
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 64, 0.016, 8, false),
    M.cable,
  );
  tube.castShadow = true;
  g.add(tube);

  if (damaged) {
    // taped repair with exposed conductor showing through
    const t = 0.45;
    const p = curve.getPointAt(t);
    const tape = new THREE.Mesh(cylGeo(0.026, 0.026, 0.1, 10), M.paintWhite);
    const tangent = curve.getTangentAt(t);
    tape.position.copy(p);
    tape.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent.normalize());
    g.add(tape);
    const bare = new THREE.Mesh(cylGeo(0.019, 0.019, 0.05, 8), M.cableBare);
    const p2 = curve.getPointAt(t + 0.06);
    bare.position.copy(p2);
    bare.quaternion.copy(tape.quaternion);
    g.add(bare);
    g.userData.bare = bare;
  }

  // 13A plug and a socket box at the start
  const plug = new THREE.Mesh(boxGeo(0.09, 0.06, 0.11), M.forkliftDark);
  plug.position.copy(pts[0]).add(new THREE.Vector3(-0.06, 0.02, 0));
  g.add(plug);

  g.userData.curve = curve;
  return g;
}

/** Wall socket / distribution box. */
export function socketBox() {
  const M = materials();
  const g = new THREE.Group();
  const box = new THREE.Mesh(boxGeo(0.24, 0.3, 0.12), M.paintWhite);
  box.castShadow = true;
  g.add(box);
  const lid = new THREE.Mesh(boxGeo(0.2, 0.24, 0.02), M.yellow);
  lid.position.z = 0.07;
  g.add(lid);
  const warn = new THREE.Mesh(
    planeGeo(0.14, 0.14),
    signMaterial(T.sign({ key: 'elec', w: 256, h: 256, bg: '#f5c400', icon: 'triangle', lines: [] })),
  );
  warn.position.z = 0.082;
  g.add(warn);
  return g;
}

/** HAZARD: unmarked oil/water spill decal laid on the floor. */
export function spill({ size = 2.2 } = {}) {
  const M = materials();
  const m = new THREE.Mesh(planeGeo(size, size * 0.8), M.spill);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.008;
  m.name = 'spill';
  m.renderOrder = 2;
  return m;
}

/** A leaking drum - gives the spill a plausible source. */
export function oilDrum({ leaking = false, color = 0x2f6fd0 } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'oil-drum';
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.5 });
  const body = new THREE.Mesh(cylGeo(0.29, 0.29, 0.88, 20), mat);
  body.position.y = 0.44;
  body.castShadow = true;
  g.add(body);
  for (const y of [0.28, 0.6]) {
    const rib = new THREE.Mesh(cylGeo(0.302, 0.302, 0.05, 20), mat);
    rib.position.y = y;
    g.add(rib);
  }
  const lid = new THREE.Mesh(cylGeo(0.3, 0.3, 0.03, 20), M.forkliftSteel);
  lid.position.y = 0.885;
  g.add(lid);
  if (leaking) {
    const stain = new THREE.Mesh(planeGeo(1.0, 0.9), M.spill);
    stain.rotation.x = -Math.PI / 2;
    stain.position.set(0.2, 0.007, 0.25);
    g.add(stain);
    const drip = new THREE.Mesh(cylGeo(0.012, 0.012, 0.3, 6), M.rubber);
    drip.position.set(0.28, 0.18, 0.06);
    g.add(drip);
  }
  return g;
}

/** Broom, bucket, shelving clutter - the small stuff that sells a workplace. */
export function clutterProps() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'clutter';
  return g;
}

export function bucket() {
  const M = materials();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.28, 14, 1, true), M.yellow);
  m.material = M.yellow.clone();
  m.material.side = THREE.DoubleSide;
  m.position.y = 0.14;
  m.castShadow = true;
  return m;
}

export function broom() {
  const M = materials();
  const g = new THREE.Group();
  const handle = new THREE.Mesh(cylGeo(0.016, 0.016, 1.35, 8), M.wood);
  handle.position.y = 0.7;
  handle.rotation.z = 0.14;
  g.add(handle);
  const head = new THREE.Mesh(boxGeo(0.42, 0.06, 0.09), M.forkliftDark);
  head.position.set(-0.1, 0.05, 0);
  g.add(head);
  const bristles = new THREE.Mesh(boxGeo(0.42, 0.09, 0.07), M.cone);
  bristles.position.set(-0.1, 0.01, 0);
  g.add(bristles);
  return g;
}
