/**
 * Materials.js
 * Shared material instances. Sharing matters: every rack upright in the
 * building points at ONE material, which keeps draw-call state changes and
 * GPU memory down considerably compared to per-object materials.
 */
import * as THREE from 'three';
import * as T from '../../core/Textures.js';

let M = null;

export function materials() {
  if (M) return M;

  const floorMap = T.concreteFloor();
  floorMap.repeat.set(24, 24);
  const floorRough = T.concreteRoughness();
  floorRough.repeat.set(24, 24);

  const wallMap = T.claddingWall('#9099a0');
  wallMap.repeat.set(14, 4);

  M = {
    floor: new THREE.MeshStandardMaterial({
      map: floorMap,
      roughnessMap: floorRough,
      roughness: 0.82,
      metalness: 0.04,
      color: 0xffffff,
    }),
    wall: new THREE.MeshStandardMaterial({
      map: wallMap,
      roughness: 0.72,
      metalness: 0.22,
      side: THREE.DoubleSide,
    }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x2b3138, roughness: 0.95, side: THREE.DoubleSide }),
    steelDeck: new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.6, metalness: 0.55 }),

    // Racking - orange uprights, blue beams is the classic warehouse palette
    rackUpright: new THREE.MeshStandardMaterial({
      map: T.paintedSteel('#c2521a', 4),
      roughness: 0.62,
      metalness: 0.35,
    }),
    rackBeam: new THREE.MeshStandardMaterial({
      map: T.paintedSteel('#1f4e9c', 6),
      roughness: 0.58,
      metalness: 0.38,
    }),
    rackDamaged: new THREE.MeshStandardMaterial({
      map: T.paintedSteel('#8a3d15', 9),
      roughness: 0.75,
      metalness: 0.3,
    }),
    mesh: new THREE.MeshStandardMaterial({
      color: 0x8d949c,
      roughness: 0.7,
      metalness: 0.6,
      wireframe: false,
    }),

    wood: new THREE.MeshStandardMaterial({ map: T.palletWood(), roughness: 0.88, metalness: 0.0 }),
    woodBroken: new THREE.MeshStandardMaterial({ color: 0x7d5f34, roughness: 0.95 }),

    box: [0, 1, 2, 3].map(
      (i) => new THREE.MeshStandardMaterial({ map: T.cardboard(i), roughness: 0.92, metalness: 0.0 }),
    ),
    wrap: new THREE.MeshPhysicalMaterial({
      color: 0xdfe8ec,
      roughness: 0.35,
      metalness: 0.0,
      transparent: true,
      opacity: 0.28,
      transmission: 0.35,
      side: THREE.DoubleSide,
    }),

    // Forklift
    forkliftBody: new THREE.MeshStandardMaterial({ color: 0xf0a800, roughness: 0.48, metalness: 0.4 }),
    forkliftDark: new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.65, metalness: 0.5 }),
    forkliftSteel: new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.4, metalness: 0.85 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x141618, roughness: 0.95, metalness: 0.0 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xaecad8,
      roughness: 0.08,
      metalness: 0.0,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
    }),

    // People
    skin: new THREE.MeshStandardMaterial({ color: 0xb07a4f, roughness: 0.75 }),
    hiVis: new THREE.MeshStandardMaterial({
      color: 0xd8f000,
      roughness: 0.62,
      emissive: 0x4a5400,
      emissiveIntensity: 0.35,
    }),
    hiVisOrange: new THREE.MeshStandardMaterial({
      color: 0xff7a1a,
      roughness: 0.62,
      emissive: 0x542000,
      emissiveIntensity: 0.3,
    }),
    helmet: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35, metalness: 0.05 }),
    helmetBlue: new THREE.MeshStandardMaterial({ color: 0x2f6fd0, roughness: 0.35 }),
    trouser: new THREE.MeshStandardMaterial({ color: 0x2a3546, roughness: 0.85 }),
    plainShirt: new THREE.MeshStandardMaterial({ color: 0x4a4f57, roughness: 0.9 }),
    boot: new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.8 }),

    // Nepali dress fabrics for the avatars
    kurtaMale: new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.86 }),
    kurtaTrouser: new THREE.MeshStandardMaterial({ color: 0xd8d2c0, roughness: 0.88 }),
    kurtiFemale: new THREE.MeshStandardMaterial({ color: 0xb3243f, roughness: 0.84 }),
    kurtiTrouser: new THREE.MeshStandardMaterial({ color: 0x1d3f8f, roughness: 0.86 }),
    dhakaTopi: new THREE.MeshStandardMaterial({ color: 0xe6e1d4, roughness: 0.9 }),
    scarf: new THREE.MeshStandardMaterial({ color: 0xf0a500, roughness: 0.8 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x171310, roughness: 0.9 }),

    // Safety kit
    red: new THREE.MeshStandardMaterial({ color: 0xc0182a, roughness: 0.45, metalness: 0.25 }),
    green: new THREE.MeshStandardMaterial({ color: 0x0f8a3c, roughness: 0.6 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.55 }),
    cone: new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.7 }),
    barrier: new THREE.MeshStandardMaterial({ color: 0xf5c400, roughness: 0.6, metalness: 0.3 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.95 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x2b2f34, roughness: 0.85 }),
    cableBare: new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      roughness: 0.35,
      metalness: 0.85,
      emissive: 0x2a2000,
      emissiveIntensity: 0.4,
    }),

    // Floor paint
    paintGreen: new THREE.MeshStandardMaterial({
      color: 0x1f8a4c,
      roughness: 0.75,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
    paintYellow: new THREE.MeshStandardMaterial({
      color: 0xe8c000,
      roughness: 0.75,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
    paintWhite: new THREE.MeshStandardMaterial({
      color: 0xdedede,
      roughness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),

    spill: new THREE.MeshStandardMaterial({
      map: T.spillDecal(),
      transparent: true,
      roughness: 0.06,
      metalness: 0.5,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),

    lampHousing: new THREE.MeshStandardMaterial({ color: 0x2e3339, roughness: 0.5, metalness: 0.6 }),
    lampLens: new THREE.MeshStandardMaterial({
      color: 0xfff4dd,
      emissive: 0xfff0d0,
      emissiveIntensity: 2.4,
      roughness: 0.3,
    }),
  };
  return M;
}

/** Build a double-sided unlit-ish sign material from a generated texture. */
export function signMaterial(texture, { emissive = 0x000000, emissiveIntensity = 0 } = {}) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.55,
    metalness: 0.05,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(emissive),
    emissiveIntensity,
  });
}

/** Shared geometry cache - box/cylinder primitives are reused constantly. */
const geoCache = new Map();
export function boxGeo(w, h, d) {
  const k = `b${w}_${h}_${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
}
export function cylGeo(rt, rb, h, seg = 16) {
  const k = `c${rt}_${rb}_${h}_${seg}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.CylinderGeometry(rt, rb, h, seg));
  return geoCache.get(k);
}
export function sphereGeo(r, seg = 16) {
  const k = `s${r}_${seg}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2)));
  return geoCache.get(k);
}
export function planeGeo(w, h) {
  const k = `p${w}_${h}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.PlaneGeometry(w, h));
  return geoCache.get(k);
}

export function resetMaterials() {
  M = null;
  geoCache.clear();
}
