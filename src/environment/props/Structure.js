/**
 * Structure.js
 * The warehouse building shell: slab, cladding, portal frame, roof, high-bay
 * lighting, dock doors, personnel doors and painted floor markings.
 *
 * All builders return a THREE.Group and push their solid colliders into the
 * supplied `colliders` array (axis-aligned boxes) so the player controller can
 * resolve collisions without a physics engine.
 */
import * as THREE from 'three';
import { materials, signMaterial, boxGeo, cylGeo, planeGeo } from './Materials.js';
import * as T from '../../core/Textures.js';
import { exitSign, safetySign } from './SafetyProps.js';

/** Register an axis-aligned collider box in world space. */
export function addCollider(colliders, cx, cz, halfX, halfZ, height = 3) {
  colliders.push({ cx, cz, hx: halfX, hz: halfZ, h: height });
}

/**
 * Build the shell.
 * @param {object} o
 * @param {number} o.width   X extent (metres)
 * @param {number} o.depth   Z extent (metres)
 * @param {number} o.height  eaves height
 */
export function warehouseShell({
  width = 60,
  depth = 44,
  height = 9.5,
  colliders = [],
  wallColor = '#8f989f',
} = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'shell';

  /* ---- floor slab ---- */
  const floorMat = M.floor.clone();
  floorMat.map = M.floor.map.clone();
  floorMat.map.repeat.set(width / 2.5, depth / 2.5);
  floorMat.map.needsUpdate = true;
  if (M.floor.roughnessMap) {
    floorMat.roughnessMap = M.floor.roughnessMap.clone();
    floorMat.roughnessMap.repeat.set(width / 2.5, depth / 2.5);
    floorMat.roughnessMap.needsUpdate = true;
  }
  const floor = new THREE.Mesh(planeGeo(width, depth), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'floor';
  g.add(floor);

  /* ---- walls ---- */
  const wallMat = M.wall.clone();
  wallMat.map = M.wall.map.clone();
  wallMat.map.repeat.set(width / 4, height / 3);
  wallMat.map.needsUpdate = true;
  wallMat.color = new THREE.Color(wallColor);

  const sideMat = wallMat.clone();
  sideMat.map = M.wall.map.clone();
  sideMat.map.repeat.set(depth / 4, height / 3);
  sideMat.map.needsUpdate = true;

  const mk = (w, h, pos, rotY, mat) => {
    const m = new THREE.Mesh(planeGeo(w, h), mat);
    m.position.copy(pos);
    m.rotation.y = rotY;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  mk(width, height, new THREE.Vector3(0, height / 2, -depth / 2), 0, wallMat);
  mk(width, height, new THREE.Vector3(0, height / 2, depth / 2), Math.PI, wallMat);
  mk(depth, height, new THREE.Vector3(-width / 2, height / 2, 0), Math.PI / 2, sideMat);
  mk(depth, height, new THREE.Vector3(width / 2, height / 2, 0), -Math.PI / 2, sideMat);

  // dado band - the darker painted lower 1.2m you see in real warehouses
  const dadoMat = new THREE.MeshStandardMaterial({ color: 0x39424a, roughness: 0.8 });
  for (const [w, pos, ry] of [
    [width, new THREE.Vector3(0, 0.6, -depth / 2 + 0.02), 0],
    [width, new THREE.Vector3(0, 0.6, depth / 2 - 0.02), Math.PI],
    [depth, new THREE.Vector3(-width / 2 + 0.02, 0.6, 0), Math.PI / 2],
    [depth, new THREE.Vector3(width / 2 - 0.02, 0.6, 0), -Math.PI / 2],
  ]) {
    const m = new THREE.Mesh(planeGeo(w, 1.2), dadoMat);
    m.position.copy(pos);
    m.rotation.y = ry;
    g.add(m);
  }

  // wall colliders (thick so the player cannot tunnel through at speed)
  addCollider(colliders, 0, -depth / 2 - 0.5, width / 2 + 1, 1, height);
  addCollider(colliders, 0, depth / 2 + 0.5, width / 2 + 1, 1, height);
  addCollider(colliders, -width / 2 - 0.5, 0, 1, depth / 2 + 1, height);
  addCollider(colliders, width / 2 + 0.5, 0, 1, depth / 2 + 1, height);

  /* ---- portal frame + roof ---- */
  const roof = new THREE.Mesh(planeGeo(width, depth), M.ceiling);
  roof.rotation.x = Math.PI / 2;
  roof.position.y = height + 1.6;
  g.add(roof);

  const bays = Math.max(3, Math.round(width / 8));
  for (let i = 0; i <= bays; i++) {
    const x = -width / 2 + (i * width) / bays;
    // columns
    for (const z of [-depth / 2 + 0.3, depth / 2 - 0.3]) {
      const col = new THREE.Mesh(boxGeo(0.34, height, 0.34), M.steelDeck);
      col.position.set(x, height / 2, z);
      col.castShadow = true;
      g.add(col);
    }
    // rafter / truss
    const truss = new THREE.Group();
    const span = depth - 0.6;
    const top = new THREE.Mesh(boxGeo(0.18, 0.14, span), M.steelDeck);
    top.position.set(x, height + 1.3, 0);
    truss.add(top);
    const bot = new THREE.Mesh(boxGeo(0.18, 0.14, span), M.steelDeck);
    bot.position.set(x, height + 0.2, 0);
    truss.add(bot);
    const nWeb = Math.round(span / 2.4);
    for (let k = 0; k <= nWeb; k++) {
      const z = -span / 2 + (k * span) / nWeb;
      const web = new THREE.Mesh(boxGeo(0.1, 1.2, 0.09), M.steelDeck);
      web.position.set(x, height + 0.75, z);
      truss.add(web);
      if (k < nWeb) {
        const dz = span / nWeb;
        const len = Math.hypot(dz, 1.1);
        const d = new THREE.Mesh(boxGeo(0.08, 0.08, len), M.steelDeck);
        d.position.set(x, height + 0.75, z + dz / 2);
        d.rotation.x = Math.atan2(1.1, dz) * (k % 2 === 0 ? 1 : -1);
        truss.add(d);
      }
    }
    g.add(truss);
  }
  // purlins across the roof
  const purlins = Math.round(depth / 3);
  for (let i = 0; i <= purlins; i++) {
    const z = -depth / 2 + (i * depth) / purlins;
    const p = new THREE.Mesh(boxGeo(width, 0.1, 0.12), M.steelDeck);
    p.position.set(0, height + 1.45, z);
    g.add(p);
  }

  g.userData.width = width;
  g.userData.depth = depth;
  g.userData.height = height;
  return g;
}

/* ------------------------------------------------------------------ *
 * Lighting
 * ------------------------------------------------------------------ */

/**
 * High-bay lighting rig. Real high-bays are on a grid; using a small number
 * of shadow-casting lights plus many cheap emissive fixtures keeps the frame
 * budget sane while still looking like an industrial ceiling.
 */
export function lighting({
  width = 60,
  depth = 44,
  height = 9.5,
  ambientIntensity = 0.6,
  fogDensity = 0.01,
  scene,
} = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'lighting';

  if (scene) {
    scene.fog = new THREE.FogExp2(0x2b3138, fogDensity);
    scene.background = new THREE.Color(0x141a20);
  }

  const hemi = new THREE.HemisphereLight(0xbcd2e8, 0x50483c, ambientIntensity * 0.85);
  hemi.position.set(0, height, 0);
  g.add(hemi);

  const amb = new THREE.AmbientLight(0xdfe8f0, ambientIntensity * 0.42);
  g.add(amb);

  // One shadow-casting key light approximating daylight through roof lights.
  const key = new THREE.DirectionalLight(0xfff2dd, 1.15);
  key.position.set(width * 0.28, height + 9, -depth * 0.24);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const s = Math.max(width, depth) * 0.62;
  key.shadow.camera.left = -s;
  key.shadow.camera.right = s;
  key.shadow.camera.top = s;
  key.shadow.camera.bottom = -s;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = height + 60;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.025;
  g.add(key);
  g.add(key.target);

  // High-bay fixtures on a grid
  const cols = Math.max(2, Math.round(width / 11));
  const rows = Math.max(2, Math.round(depth / 11));
  const lampY = height - 0.9;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = -width / 2 + (width / cols) * (i + 0.5);
      const z = -depth / 2 + (depth / rows) * (j + 0.5);

      const housing = new THREE.Mesh(cylGeo(0.34, 0.2, 0.26, 12), M.lampHousing);
      housing.position.set(x, lampY, z);
      g.add(housing);
      const lens = new THREE.Mesh(cylGeo(0.2, 0.2, 0.03, 12), M.lampLens);
      lens.position.set(x, lampY - 0.14, z);
      g.add(lens);
      const stem = new THREE.Mesh(cylGeo(0.03, 0.03, 0.9, 6), M.steelDeck);
      stem.position.set(x, lampY + 0.55, z);
      g.add(stem);

      // Only the central fixtures get a real light source; the rest are
      // emissive geometry contributing via ambient. This is the single
      // biggest perf lever in the scene.
      const isKeyLamp = (i + j) % 2 === 0;
      if (isKeyLamp) {
        const pl = new THREE.PointLight(0xfff0d6, 26 * ambientIntensity, 20, 2);
        pl.position.set(x, lampY - 0.3, z);
        g.add(pl);
      }
    }
  }

  // Roof-light panels: bright strips that read as daylight from below
  for (let j = 0; j < rows; j++) {
    const z = -depth / 2 + (depth / rows) * (j + 0.5);
    const panel = new THREE.Mesh(
      planeGeo(width * 0.5, 1.6),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xdfeaf5,
        emissiveIntensity: 1.5,
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    );
    panel.rotation.x = Math.PI / 2;
    panel.position.set(0, height + 1.55, z);
    g.add(panel);
  }

  g.userData.setAmbient = (v) => {
    hemi.intensity = v * 0.85;
    amb.intensity = v * 0.42;
    key.intensity = 0.6 + v * 0.9;
    g.traverse((o) => {
      if (o.isPointLight) o.intensity = 26 * v;
    });
  };

  return g;
}

