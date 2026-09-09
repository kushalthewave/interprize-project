/**
 * env01.js - ENVIRONMENT 1: "Main Storage Hall"
 * Himalaya Logistics Distribution Centre, Birgunj.
 *
 * A 62 x 44 m general storage warehouse: four racking runs on a cross-aisle
 * layout, a marked pedestrian spine down the middle, an office block, a fire
 * point, two fire exits and a goods-in area.
 *
 * This is the vertical slice - it carries all 15 hazards. Environments 2 and 3
 * reuse every builder here and only change the layout, lighting and which
 * hazards are emphasised.
 */
import * as THREE from 'three';
import { materials, boxGeo, planeGeo } from '../props/Materials.js';
import * as Struct from '../props/Structure.js';
import * as P from '../props/SafetyProps.js';
import * as S from '../props/Storage.js';
import * as F from '../props/Forklift.js';
import { worker, animateWorker } from '../props/Worker.js';
import * as Sc from '../Scenarios.js';

export const meta = {
  id: 'env01',
  name: 'Main Storage Hall',
  subtitle: 'General warehouse · Birgunj DC',
  description:
    'A general storage warehouse with four racking runs, a central pedestrian spine and an active forklift aisle. Every hazard type appears here.',
  difficultyBias: 'All 15 hazards · balanced',
  hazardCount: 15,
  size: { width: 62, depth: 44, height: 9.5 },
  spawn: { x: 0, z: 18.5, yaw: 0 },
  order: 1,
};

/**
 * @param {import('../World.js').World} world
 */
