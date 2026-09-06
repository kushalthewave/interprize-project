/**
 * Forklift.js
 * A procedural counterbalance forklift built from primitives.
 *
 * HONEST NOTE: this is not a scanned/CAD model. It is a hand-proportioned
 * low-poly truck (~2.4m long, 1.15m wide, 2.1m to the top of the overhead
 * guard) sized against a 1.7m person so that scale reads correctly. Blender
 * is not available in this environment; scripts/blender/ contains a Python
 * script that regenerates an equivalent mesh should Blender become available.
 *
 * The returned group exposes:
 *   userData.mast          - the lifting carriage (animatable)
 *   userData.wheels        - array of wheel meshes (spin)
 *   userData.beacon        - amber rotating beacon
 *   userData.reverseLights - meshes to flash when reversing
 *   userData.setLoad(obj)  - park a pallet load on the forks
 */
import * as THREE from 'three';
import { materials, boxGeo, cylGeo, planeGeo } from './Materials.js';
import { sign } from '../../core/Textures.js';
import { signMaterial } from './Materials.js';

export function forklift({ loaded = true, color = null } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'forklift';

  const body = M.forkliftBody;
  const bodyMat = color
    ? new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.4 })
    : body;

  const wheels = [];

  /* --- chassis ------------------------------------------------------ */
  const chassis = new THREE.Mesh(boxGeo(1.05, 0.46, 1.55), bodyMat);
  chassis.position.set(0, 0.52, -0.15);
  chassis.castShadow = chassis.receiveShadow = true;
  g.add(chassis);

  // counterweight - the heavy rounded rear block
  const cw = new THREE.Mesh(boxGeo(1.1, 0.62, 0.62), M.forkliftDark);
  cw.position.set(0, 0.5, -1.02);
  cw.castShadow = true;
  g.add(cw);
  const cwCap = new THREE.Mesh(cylGeo(0.31, 0.31, 1.1, 16), M.forkliftDark);
  cwCap.rotation.z = Math.PI / 2;
  cwCap.position.set(0, 0.5, -1.33);
  cwCap.castShadow = true;
  g.add(cwCap);

  // engine cowl / battery hood the driver sits on
  const hood = new THREE.Mesh(boxGeo(0.9, 0.34, 0.72), bodyMat);
  hood.position.set(0, 0.86, -0.62);
  hood.castShadow = true;
  g.add(hood);

  /* --- operator station --------------------------------------------- */
  const seatBase = new THREE.Mesh(boxGeo(0.5, 0.1, 0.44), M.forkliftDark);
  seatBase.position.set(0, 1.05, -0.62);
  g.add(seatBase);
  const seatBack = new THREE.Mesh(boxGeo(0.5, 0.46, 0.1), M.forkliftDark);
  seatBack.position.set(0, 1.28, -0.83);
  seatBack.rotation.x = -0.12;
  g.add(seatBack);

  const column = new THREE.Mesh(cylGeo(0.045, 0.05, 0.5, 10), M.forkliftDark);
  column.position.set(0, 1.28, -0.16);
  column.rotation.x = 0.34;
  g.add(column);
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 20), M.forkliftDark);
  wheelRim.position.set(0, 1.5, -0.09);
  wheelRim.rotation.x = Math.PI / 2 - 0.34;
  g.add(wheelRim);

  // overhead guard (FOPS) - four posts and a slatted roof
  const guard = new THREE.Group();
  for (const [x, z] of [
    [-0.5, 0.02],
    [0.5, 0.02],
    [-0.5, -0.98],
    [0.5, -0.98],
  ]) {
    const post = new THREE.Mesh(boxGeo(0.06, 1.12, 0.06), M.forkliftDark);
    post.position.set(x, 1.55, z);
    post.castShadow = true;
    guard.add(post);
  }
  for (let i = 0; i < 6; i++) {
    const slat = new THREE.Mesh(boxGeo(1.06, 0.035, 0.07), M.forkliftDark);
    slat.position.set(0, 2.11, 0.0 - i * 0.19);
    slat.castShadow = true;
    guard.add(slat);
  }
  for (let i = 0; i < 4; i++) {
    const slat = new THREE.Mesh(boxGeo(0.06, 0.035, 1.02), M.forkliftDark);
    slat.position.set(-0.42 + i * 0.28, 2.11, -0.48);
    guard.add(slat);
  }
  g.add(guard);

  /* --- mast and forks ------------------------------------------------ */
  const mast = new THREE.Group();
  mast.name = 'mast';
  for (const x of [-0.34, 0.34]) {
    const rail = new THREE.Mesh(boxGeo(0.1, 2.3, 0.12), M.forkliftSteel);
    rail.position.set(x, 1.15, 0.72);
    rail.castShadow = true;
    mast.add(rail);
    const inner = new THREE.Mesh(boxGeo(0.06, 1.9, 0.08), M.forkliftDark);
    inner.position.set(x, 1.05, 0.79);
    mast.add(inner);
  }
  const mastTop = new THREE.Mesh(boxGeo(0.8, 0.1, 0.12), M.forkliftSteel);
  mastTop.position.set(0, 2.3, 0.72);
  mast.add(mastTop);
  // hydraulic ram
  const ram = new THREE.Mesh(cylGeo(0.045, 0.045, 1.5, 10), M.forkliftSteel);
  ram.position.set(0, 0.95, 0.62);
  mast.add(ram);

  // carriage + tines
  const carriage = new THREE.Group();
  carriage.name = 'carriage';
  const back = new THREE.Mesh(boxGeo(0.86, 0.5, 0.06), M.forkliftSteel);
  back.position.set(0, 0.3, 0.78);
  back.castShadow = true;
  carriage.add(back);
  const loadBack = new THREE.Mesh(boxGeo(0.9, 0.85, 0.04), M.mesh);
  loadBack.position.set(0, 0.62, 0.8);
  carriage.add(loadBack);
  for (const x of [-0.28, 0.28]) {
    const tine = new THREE.Mesh(boxGeo(0.11, 0.035, 1.05), M.forkliftSteel);
    tine.position.set(x, 0.07, 1.28);
    tine.castShadow = true;
    carriage.add(tine);
    const heel = new THREE.Mesh(boxGeo(0.11, 0.26, 0.04), M.forkliftSteel);
    heel.position.set(x, 0.18, 0.78);
    carriage.add(heel);
  }
  mast.add(carriage);
  g.add(mast);

  /* --- wheels -------------------------------------------------------- */
  const mkWheel = (x, z, r, w) => {
    const grp = new THREE.Group();
    const tyre = new THREE.Mesh(cylGeo(r, r, w, 18), M.tyre);
    tyre.rotation.z = Math.PI / 2;
    tyre.castShadow = true;
    grp.add(tyre);
    const hub = new THREE.Mesh(cylGeo(r * 0.45, r * 0.45, w + 0.012, 12), M.forkliftSteel);
    hub.rotation.z = Math.PI / 2;
    grp.add(hub);
    grp.position.set(x, r, z);
    wheels.push(tyre);
    return grp;
  };
  g.add(mkWheel(-0.52, 0.42, 0.31, 0.2)); // drive wheels (front, larger)
  g.add(mkWheel(0.52, 0.42, 0.31, 0.2));
  g.add(mkWheel(-0.42, -1.05, 0.22, 0.16)); // steer wheels (rear)
  g.add(mkWheel(0.42, -1.05, 0.22, 0.16));

  /* --- lights, beacon, decals ---------------------------------------- */
  const beacon = new THREE.Mesh(cylGeo(0.075, 0.085, 0.12, 12), M.yellow);
  beacon.position.set(0.36, 2.2, -0.4);
  beacon.material = new THREE.MeshStandardMaterial({
    color: 0xffa400,
    emissive: 0xff8800,
    emissiveIntensity: 1.6,
    roughness: 0.4,
  });
  g.add(beacon);
  const beaconLight = new THREE.PointLight(0xff9a1f, 0, 7, 2);
  beaconLight.position.copy(beacon.position);
  g.add(beaconLight);

  const reverseLights = [];
  for (const x of [-0.42, 0.42]) {
    const l = new THREE.Mesh(boxGeo(0.13, 0.09, 0.04), M.forkliftDark.clone());
    l.material = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      emissive: 0xffffff,
      emissiveIntensity: 0,
      roughness: 0.4,
    });
    l.position.set(x, 0.62, -1.34);
    g.add(l);
    reverseLights.push(l);
  }
  // head lights
  for (const x of [-0.4, 0.4]) {
    const l = new THREE.Mesh(cylGeo(0.07, 0.07, 0.05, 12), M.lampLens);
    l.rotation.x = Math.PI / 2;
    l.position.set(x, 0.78, 0.36);
    g.add(l);
  }

  // side panel decal - capacity plate + operator warning
  const decalTex = sign({
    key: 'fork-side',
    w: 256,
    h: 128,
    bg: '#1c1f23',
    lines: [
      { t: 'HIMALAYA LOGISTICS', c: '#f2c200', s: 0.15 },
      { t: '2500 kg  ·  UNIT 07', c: '#e6e6e6', s: 0.12 },
    ],
  });
  for (const [x, ry] of [
    [-0.531, -Math.PI / 2],
    [0.531, Math.PI / 2],
  ]) {
    const d = new THREE.Mesh(planeGeo(0.85, 0.3), signMaterial(decalTex));
    d.position.set(x, 0.86, -0.6);
    d.rotation.y = ry;
    g.add(d);
  }

  if (loaded) {
    // A modest, correctly-wrapped load on the tines by default.
    g.userData.hasLoad = true;
  }

  // Beacon/wheels/mast are animated, so never bake this into static geometry.
  g.userData.dynamic = true;
  g.userData.mast = mast;
  g.userData.carriage = carriage;
  g.userData.wheels = wheels;
  g.userData.beacon = beacon;
  g.userData.beaconLight = beaconLight;
  g.userData.reverseLights = reverseLights;
  g.userData.length = 2.6;
  g.userData.width = 1.15;

  /** Park a load group on the tines. */
  g.userData.setLoad = (obj) => {
    obj.position.set(0, 0.09, 1.0);
    carriage.add(obj);
    g.userData.hasLoad = true;
  };

  return g;
}

