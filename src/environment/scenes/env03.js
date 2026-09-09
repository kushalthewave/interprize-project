/**
 * env03.js - ENVIRONMENT 3: "High-Bay Cold Store Annexe"
 *
 * The hard site. Narrow-aisle high-bay racking (5 levels), poorer lighting,
 * more visual noise and hazards that are deliberately harder to distinguish
 * from correctly-controlled work. Every one of the 15 hazards is present, and
 * the decoy density is higher than the other two environments even before the
 * difficulty multiplier is applied.
 */
import * as THREE from 'three';
import { materials } from '../props/Materials.js';
import * as Struct from '../props/Structure.js';
import * as P from '../props/SafetyProps.js';
import * as S from '../props/Storage.js';
import * as F from '../props/Forklift.js';
import { worker, animateWorker } from '../props/Worker.js';
import * as Sc from '../Scenarios.js';

export const meta = {
  id: 'env03',
  name: 'High-Bay Annexe',
  subtitle: 'Narrow aisle · low light · high risk',
  description:
    'A five-level narrow-aisle high-bay store with poor lighting and heavy congestion. All 15 hazards, harder to see, with more correctly-controlled lookalikes to reject.',
  difficultyBias: '15 hazards · highest difficulty',
  hazardCount: 15,
  size: { width: 54, depth: 40, height: 12 },
  spawn: { x: 0, z: 16.5, yaw: 0 },
  order: 3,
};