export function build(world) {
  const M = materials();
  const W = meta.size.width;
  const D = meta.size.depth;
  const Hh = meta.size.height;
  const opts = world.opts;

  /* ---------------- location naming ---------------- */
  // Gives every hazard a place a player can actually navigate to, e.g.
  // "Aisle C, north end". Used by Train Mode, the feedback card and results.
  world.locator = (x, z) => {
    const aisles = [
      { x: -16.5, n: 'Aisle A' }, { x: -8, n: 'Aisle B' },
      { x: 8, n: 'Aisle C' }, { x: 16.5, n: 'Aisle D' },
    ];
    const end = z < -6 ? 'north end' : z > 6 ? 'south end' : 'cross aisle';

    if (x < -W / 2 + 13) return z > 8 ? 'by the office block' : 'west wall';
    if (x > W / 2 - 6) return 'east wall';
    // Only the strip hard against the north wall is dock/goods-in. A wider
    // band swallowed the north ends of the aisles and mislabelled hazards
    // that are plainly in Aisle C as being "at the loading dock".
    if (z < -D / 2 + 8) return x > 4 ? 'loading dock area' : 'goods-in area';

    // nearest named aisle, if we are close enough to one to mean it
    let best = null, bestD = 6;
    for (const a of aisles) {
      const d = Math.abs(x - a.x);
      if (d < bestD) { bestD = d; best = a; }
    }
    if (best) return `${best.n}, ${end}`;
    return z > 6 ? 'main walkway, south' : z < -6 ? 'central aisle, north' : 'central cross aisle';
  };

  /* ---------------- shell + lighting ---------------- */
  const shell = Struct.warehouseShell({
    width: W, depth: D, height: Hh, colliders: world.colliders, wallColor: '#8f989f',
  });
  world.add(shell);

  const lights = Struct.lighting({
    width: W, depth: D, height: Hh,
    ambientIntensity: opts.ambientIntensity ?? 0.6,
    fogDensity: opts.fogDensity ?? 0.011,
    scene: world.scene,
  });
  world.add(lights);
  world.markers.lighting = lights;

  /* ---------------- floor markings ---------------- */
  // main pedestrian spine, running north-south down the centre
  const spine = Struct.walkway({
    from: { x: -1.9, z: D / 2 - 1.5 },
    to: { x: -1.9, z: -D / 2 + 3 },
    width: 1.6,
  });
  world.add(spine);
  // cross walkway to the office
  const cross = Struct.walkway({
    from: { x: -1.9, z: 12 },
    to: { x: -W / 2 + 5, z: 12 },
    width: 1.4,
  });
  world.add(cross);

  // vehicle aisle demarcation
  for (const x of [2.4, W / 2 - 4]) {
    world.add(Struct.floorLine({ from: { x, z: D / 2 - 2 }, to: { x, z: -D / 2 + 2 } }));
  }
  // aisle letters
  const aisleX = [-16.5, -8, 8, 16.5];
  ['A', 'B', 'C', 'D'].forEach((L, i) => {
    const lbl = Struct.floorLabel(L, { size: 1.9 });
    world.add(lbl, [aisleX[i], 0, D / 2 - 5]);
  });

  /* ---------------- racking runs ---------------- */
  // Four double-sided runs along Z, leaving a cross aisle at z = 0.
  const rackRuns = [];
  const runZ = [[-D / 2 + 8.5, 'north'], [D / 2 - 8.5, 'south']];
  for (const x of aisleX) {
    for (const [zc] of runZ) {
      const rack = S.racking({
        bays: 5, levels: 3, doubleSided: true, damagedBay: -1,
      });
      // runs go along X inside each half; rotate so they line the aisles
      world.add(rack, [x, 0, zc], Math.PI / 2);
      rackRuns.push(rack);
      world.colliderFor(rack, { shrink: 0.1, height: rack.userData.height });
      populateRack(world, rack, x + zc);
    }
  }
  world.markers.rackRuns = rackRuns;

  /* ---------------- office block ---------------- */
  const office = Struct.officeBlock({ width: 10, depth: 6, height: 3.4 });
  world.add(office, [-W / 2 + 6, 0, 15]);
  world.collider(-W / 2 + 6, 15, 5, 3, 3.4);

  const board = P.safetySign('companyBoard', { width: 3.2 });
  world.add(board, [-W / 2 + 6, 5.2, 15 + 3.05]);
  const rules = P.safetySign('siteRules', { width: 1.15 });
  world.add(rules, [-W / 2 + 10.2, 1.9, 15 + 3.05]);
  const days = P.safetySign('daysSafe', { width: 1.5 });
  world.add(days, [-W / 2 + 2.4, 2.1, 15 + 3.05]);

  // Nepal flag by the office entrance - national identity, workplace-appropriate
  const flag = P.nepalFlag({ scale: 1.2 });
  world.add(flag, [-W / 2 + 1.2, 3.6, 15 + 3.1]);
  world.animate((dt, t) => {
    flag.userData.cloth.rotation.y = Math.sin(t * 0.7) * 0.06;
  });

  /* ---------------- doors ---------------- */
  // goods-in roller shutters on the north wall
  for (const x of [-W / 2 + 20, -W / 2 + 27]) {
    const rs = Struct.rollerShutter({ width: 4.2, height: 4.4 });
    world.add(rs, [x, 0, -D / 2 + 0.15], 0);
  }
  // dock doors on the north wall (east end) - one sealed by a trailer (safe),
  // one open with no barrier (hazard 10)
  const dockSafe = Struct.dockDoor({ open: true, trailerParked: true, width: 3.2, height: 3.6 });
  world.add(dockSafe, [W / 2 - 16, 0, -D / 2 + 0.2], 0);
  world.decoy({
    center: new THREE.Vector3(W / 2 - 16, 1.4, -D / 2 + 1.2), size: new THREE.Vector3(3.4, 2.6, 2.0),
    reason: 'This dock is safe - a trailer is sealed against the opening, so there is no open edge to fall from.',
  });

  const dockOpen = Struct.dockDoor({ open: true, trailerParked: false, width: 3.2, height: 3.6 });
  world.add(dockOpen, [W / 2 - 9, 0, -D / 2 + 0.2], 0);

  // fire exits, east and west walls
  const exitW = Struct.fireExitDoor();
  world.add(exitW, [-W / 2 + 0.15, 0, -6], Math.PI / 2);
  const exitE = Struct.fireExitDoor();
  world.add(exitE, [W / 2 - 0.15, 0, 6], -Math.PI / 2);

  // high-level exit signage over both
  for (const [x, z, ry] of [[-W / 2 + 0.3, -6, Math.PI / 2], [W / 2 - 0.3, 6, -Math.PI / 2]]) {
    const s = P.exitSign({ lit: true });
    world.add(s, [x, 4.2, z], ry);
  }

  /* ---------------- wall signage ---------------- */
  const wallSigns = [
    ['forkliftWarning', [-W / 2 + 0.25, 2.6, 2], Math.PI / 2, 0.75],
    ['ppeRequired', [-W / 2 + 0.25, 2.6, 4.5], Math.PI / 2, 0.75],
    ['speedLimit', [W / 2 - 0.25, 2.6, -4], -Math.PI / 2, 0.65],
    ['pedestrianRoute', [-1.9, 2.9, D / 2 - 0.3], Math.PI, 0.7],
    ['firstAid', [W / 2 - 0.25, 2.4, 14], -Math.PI / 2, 0.6],
    ['assemblyPoint', [W / 2 - 0.25, 2.6, -14], -Math.PI / 2, 0.65],
  ];
  for (const [preset, pos, ry, w] of wallSigns) {
    world.add(P.safetySign(preset, { width: w }), pos, ry);
  }

  // aisle-end sign posts
  world.add(P.signPost('forkliftWarning', { height: 2.2, width: 0.55 }), [3.4, 0, D / 2 - 6]);
  world.add(P.signPost('pedestrianRoute', { height: 2.2, width: 0.55 }), [-3.6, 0, -D / 2 + 6]);

  /* ---------------- fire points ---------------- */
  // a compliant fire point (control) and the blocked one (hazard 8)
  const fpGood = P.firePoint({ blocked: false });
  world.add(fpGood, [-W / 2 + 0.35, 0, -12], Math.PI / 2);
  world.decoy({
    center: new THREE.Vector3(-W / 2 + 1.2, 1.0, -12), size: new THREE.Vector3(2.0, 2.2, 2.4),
    reason: 'This fire point is fully accessible with its keep-clear hatching visible. Correct - the blocked one is elsewhere.',
  });

  /* ================================================================ *
   * HAZARDS  (all 15)
   * ================================================================ */

  // 1. forklift travelling down the pedestrian spine
  Sc.forkliftOnWalkway(world, { at: [-1.9, 0, -4], heading: 0, patrol: true });

  // 2. reversing forklift with a worker behind, in the goods-in area
  Sc.reversingForklift(world, { at: [-W / 2 + 23.5, 0, -D / 2 + 9], heading: Math.PI });

  // 3. falling boxes - upper beam of aisle C, over the cross aisle
  const rackC = rackRuns[4]; // aisle C, north run
  Sc.fallingBoxes(world, { rack: rackC, bay: 2, level: 2, side: 1 });

  // 4. damaged racking - a short run at the end of aisle B
  Sc.damagedRacking(world, { at: [-8, 0, D / 2 - 3.2], heading: Math.PI / 2, bays: 3, levels: 3 });

  // 5. unmarked spill in the vehicle aisle
  Sc.unmarkedSpill(world, { at: [11.5, 0, 3.5], size: 2.6, withDrum: true });
  // ... and a correctly managed one elsewhere, as the contrast
  Sc.managedSpill(world, { at: [-13, 0, -13], size: 1.5 });

  // 6. blocked pedestrian walkway - on the spine, south end
  Sc.blockedWalkway(world, { at: [-1.9, 0, 8.5], heading: 0 });

  // 7. blocked emergency exit - the west fire exit
  Sc.blockedFireExit(world, { at: [-W / 2 + 1.8, 0, -6], heading: Math.PI / 2 });

  // 8. blocked fire extinguisher - east wall
  Sc.blockedFirePoint(world, { at: [W / 2 - 0.5, 0, -2], heading: -Math.PI / 2 });

  // 9. worker with no PPE - in the vehicle aisle
  Sc.workerNoPPE(world, { at: [5.5, 0, -9], heading: 0.4 });

  // 10. person on the open dock edge
  Sc.openDockEdge(world, { at: [W / 2 - 9, 0, -D / 2 + 2.1], heading: 0 });

  // 11. trailing damaged cable across the cross aisle
  Sc.trailingCableHazard(world, {
    at: [W / 2 - 0.6, 0, 11],
    heading: -Math.PI / 2,
    points: [
      new THREE.Vector3(0, 0.02, 0),
      new THREE.Vector3(1.4, 0.03, 0.7),
      new THREE.Vector3(2.9, 0.02, -0.4),
      new THREE.Vector3(4.4, 0.035, 0.8),
      new THREE.Vector3(6.0, 0.02, 0.1),
    ],
  });

  // 12. broken pallet still loaded, in the staging area
  Sc.brokenPalletHazard(world, { at: [-12.5, 0, 5.5], heading: 0.3 });

  // 13. over-height block stack in the marshalling bay
  Sc.overloadedStackHazard(world, { at: [14.5, 0, 14], heading: 0.2 });

  // 14. unsafe ladder against aisle D racking
  Sc.unsafeLadder(world, { at: [16.5, 0, -3.5], heading: Math.PI });

  // 15. blind corner where aisle B meets the cross aisle
  Sc.blindCorner(world, { at: [-6.2, 0, -1.2], heading: 0 });

  /* ================================================================ *
   * Dressing - the "it's a real workplace" layer
   * ================================================================ */

  dressWarehouse(world, { W, D });

  /* ---------------- decoys (difficulty-scaled) ---------------- */
  Sc.scatterDecoys(world, DECOY_SPOTS, opts.decoyCount ?? 0);

  /* ---------------- ambient life ---------------- */
  // two compliant workers going about their jobs, well clear of the hazards
  const staff = [];
  for (const [x, z, ry] of [[-19, 12, 0.6], [19.5, -12, -1.2]]) {
    const p = worker({ variant: 'hivis' });
    world.add(p, [x, 0, z], ry);
    staff.push(p);
    world.collider(x, z, 0.35, 0.35, 1.8, false);
  }
  world.animate((dt, t) => {
    for (const p of staff) animateWorker(p, t, 0);
  });

  // a parked forklift on charge, clearly out of the way (decoy)
  const parked = F.forklift({ loaded: false });
  world.add(parked, [-W / 2 + 3.5, 0, -D / 2 + 4], 0.4);
  world.collider(-W / 2 + 3.5, -D / 2 + 4, 0.8, 1.4, 2.2);
  world.decoy({
    object: parked,
    reason: 'This truck is parked in its charging bay with the forks lowered and the key out. Parked correctly is not a hazard.',
  });

  world.markers.spawn = meta.spawn;
  world.markers.bounds = {
    minX: -W / 2 + 1.2, maxX: W / 2 - 1.2,
    minZ: -D / 2 + 1.2, maxZ: D / 2 - 1.2,
  };
  return world;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Fill a racking run with a believable mix of loads and empty slots. */
function populateRack(world, rack, seed) {
  const rnd = (() => {
    let a = Math.floor(Math.abs(seed) * 1000) >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();

  const { bays, levels } = rack.userData;
  for (let b = 0; b < bays; b++) {
    for (let l = 0; l <= levels; l++) {
      for (const side of [0, 1]) {
        const r = rnd();
        if (r < 0.26) continue; // empty slot - warehouses are never 100% full
        const slot = rack.userData.slot(b, l, side);
        let obj;
        if (r < 0.68) {
          obj = S.palletLoad({ rows: l === 0 ? 3 : 2, wrapped: r > 0.45, seed: Math.floor(r * 10) });
        } else if (r < 0.86) {
          obj = S.pallet();
        } else {
          obj = S.blockStack({ rows: 2, cols: 2, levels: l === 0 ? 3 : 2, seed: Math.floor(r * 7) });
          obj.position.y = 0;
        }
        obj.position.copy(slot);
        if (l === 0) obj.position.y = 0;
        rack.add(obj);
      }
    }
  }
}

/** Small props, clutter and the odd bit of housekeeping. */
function dressWarehouse(world, { W, D }) {
  const M = materials();

  // staging bays marked on the floor near goods-in
  for (let i = 0; i < 3; i++) {
    const x = -W / 2 + 18 + i * 5;
    for (const [f, t] of [
      [{ x: x - 2, z: -D / 2 + 4 }, { x: x + 2, z: -D / 2 + 4 }],
      [{ x: x - 2, z: -D / 2 + 8 }, { x: x + 2, z: -D / 2 + 8 }],
      [{ x: x - 2, z: -D / 2 + 4 }, { x: x - 2, z: -D / 2 + 8 }],
      [{ x: x + 2, z: -D / 2 + 4 }, { x: x + 2, z: -D / 2 + 8 }],
    ]) {
      world.add(Struct.floorLine({ from: f, to: t, width: 0.1 }));
    }
    if (i !== 1) {
      const load = S.palletLoad({ rows: 2, wrapped: true, seed: i });
      world.add(load, [x, 0, -D / 2 + 6], i * 0.3);
      world.collider(x, -D / 2 + 6, 0.65, 0.45, 1.2);
    }
  }

  // empty pallet stack in the marshalling corner
  const stackG = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const p = S.pallet();
    p.position.y = i * 0.145;
    p.rotation.y = (i % 2) * 0.02;
    stackG.add(p);
  }
  world.add(stackG, [-W / 2 + 4.5, 0, 4], 0.2);
  world.collider(-W / 2 + 4.5, 4, 0.65, 0.45, 1.4);

  // a broken-pallet quarantine cage (the correct control for hazard 12)
  const cage = F.rollCage();
  world.add(cage, [-W / 2 + 4.5, 0, 7], 0);
  const quarSign = P.safetySign('keepClear', { width: 0.4 });
  world.add(quarSign, [-W / 2 + 4.5, 1.9, 7.45]);

  // pallet trucks parked along the wall
  for (const [x, z, ry] of [[-W / 2 + 2.2, -2, 0.2], [-W / 2 + 2.2, 0, -0.1]]) {
    world.add(F.palletTruck(), [x, 0, z], ry);
  }

  // housekeeping props
  world.add(P.broom(), [-W / 2 + 1.4, 0, 9.5], 0.4);
  world.add(P.bucket(), [-W / 2 + 1.9, 0, 9.9]);
  world.add(P.oilDrum({ leaking: false, color: 0x2f6fd0 }), [W / 2 - 2.2, 0, 18], 0);
  world.add(P.oilDrum({ leaking: false, color: 0x1f8a4c }), [W / 2 - 2.9, 0, 18.4], 0.5);

  // convex mirrors on the *other* junctions - their absence at the blind
  // corner is what makes that hazard legible
  for (const [x, z, ry] of [[6.2, 1.2, Math.PI], [-16.4, -1.2, 0]]) {
    world.add(P.convexMirror({ height: 2.6 }), [x, 0, z], ry);
  }

  // barriers protecting the office corner and the charging bay
  world.add(P.safetyBarrier({ length: 3.2 }), [-W / 2 + 11.4, 0, 12.2], Math.PI / 2);
  world.add(P.safetyBarrier({ length: 2.6 }), [-W / 2 + 5.6, 0, -D / 2 + 6.2], 0);

  // cones marking a maintenance area (a correct control)
  for (let i = 0; i < 4; i++) {
    world.add(P.trafficCone({ h: 0.6 }), [
      20 + Math.cos((i / 4) * Math.PI * 2) * 1.4, 0,
      -17 + Math.sin((i / 4) * Math.PI * 2) * 1.4,
    ]);
  }
}

/** Candidate positions for difficulty-scaled decoys. */
const DECOY_SPOTS = [
  { type: 'goodPallet', at: [-20, 0, 3] },
  { type: 'goodPallet', at: [9.5, 0, -14] },
  { type: 'goodPallet', at: [-9.5, 0, 17] },
  { type: 'cordonedArea', at: [20, 0, 8] },
  { type: 'cordonedArea', at: [-22, 0, -8] },
  { type: 'taggedRack', at: [-16.5, 0, -6.5] },
  { type: 'taggedRack', at: [16.5, 0, 6.5] },
  { type: 'parkedTruck', at: [12, 0, 18] },
  { type: 'parkedTruck', at: [-24, 0, 10] },
  { type: 'goodLadder', at: [24, 0, -10] },
  { type: 'goodLadder', at: [-25, 0, -16] },
  { type: 'clearExit', at: [W_SAFE(), 0, 6] },
];

function W_SAFE() {
  return 62 / 2 - 2.0;
}