/* ------------------------------------------------------------------ *
 * Floor markings
 * ------------------------------------------------------------------ */

/**
 * Painted pedestrian walkway: a green lane with white edge lines.
 * Returns the group AND records the lane rect so gameplay can test whether
 * something is standing in it (used by the blocked-walkway hazard check).
 */
export function walkway({ from, to, width = 1.5 }) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'walkway';
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);

  const lane = new THREE.Mesh(planeGeo(width, len), M.paintGreen);
  lane.rotation.x = -Math.PI / 2;
  lane.rotation.z = -angle;
  lane.position.set((from.x + to.x) / 2, 0.004, (from.z + to.z) / 2);
  lane.receiveShadow = true;
  g.add(lane);

  for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(planeGeo(0.1, len), M.paintWhite);
    edge.rotation.x = -Math.PI / 2;
    edge.rotation.z = -angle;
    edge.position.set(
      (from.x + to.x) / 2 + Math.cos(angle) * side * (width / 2 + 0.05),
      0.006,
      (from.z + to.z) / 2 - Math.sin(angle) * side * (width / 2 + 0.05),
    );
    g.add(edge);
  }

  g.userData.lane = { from, to, width };
  return g;
}

/** Yellow aisle / bay demarcation line. */
export function floorLine({ from, to, width = 0.12, color = 'yellow' }) {
  const M = materials();
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dz);
  const mat = color === 'yellow' ? M.paintYellow : color === 'green' ? M.paintGreen : M.paintWhite;
  const m = new THREE.Mesh(planeGeo(width, len), mat);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = -Math.atan2(dx, dz);
  m.position.set((from.x + to.x) / 2, 0.004, (from.z + to.z) / 2);
  m.receiveShadow = true;
  return m;
}