export function build(world) {
  const W = meta.size.width;
  const D = meta.size.depth;
  const Hh = meta.size.height;
  const opts = world.opts;

  world.add(Struct.warehouseShell({
    width: W, depth: D, height: Hh, colliders: world.colliders, wallColor: '#6f777e',
  }));

  /* ---------------- location naming ---------------- */
  // Runs A-F are stencilled on the floor at the end of each aisle, so the
  // location text matches what the player can read in-world.
  world.locator = (x, z) => {
    const runX = [-19, -11.4, -3.8, 3.8, 11.4, 19];
    const end = z < -8 ? 'north end' : z > 8 ? 'south end' : 'middle';
    if (z < -D / 2 + 6) return x > 0 ? 'dock face, east' : 'goods-in, west';
    if (x < -W / 2 + 5) return 'west wall';
    if (x > W / 2 - 5) return 'east wall';
    let best = null, bestD = 4.5;
    runX.forEach((rx, i) => {
      const d = Math.abs(x - rx);
      if (d < bestD) { bestD = d; best = String.fromCharCode(65 + i); }
    });
    return best ? `Run ${best}, ${end}` : `narrow aisle, ${end}`;
  };


  // Deliberately dimmer and foggier than the other two sites - this is one of
  // the ways the environment itself raises difficulty.
  const lights = Struct.lighting({
    width: W, depth: D, height: Hh,
    ambientIntensity: (opts.ambientIntensity ?? 0.6) * 0.72,
    fogDensity: (opts.fogDensity ?? 0.011) * 1.5,
    scene: world.scene,
  });
  world.add(lights);
  world.markers.lighting = lights;

  /* ---------------- narrow-aisle racking ---------------- */
  // Six tall runs with 2.6m aisles - much more claustrophobic than env01.
  const rackRuns = [];
  const runX = [-19, -11.4, -3.8, 3.8, 11.4, 19];
  runX.forEach((x, i) => {
    const rack = S.racking({
      bays: 6, levels: 5, doubleSided: false, levelHeight: 2.0,
      damagedBay: i === 3 ? 2 : -1,
    });
    world.add(rack, [x, 0, 0], Math.PI / 2);
    rackRuns.push(rack);
    world.colliderFor(rack, { shrink: 0.1, height: rack.userData.height });
    fillRackDense(world, rack, i);
    world.add(Struct.floorLabel(String.fromCharCode(65 + i), { size: 1.6 }), [x, 0, D / 2 - 4]);
  });
  world.markers.rackRuns = rackRuns;

  /* ---------------- floor markings ---------------- */
  world.add(Struct.walkway({
    from: { x: -W / 2 + 3, z: D / 2 - 3.5 }, to: { x: W / 2 - 3, z: D / 2 - 3.5 }, width: 1.6,
  }));
  world.add(Struct.walkway({
    from: { x: -W / 2 + 3, z: -D / 2 + 3.5 }, to: { x: W / 2 - 3, z: -D / 2 + 3.5 }, width: 1.6,
  }));
  world.add(Struct.walkway({
    from: { x: -W / 2 + 2.4, z: D / 2 - 3.5 }, to: { x: -W / 2 + 2.4, z: -D / 2 + 3.5 }, width: 1.4,
  }));
  for (const z of [D / 2 - 6.4, -D / 2 + 6.4]) {
    world.add(Struct.floorLine({ from: { x: -W / 2 + 2, z }, to: { x: W / 2 - 2, z } }));
  }

  /* ---------------- doors, signage ---------------- */
  world.add(Struct.rollerShutter({ width: 4.4, height: 4.6 }), [-W / 2 + 9, 0, -D / 2 + 0.15]);
  const dockOpen = Struct.dockDoor({ open: true, trailerParked: false, width: 3.2, height: 3.6 });
  world.add(dockOpen, [W / 2 - 8, 0, -D / 2 + 0.2], 0);
  const dockSafe = Struct.dockDoor({ open: true, trailerParked: true, width: 3.2, height: 3.6 });
  world.add(dockSafe, [W / 2 - 14, 0, -D / 2 + 0.2], 0);
  world.decoy({
    center: new THREE.Vector3(W / 2 - 14, 1.4, -D / 2 + 1.2), size: new THREE.Vector3(3.4, 2.6, 1.8),
    reason: 'Trailer sealed to the dock - no open edge. Correct.',
  });

  const exitW = Struct.fireExitDoor();
  world.add(exitW, [-W / 2 + 0.15, 0, -4], Math.PI / 2);
  const exitE = Struct.fireExitDoor();
  world.add(exitE, [W / 2 - 0.15, 0, 4], -Math.PI / 2);
  world.add(P.exitSign({ lit: true }), [-W / 2 + 0.3, 4.0, -4], Math.PI / 2);
  world.add(P.exitSign({ lit: true }), [W / 2 - 0.3, 4.0, 4], -Math.PI / 2);

  world.add(P.safetySign('companyBoard', { width: 3.0 }), [0, 5.4, D / 2 - 0.3], Math.PI);
  world.add(P.safetySign('siteRules', { width: 1.1 }), [-W / 2 + 0.25, 2.0, 8], Math.PI / 2);
  world.add(P.safetySign('ppeRequired', { width: 0.75 }), [-W / 2 + 0.25, 2.7, 11], Math.PI / 2);
  world.add(P.safetySign('forkliftWarning', { width: 0.75 }), [W / 2 - 0.25, 2.7, -8], -Math.PI / 2);
  world.add(P.safetySign('speedLimit', { width: 0.6 }), [W / 2 - 0.25, 2.7, -11], -Math.PI / 2);
  world.add(P.safetySign('blindCorner', { width: 0.7 }), [-W / 2 + 0.25, 2.7, -10], Math.PI / 2);
  world.add(P.nepalFlag({ scale: 1.0 }), [-W / 2 + 1.0, 3.8, D / 2 - 0.4], Math.PI);

  const fpGood = P.firePoint({ blocked: false });
  world.add(fpGood, [-W / 2 + 0.35, 0, 14], Math.PI / 2);
  world.decoy({
    center: new THREE.Vector3(-W / 2 + 1.2, 1.0, 14), size: new THREE.Vector3(2.0, 2.2, 2.4),
    reason: 'Clear, signed and accessible fire point. Correct standard.',
  });

  /* ================================================================ *
   * HAZARDS - all 15, tucked into a busier, darker building
   * ================================================================ */

  // 3. falling boxes, high up in aisle B where it is hardest to notice
  Sc.fallingBoxes(world, { rack: rackRuns[1], bay: 3, level: 3, side: 0 });

  // 4. damaged racking is baked into run D above (damagedBay: 2) - register it
  const dmg = rackRuns[3];
  const bwD = dmg.userData.bayWidth;
  const dxD = -dmg.userData.totalWidth / 2 + 2 * bwD + bwD / 2;
  const wpD = new THREE.Vector3(dxD, 0, 0);
  dmg.localToWorld(wpD);
  world.hazard({
    id: 'damaged-rack',
    center: new THREE.Vector3(wpD.x, 2.0, wpD.z),
    size: new THREE.Vector3(3.0, 4.0, 3.0),
    hint: 'Sight down each run of uprights. One frame is not vertical.',
  });

  // 1. forklift on the north pedestrian route
  Sc.forkliftOnWalkway(world, { at: [-4, 0, -D / 2 + 3.5], heading: Math.PI / 2, patrol: true });

  // 2. reversing forklift in the narrow aisle between C and D
  Sc.reversingForklift(world, { at: [0, 0, 8], heading: 0 });

  // 15. blind corner at the head of aisle E
  Sc.blindCorner(world, { at: [11.4, 0, D / 2 - 7.5], heading: 0 });

  // 5. unmarked spill deep in aisle A where the light is poor
  Sc.unmarkedSpill(world, { at: [-19, 0, -6], size: 2.2, withDrum: false });

  // 6. blocked walkway on the south route
  Sc.blockedWalkway(world, { at: [7.5, 0, D / 2 - 3.5], heading: Math.PI / 2 });

  // 7. blocked fire exit (west)
  Sc.blockedFireExit(world, { at: [-W / 2 + 1.9, 0, -4], heading: Math.PI / 2 });

  // 8. blocked fire point (east wall)
  Sc.blockedFirePoint(world, { at: [W / 2 - 0.5, 0, 12], heading: -Math.PI / 2 });

  // 9. worker without PPE in the vehicle aisle
  Sc.workerNoPPE(world, { at: [-9, 0, -D / 2 + 7.5], heading: -0.5 });

  // 10. open dock edge with a person on it
  Sc.openDockEdge(world, { at: [W / 2 - 8, 0, -D / 2 + 2.2], heading: 0 });

  // 11. trailing cable in the narrow aisle
  Sc.trailingCableHazard(world, {
    at: [-11.4, 0, 12],
    heading: 0,
    points: [
      new THREE.Vector3(0, 0.02, 0),
      new THREE.Vector3(0.6, 0.03, -1.4),
      new THREE.Vector3(-0.4, 0.02, -3.0),
      new THREE.Vector3(0.5, 0.035, -4.6),
    ],
  });

  // 12. broken pallet, at ground level in aisle F
  Sc.brokenPalletHazard(world, { at: [19, 0, -10], heading: 1.2 });

  // 13. over-height stack in the pick-face staging area
  Sc.overloadedStackHazard(world, { at: [-W / 2 + 6, 0, -12], heading: 0.4, withGoodStack: true });

  // 14. unsafe ladder against a high-bay upright
  Sc.unsafeLadder(world, { at: [3.8, 0, -8.5], heading: -Math.PI / 2 });

  /* ---------------- congestion & noise ---------------- */
  Sc.managedSpill(world, { at: [15, 0, 14], size: 1.4 });

  const busy = [];
  for (const [x, z, ry] of [[-24, 12, 0.9], [24, -14, -2.1]]) {
    const t = F.forklift({ loaded: true });
    t.userData.setLoad(S.palletLoad({ rows: 2, wrapped: true, seed: 5 }));
    world.add(t, [x, 0, z], ry);
    world.collider(x, z, 0.8, 1.4, 2.2);
    busy.push(t);
    world.decoy({
      object: t,
      reason: 'Beacon on, inside the vehicle aisle, nobody in its path. This truck is being operated correctly.',
    });
  }
  world.animate((dt, t) => { for (const tr of busy) Sc.flashBeacon(tr, t); });

  const staff = [];
  for (const [x, z, ry] of [[-15, 15, 0.5], [15, -16, -0.8], [-22, -15, 2.0], [22, 15, -1.3]]) {
    const p = worker({ variant: 'hivis' });
    world.add(p, [x, 0, z], ry);
    world.collider(x, z, 0.35, 0.35, 1.8, false);
    staff.push(p);
  }
  world.animate((dt, t) => { for (const p of staff) animateWorker(p, t, 0); });

  // clutter that adds visual noise without being hazardous
  for (const [x, z] of [[-W / 2 + 4, 4], [W / 2 - 4, -4], [-W / 2 + 4, -16]]) {
    const g = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const p = S.pallet();
      p.position.y = i * 0.145;
      p.rotation.y = (i % 3) * 0.015;
      g.add(p);
    }
    world.add(g, [x, 0, z], 0.1);
    world.collider(x, z, 0.65, 0.45, 1.5);
  }
  for (const [x, z, ry] of [[-W / 2 + 4, 8, 0.3], [W / 2 - 4, 8, -0.3], [W / 2 - 4, -12, 1.1]]) {
    world.add(F.rollCage(), [x, 0, z], ry);
    world.collider(x, z, 0.4, 0.45, 1.7);
  }
  for (const [x, z, ry] of [[-W / 2 + 3, 11, 0.2], [W / 2 - 3, -16, 1.6]]) {
    world.add(F.palletTruck(), [x, 0, z], ry);
  }
  world.add(P.oilDrum({ leaking: false, color: 0x2f6fd0 }), [W / 2 - 2.4, 0, 17]);
  world.add(P.oilDrum({ leaking: false, color: 0xc0182a }), [W / 2 - 3.1, 0, 17.4], 0.4);
  world.add(P.broom(), [-W / 2 + 1.6, 0, -8], 0.3);
  world.add(P.bucket(), [-W / 2 + 2.1, 0, -8.5]);

  // mirrors elsewhere, so their absence at the blind corner reads
  world.add(P.convexMirror({ height: 3.0 }), [-11.4, 0, D / 2 - 7.5], 0);
  world.add(P.convexMirror({ height: 3.0 }), [3.8, 0, -D / 2 + 7.5], Math.PI);

  world.add(P.safetyBarrier({ length: 3.4 }), [-W / 2 + 3.4, 0, -6], 0);
  world.add(P.safetyBarrier({ length: 3.4 }), [W / 2 - 3.4, 0, 6], 0);

  // env03 always carries extra decoys on top of the difficulty allowance
  Sc.scatterDecoys(world, DECOY_SPOTS, Math.min(DECOY_SPOTS.length, (opts.decoyCount ?? 0) + 4));

  world.markers.spawn = meta.spawn;
  world.markers.bounds = {
    minX: -W / 2 + 1.2, maxX: W / 2 - 1.2,
    minZ: -D / 2 + 1.2, maxZ: D / 2 - 1.2,
  };
  return world;
}