/** A hand pallet truck - fills out the scene without another full forklift. */
export function palletTruck() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'pallet-truck';
  for (const x of [-0.14, 0.14]) {
    const tine = new THREE.Mesh(boxGeo(0.16, 0.07, 1.15), M.forkliftSteel);
    tine.position.set(x, 0.09, 0.3);
    tine.castShadow = true;
    g.add(tine);
  }
  const head = new THREE.Mesh(boxGeo(0.46, 0.22, 0.24), M.forkliftBody);
  head.position.set(0, 0.16, -0.4);
  head.castShadow = true;
  g.add(head);
  const handle = new THREE.Mesh(cylGeo(0.03, 0.03, 1.05, 10), M.forkliftDark);
  handle.position.set(0, 0.66, -0.62);
  handle.rotation.x = 0.32;
  g.add(handle);
  const grip = new THREE.Mesh(cylGeo(0.035, 0.035, 0.36, 10), M.rubber);
  grip.rotation.z = Math.PI / 2;
  grip.position.set(0, 1.12, -0.78);
  g.add(grip);
  for (const [x, z] of [
    [-0.14, 0.82],
    [0.14, 0.82],
  ]) {
    const w = new THREE.Mesh(cylGeo(0.05, 0.05, 0.07, 12), M.rubber);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.05, z);
    g.add(w);
  }
  const w2 = new THREE.Mesh(cylGeo(0.085, 0.085, 0.09, 12), M.rubber);
  w2.rotation.z = Math.PI / 2;
  w2.position.set(0, 0.085, -0.45);
  g.add(w2);
  return g;
}