/** Hazard-striped floor patch (dock edges, keep-clear zones). */
export function stripedFloor({ w = 3, d = 1, repeat = [6, 1] }) {
  const m = new THREE.Mesh(
    planeGeo(w, d),
    new THREE.MeshStandardMaterial({
      map: T.hazardStripes('#f2c200', '#151515', repeat),
      roughness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.005;
  m.receiveShadow = true;
  return m;
}

/** Painted floor text such as aisle letters. */
export function floorLabel(text, { size = 1.6 } = {}) {
  const tex = T.sign({
    key: `floor-${text}`,
    w: 256,
    h: 256,
    bg: '#00000000',
    lines: [{ t: text, c: '#e8c000', s: 0.5 }],
  });
  const m = new THREE.Mesh(
    planeGeo(size, size),
    new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.006;
  return m;
}

/* ------------------------------------------------------------------ *
 * Doors and docks
 * ------------------------------------------------------------------ */

/**
 * A sectional dock door in the wall.
 * @param {boolean} open   door raised
 * @param {boolean} trailerParked  a trailer is sealed against the opening
 *                                 (this is what makes it SAFE)
 */
export function dockDoor({ open = false, trailerParked = false, width = 3.0, height = 3.4 } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'dock-door';

  // frame
  for (const x of [-width / 2 - 0.12, width / 2 + 0.12]) {
    const jamb = new THREE.Mesh(boxGeo(0.24, height + 0.3, 0.3), M.steelDeck);
    jamb.position.set(x, (height + 0.3) / 2, 0);
    jamb.castShadow = true;
    g.add(jamb);
  }
  const head = new THREE.Mesh(boxGeo(width + 0.5, 0.3, 0.3), M.steelDeck);
  head.position.set(0, height + 0.15, 0);
  g.add(head);

  // door panels
  const panelH = height / 4;
  const doorGrp = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(boxGeo(width, panelH - 0.02, 0.07), M.paintWhite);
    p.position.set(0, panelH / 2 + i * panelH, 0.06);
    p.castShadow = true;
    doorGrp.add(p);
    if (i === 3) {
      const vision = new THREE.Mesh(planeGeo(width * 0.6, panelH * 0.4), M.glass);
      vision.position.set(0, panelH / 2 + i * panelH, 0.11);
      doorGrp.add(vision);
    }
  }
  if (open) doorGrp.position.y = height - 0.15;
  g.add(doorGrp);

  if (open && !trailerParked) {
    // the void: dark opening onto the yard, 1.2m above yard level
    const void_ = new THREE.Mesh(planeGeo(width, height), new THREE.MeshBasicMaterial({ color: 0x151a1f }));
    void_.position.set(0, height / 2, -0.08);
    g.add(void_);
    // a hint of daylight in the yard beyond
    const yard = new THREE.Mesh(planeGeo(width, height * 0.35), new THREE.MeshBasicMaterial({ color: 0x6d7d8a }));
    yard.position.set(0, height * 0.18, -0.09);
    g.add(yard);
    g.userData.openVoid = true;
  }

  if (trailerParked) {
    // trailer back doors sealed against the dock - the SAFE control
    const trailer = new THREE.Mesh(boxGeo(width - 0.1, height - 0.2, 0.2), M.paintWhite);
    trailer.position.set(0, (height - 0.2) / 2, -0.2);
    g.add(trailer);
    const seam = new THREE.Mesh(boxGeo(0.05, height - 0.2, 0.22), M.forkliftDark);
    seam.position.set(0, (height - 0.2) / 2, -0.19);
    g.add(seam);
    g.userData.trailerParked = true;
  }

  // dock bumpers
  for (const x of [-width / 2 + 0.2, width / 2 - 0.2]) {
    const b = new THREE.Mesh(boxGeo(0.34, 0.5, 0.14), M.rubber);
    b.position.set(x, 0.25, 0.12);
    g.add(b);
  }

  g.userData.width = width;
  g.userData.height = height;
  g.userData.open = open;
  return g;
}

/** Personnel fire-exit door with a lit running-man sign above it. */
export function fireExitDoor({ width = 1.1, height = 2.1 } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'fire-exit-door';

  const leaf = new THREE.Mesh(boxGeo(width, height, 0.06), M.green);
  leaf.position.set(0, height / 2, 0.03);
  leaf.castShadow = true;
  g.add(leaf);
  const frame = new THREE.Mesh(boxGeo(width + 0.16, height + 0.1, 0.1), M.steelDeck);
  frame.position.set(0, (height + 0.1) / 2, 0);
  g.add(frame);
  // push bar
  const bar = new THREE.Mesh(boxGeo(width * 0.8, 0.06, 0.08), M.forkliftSteel);
  bar.position.set(0, 1.02, 0.1);
  g.add(bar);

  const sgn = exitSign({ lit: true });
  sgn.position.set(0, height + 0.36, 0.06);
  g.add(sgn);

  const kc = safetySign('keepClear', { width: 0.5 });
  kc.position.set(0, height - 0.35, 0.07);
  g.add(kc);

  // keep-clear hatch on the floor in front
  const hatch = stripedFloor({ w: width + 0.6, d: 1.4, repeat: [4, 1] });
  hatch.position.set(0, 0.005, 0.85);
  g.add(hatch);

  g.userData.width = width;
  return g;
}

/** Roller shutter goods-in door (closed) - fills the elevation. */
export function rollerShutter({ width = 4, height = 4.2 } = {}) {
  const M = materials();
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x8d949c, roughness: 0.55, metalness: 0.55 });
  for (let y = 0; y < height; y += 0.24) {
    const slat = new THREE.Mesh(boxGeo(width, 0.22, 0.05), mat);
    slat.position.set(0, y + 0.12, 0.05);
    g.add(slat);
  }
  const box = new THREE.Mesh(boxGeo(width + 0.4, 0.5, 0.4), M.steelDeck);
  box.position.set(0, height + 0.25, 0.05);
  g.add(box);
  for (const x of [-width / 2 - 0.12, width / 2 + 0.12]) {
    const guide = new THREE.Mesh(boxGeo(0.16, height + 0.5, 0.18), M.steelDeck);
    guide.position.set(x, (height + 0.5) / 2, 0.02);
    g.add(guide);
  }
  return g;
}

/** Mezzanine / office block along a wall - adds vertical interest. */
export function officeBlock({ width = 9, depth = 5, height = 3.2, colliders = [] } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'office-block';

  const walls = new THREE.Mesh(boxGeo(width, height, depth), new THREE.MeshStandardMaterial({
    color: 0xd9dce0, roughness: 0.85,
  }));
  walls.position.y = height / 2;
  walls.castShadow = walls.receiveShadow = true;
  g.add(walls);

  // glazing strip
  const glass = new THREE.Mesh(planeGeo(width * 0.86, height * 0.36), M.glass);
  glass.position.set(0, height * 0.62, depth / 2 + 0.01);
  g.add(glass);
  for (let i = 1; i < 4; i++) {
    const mull = new THREE.Mesh(boxGeo(0.07, height * 0.38, 0.05), M.steelDeck);
    mull.position.set(-width * 0.43 + (i * width * 0.86) / 4, height * 0.62, depth / 2 + 0.03);
    g.add(mull);
  }
  // door
  const door = new THREE.Mesh(planeGeo(0.95, 2.05), M.steelDeck);
  door.position.set(-width * 0.3, 1.03, depth / 2 + 0.01);
  g.add(door);

  // stair up to a small mezzanine deck
  const deck = new THREE.Mesh(boxGeo(width, 0.12, depth), M.steelDeck);
  deck.position.y = height + 0.06;
  g.add(deck);
  const rail = new THREE.Mesh(boxGeo(width, 0.06, 0.06), M.barrier);
  rail.position.set(0, height + 1.1, depth / 2);
  g.add(rail);
  for (let i = 0; i <= 6; i++) {
    const p = new THREE.Mesh(boxGeo(0.06, 1.1, 0.06), M.barrier);
    p.position.set(-width / 2 + (i * width) / 6, height + 0.6, depth / 2);
    g.add(p);
  }

  g.userData.footprint = { width, depth, height };
  return g;
}