/** High-bay runs are fuller than general storage - that is what makes it dark. */
function fillRackDense(world, rack, seed) {
  let a = (seed * 7919 + 101) >>> 0;
  const rnd = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const { bays, levels } = rack.userData;
  for (let b = 0; b < bays; b++) {
    for (let l = 0; l <= levels; l++) {
      const r = rnd();
      if (r < 0.12) continue;
      const slot = rack.userData.slot(b, l, 0);
      const obj = r < 0.8
        ? S.palletLoad({ rows: l === 0 ? 3 : 2, wrapped: r > 0.4, seed: Math.floor(r * 11) })
        : S.pallet();
      obj.position.copy(slot);
      if (l === 0) obj.position.y = 0;
      rack.add(obj);
    }
  }
}

const DECOY_SPOTS = [
  { type: 'goodPallet', at: [-19, 0, 14] },
  { type: 'goodPallet', at: [19, 0, 14] },
  { type: 'goodPallet', at: [-3.8, 0, -15] },
  { type: 'goodPallet', at: [11.4, 0, -15] },
  { type: 'cordonedArea', at: [-W3() + 8, 0, 17] },
  { type: 'cordonedArea', at: [W3() - 8, 0, -17] },
  { type: 'taggedRack', at: [-11.4, 0, 15.5] },
  { type: 'taggedRack', at: [3.8, 0, 15.5] },
  { type: 'taggedRack', at: [19, 0, -15.5] },
  { type: 'parkedTruck', at: [-19, 0, -15.5] },
  { type: 'parkedTruck', at: [11.4, 0, 15.5] },
  { type: 'goodLadder', at: [-3.8, 0, 15.5] },
  { type: 'goodLadder', at: [W3() - 3, 0, 10] },
  { type: 'clearExit', at: [W3() - 2.2, 0, 4] },
];

function W3() {
  return 54 / 2;
}