/** Wire-mesh roll cage / stillage. */
export function rollCage() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'roll-cage';
  const w = 0.72;
  const d = 0.82;
  const h = 1.7;
  const base = new THREE.Mesh(boxGeo(w, 0.08, d), M.forkliftSteel);
  base.position.y = 0.12;
  base.castShadow = true;
  g.add(base);
  // vertical wires on three sides
  const bars = 9;
  for (let i = 0; i < bars; i++) {
    const t = i / (bars - 1);
    for (const [x, z, ry] of [
      [-w / 2, -d / 2 + t * d, 0],
      [w / 2, -d / 2 + t * d, 0],
    ]) {
      const b = new THREE.Mesh(cylGeo(0.008, 0.008, h, 5), M.mesh);
      b.position.set(x, 0.16 + h / 2, z);
      g.add(b);
    }
  }
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(cylGeo(0.008, 0.008, h, 5), M.mesh);
    b.position.set(-w / 2 + (i * w) / 7, 0.16 + h / 2, -d / 2);
    g.add(b);
  }
  for (let i = 0; i < 5; i++) {
    for (const z of [-d / 2, 0]) {
      const r = new THREE.Mesh(boxGeo(z === 0 ? 0.02 : w, 0.02, z === 0 ? d : 0.02), M.mesh);
      r.position.set(z === 0 ? -w / 2 : 0, 0.3 + i * 0.36, z === 0 ? 0 : z);
      if (z === 0) {
        r.position.x = -w / 2;
        const r2 = r.clone();
        r2.position.x = w / 2;
        g.add(r2);
      }
      g.add(r);
    }
  }
  for (const [x, z] of [
    [-w / 2 + 0.08, -d / 2 + 0.08],
    [w / 2 - 0.08, -d / 2 + 0.08],
    [-w / 2 + 0.08, d / 2 - 0.08],
    [w / 2 - 0.08, d / 2 - 0.08],
  ]) {
    const c = new THREE.Mesh(cylGeo(0.05, 0.05, 0.06, 10), M.rubber);
    c.rotation.z = Math.PI / 2;
    c.position.set(x, 0.05, z);
    g.add(c);
  }
  return g;
}
