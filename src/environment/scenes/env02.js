/**
 * env02.js - ENVIRONMENT 2: "Loading & Dispatch Bay"
 *
 * A wide, shallow cross-dock hall: six dock doors along the north elevation,
 * a marshalling floor rather than deep racking, and much heavier vehicle
 * traffic. The hazard mix leans toward vehicle movement, dock edges and
 * housekeeping - the things that actually go wrong on a dispatch floor.
 *
 * Note how short this file is: it reuses props/, Scenarios.js and the World
 * API from Environment 1 rather than duplicating the application.
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
  id: 'env02',
  name: 'Loading & Dispatch Bay',
  subtitle: 'Cross-dock · heavy vehicle traffic',
  description:
    'A wide cross-dock hall with six dock doors and constant forklift movement. Emphasises vehicle/pedestrian conflict, dock edges and marshalling housekeeping.',
  difficultyBias: '12 hazards · vehicle & dock focused',
  hazardCount: 12,
  size: { width: 70, depth: 30, height: 8.5 },
  spawn: { x: -6, z: 11, yaw: -0.06 },
  order: 2,
};

export function build(world) {
  const W = meta.size.width;
  const D = meta.size.depth;
  const Hh = meta.size.height;
  const opts = world.opts;

  /* ---------------- shell ---------------- */
  world.add(Struct.warehouseShell({
    width: W, depth: D, height: Hh, colliders: world.colliders, wallColor: '#7f8a93',
  }));

  const lights = Struct.lighting({
    width: W, depth: D, height: Hh,
    // dispatch halls are brighter at the dock face and dimmer at the back
    ambientIntensity: (opts.ambientIntensity ?? 0.6) * 1.05,
    fogDensity: (opts.fogDensity ?? 0.011) * 0.85,
    scene: world.scene,
  });
  world.add(lights);
  world.markers.lighting = lights;

  /* ---------------- dock face (north wall) ---------------- */
  const dockXs = [-26, -17, -8, 1, 10, 19];
  const docks = [];
  dockXs.forEach((x, i) => {
    // doors 0,1,3,5 are sealed by trailers (safe); 2 is open+unguarded (hazard);
    // 4 is closed.
    const open = i !== 4;
    const trailer = open && i !== 2;
    const d = Struct.dockDoor({ open, trailerParked: trailer, width: 3.4, height: 3.8 });
    world.add(d, [x, 0, -D / 2 + 0.2], 0);
    docks.push(d);

    // dock number stencilled on the floor
    world.add(Struct.floorLabel(String(i + 1), { size: 1.5 }), [x, 0, -D / 2 + 3.4]);
    // approach hatching
    const hatch = Struct.stripedFloor({ w: 3.8, d: 0.6, repeat: [8, 1] });
    world.add(hatch, [x, 0, -D / 2 + 1.5]);
    if (i !== 2) {
      world.decoy({
        center: new THREE.Vector3(x, 1.4, -D / 2 + 1.4),
        size: new THREE.Vector3(3.4, 2.6, 1.8),
        reason: open
          ? 'A trailer is sealed against this dock, so there is no open edge. This is the correct arrangement.'
          : 'This dock door is closed. An unused dock kept shut is exactly right.',
      });
    }
  });
  world.markers.docks = docks;

  /* ---------------- floor layout ---------------- */
  // pedestrian route running the length of the hall, set back from the docks
  world.add(Struct.walkway({
    from: { x: -W / 2 + 3, z: 6.5 }, to: { x: W / 2 - 3, z: 6.5 }, width: 1.7,
  }));
  // crossing points to the dock face
  for (const x of [-21, 5]) {
    world.add(Struct.walkway({ from: { x, z: 6.5 }, to: { x, z: -D / 2 + 5 }, width: 1.4 }));
  }
  // vehicle aisle lines
  world.add(Struct.floorLine({ from: { x: -W / 2 + 2, z: 4.4 }, to: { x: W / 2 - 2, z: 4.4 } }));
  world.add(Struct.floorLine({ from: { x: -W / 2 + 2, z: -D / 2 + 6.5 }, to: { x: W / 2 - 2, z: -D / 2 + 6.5 } }));

  // marshalling bays: outbound lanes marked on the floor
  for (let i = 0; i < 6; i++) {
    const x = -26 + i * 9;
    for (const [f, t] of [
      [{ x: x - 3.4, z: 9.5 }, { x: x + 3.4, z: 9.5 }],
      [{ x: x - 3.4, z: 13.5 }, { x: x + 3.4, z: 13.5 }],
      [{ x: x - 3.4, z: 9.5 }, { x: x - 3.4, z: 13.5 }],
      [{ x: x + 3.4, z: 9.5 }, { x: x + 3.4, z: 13.5 }],
    ]) world.add(Struct.floorLine({ from: f, to: t, width: 0.1 }));
    world.add(Struct.floorLabel(`OUT ${i + 1}`, { size: 1.1 }), [x, 0, 11.5]);

    // staged outbound pallets - correctly built, inside the bay markings
    if (i !== 3) {
      for (let k = 0; k < 2; k++) {
        const load = S.palletLoad({ rows: 3, wrapped: true, seed: i + k });
        world.add(load, [x - 1.4 + k * 2.6, 0, 11.4], (i + k) * 0.15);
        world.collider(x - 1.4 + k * 2.6, 11.4, 0.65, 0.45, 1.3);
      }
    }
  }

  /* ---------------- shallow racking along the south wall ---------------- */
  const rackRuns = [];
  for (const x of [-20, 0, 20]) {
    const rack = S.racking({ bays: 5, levels: 2, doubleSided: false });
    world.add(rack, [x, 0, D / 2 - 1.6], 0);
    rackRuns.push(rack);
    world.colliderFor(rack, { shrink: 0.1, height: rack.userData.height });
    fillRack(world, rack, x);
  }
  world.markers.rackRuns = rackRuns;

  /* ---------------- signage & fire ---------------- */
  world.add(P.safetySign('companyBoard', { width: 3.4 }), [0, 5.6, D / 2 - 0.3], Math.PI);
  world.add(P.safetySign('forkliftWarning', { width: 0.8 }), [-W / 2 + 0.25, 2.7, 0], Math.PI / 2);
  world.add(P.safetySign('ppeRequired', { width: 0.8 }), [-W / 2 + 0.25, 2.7, 3], Math.PI / 2);
  world.add(P.safetySign('speedLimit', { width: 0.7 }), [W / 2 - 0.25, 2.7, -2], -Math.PI / 2);
  world.add(P.safetySign('dockDanger', { width: 0.7 }), [W / 2 - 0.25, 2.7, 2], -Math.PI / 2);
  world.add(P.safetySign('siteRules', { width: 1.2 }), [W / 2 - 0.25, 2.0, 8], -Math.PI / 2);
  world.add(P.nepalFlag({ scale: 1.1 }), [-W / 2 + 1.0, 4.0, D / 2 - 0.4], Math.PI);

  world.add(P.signPost('pedestrianRoute', { height: 2.2, width: 0.55 }), [-21, 0, 8.4]);
  world.add(P.signPost('forkliftWarning', { height: 2.2, width: 0.55 }), [5, 0, 3.2]);

  // fire exits at both ends
  const exitW = Struct.fireExitDoor();
  world.add(exitW, [-W / 2 + 0.15, 0, 2], Math.PI / 2);
  const exitE = Struct.fireExitDoor();
  world.add(exitE, [W / 2 - 0.15, 0, -2], -Math.PI / 2);
  world.add(P.exitSign({ lit: true }), [-W / 2 + 0.3, 3.8, 2], Math.PI / 2);
  world.add(P.exitSign({ lit: true }), [W / 2 - 0.3, 3.8, -2], -Math.PI / 2);

  const fpGood = P.firePoint({ blocked: false });
  world.add(fpGood, [-W / 2 + 0.35, 0, -6], Math.PI / 2);
  world.decoy({
    center: new THREE.Vector3(-W / 2 + 1.2, 1.0, -6), size: new THREE.Vector3(2.0, 2.2, 2.4),
    reason: 'Fully accessible fire point with clear hatching. This is the correct standard.',
  });

  /* ================================================================ *
   * HAZARDS (12 - vehicle and dock weighted)
   * ================================================================ */

  // 1. forklift on the pedestrian route
  Sc.forkliftOnWalkway(world, { at: [-13, 0, 6.5], heading: Math.PI / 2, patrol: true });

  // 2. reversing forklift into the marshalling area
  Sc.reversingForklift(world, { at: [23, 0, 1.5], heading: -Math.PI / 2 });

  // 10. person on the open dock edge (door 3)
  Sc.openDockEdge(world, { at: [dockXs[2], 0, -D / 2 + 2.2], heading: 0 });

  // 15. blind corner where the racking run meets the cross route
  Sc.blindCorner(world, { at: [8, 0, 9.0], heading: Math.PI });

  // 5. unmarked spill in the vehicle aisle at the dock face
  Sc.unmarkedSpill(world, { at: [-4, 0, -8.5], size: 2.8, withDrum: true });

  // 6. blocked pedestrian route
  Sc.blockedWalkway(world, { at: [16, 0, 6.5], heading: Math.PI / 2 });

  // 7. blocked fire exit (east)
  Sc.blockedFireExit(world, { at: [W / 2 - 1.9, 0, -2], heading: -Math.PI / 2 });

  // 8. blocked fire point (south wall)
  Sc.blockedFirePoint(world, { at: [-31, 0, D / 2 - 0.5], heading: Math.PI });

  // 9. worker with no PPE on the dispatch floor
  Sc.workerNoPPE(world, { at: [-9, 0, -4.5], heading: 0.8 });

  // 12. broken pallet in outbound bay 4
  Sc.brokenPalletHazard(world, { at: [1, 0, 11.4], heading: 0.2 });

  // 13. over-height stack in the marshalling area
  Sc.overloadedStackHazard(world, { at: [28, 0, 10.5], heading: -0.3 });

  // 11. trailing cable from the dock office
  Sc.trailingCableHazard(world, {
    at: [-W / 2 + 1.0, 0, 12.5],
    heading: -Math.PI / 2,
    points: [
      new THREE.Vector3(0, 0.02, 0),
      new THREE.Vector3(1.6, 0.03, 0.6),
      new THREE.Vector3(3.2, 0.02, -0.5),
      new THREE.Vector3(5.0, 0.035, 0.6),
    ],
  });

  /* ---------------- dressing ---------------- */
  // extra trucks working the floor
  const busy = [];
  for (const [x, z, ry] of [[-30, -3, 0.3], [30, -6, -1.4]]) {
    const t = F.forklift({ loaded: true });
    t.userData.setLoad(S.palletLoad({ rows: 2, wrapped: true, seed: 3 }));
    world.add(t, [x, 0, z], ry);
    world.collider(x, z, 0.8, 1.4, 2.2);
    busy.push(t);
    world.decoy({
      object: t,
      reason: 'This truck is inside the marked vehicle aisle with its beacon on and no pedestrian in its path. Operating correctly.',
    });
  }
  world.animate((dt, t) => {
    for (const tr of busy) Sc.flashBeacon(tr, t);
  });

  // dock staff
  const staff = [];
  for (const [x, z, ry] of [[-24, 8.5, 1.2], [12, -6.5, -0.4], [-33, 10, 0.2]]) {
    const p = worker({ variant: 'hivis' });
    world.add(p, [x, 0, z], ry);
    world.collider(x, z, 0.35, 0.35, 1.8, false);
    staff.push(p);
  }
  world.animate((dt, t) => {
    for (const p of staff) animateWorker(p, t, 0);
  });

  // empty pallet stacks, cages, trucks
  for (const [x, z] of [[-34, 3], [34, 3]]) {
    const g = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const p = S.pallet();
      p.position.y = i * 0.145;
      g.add(p);
    }
    world.add(g, [x, 0, z], 0.15);
    world.collider(x, z, 0.65, 0.45, 1.3);
  }
  for (const [x, z, ry] of [[-18, 13.8, 0.4], [24, 13.8, -0.2]]) {
    world.add(F.rollCage(), [x, 0, z], ry);
    world.collider(x, z, 0.4, 0.45, 1.7);
  }
  for (const [x, z, ry] of [[-29, 8, 0.1], [17, -9, 1.4]]) {
    world.add(F.palletTruck(), [x, 0, z], ry);
  }

  // convex mirrors at the other junctions
  world.add(P.convexMirror({ height: 2.7 }), [-21, 0, 4.0], Math.PI);
  world.add(P.convexMirror({ height: 2.7 }), [-8, 0, 8.6], 0);

  // barriers protecting the walkway crossing
  world.add(P.safetyBarrier({ length: 3.0 }), [-23.5, 0, 5.6], 0);
  world.add(P.safetyBarrier({ length: 3.0 }), [-18.5, 0, 5.6], 0);

  Sc.managedSpill(world, { at: [30, 0, -3], size: 1.5 });
  Sc.scatterDecoys(world, DECOY_SPOTS, opts.decoyCount ?? 0);

  world.markers.spawn = meta.spawn;
  world.markers.bounds = {
    minX: -W / 2 + 1.2, maxX: W / 2 - 1.2,
    minZ: -D / 2 + 1.2, maxZ: D / 2 - 1.2,
  };
  return world;
}

function fillRack(world, rack, seed) {
  let a = Math.floor(Math.abs(seed) * 977 + 13) >>> 0;
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
      if (r < 0.3) continue;
      const slot = rack.userData.slot(b, l, 0);
      const obj = r < 0.75
        ? S.palletLoad({ rows: 2, wrapped: r > 0.5, seed: Math.floor(r * 9) })
        : S.pallet();
      obj.position.copy(slot);
      if (l === 0) obj.position.y = 0;
      rack.add(obj);
    }
  }
}

const DECOY_SPOTS = [
  { type: 'goodPallet', at: [-30, 0, 13] },
  { type: 'goodPallet', at: [33, 0, 12] },
  { type: 'goodPallet', at: [-2, 0, 13.6] },
  { type: 'cordonedArea', at: [21, 0, -7] },
  { type: 'cordonedArea', at: [-33, 0, -7] },
  { type: 'taggedRack', at: [-20, 0, 12.2] },
  { type: 'taggedRack', at: [20, 0, 12.2] },
  { type: 'parkedTruck', at: [-15, 0, -10] },
  { type: 'parkedTruck', at: [26, 0, -10] },
  { type: 'goodLadder', at: [11, 0, 13.4] },
  { type: 'goodLadder', at: [-11, 0, 13.4] },
  { type: 'clearExit', at: [-33.5, 0, 2] },
];
