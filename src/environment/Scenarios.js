/**
 * Scenarios.js
 * Each of the 15 required hazards, built as a *physical situation* in the 3D
 * world and reusable across all three environments.
 *
 * The rule this file exists to enforce: a hazard is never a floating red icon.
 * It is geometry the player can walk up to and read - an obstructed door, a
 * bent upright, a carton hanging over a beam, a person in a blind spot.
 * The marker ring is only ever a *training aid*, shown in Train Mode and on
 * Simple difficulty, and it is registered separately by HazardSystem.
 *
 * Every builder takes (world, opts) and returns the group it created, having
 * already registered the hazard, its colliders and any animation.
 */
import * as THREE from 'three';
import { materials, boxGeo, planeGeo, cylGeo } from './props/Materials.js';
import * as S from './props/Storage.js';
import * as P from './props/SafetyProps.js';
import * as F from './props/Forklift.js';
import { worker, animateWorker, poseClimbing, poseLeaning } from './props/Worker.js';
import { stripedFloor } from './props/Structure.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ================================================================== *
 * 1. Forklift travelling down a pedestrian walkway
 * ================================================================== */
export function forkliftOnWalkway(world, { at = [0, 0, 0], heading = 0, laneZ = 0, patrol = null }) {
  const g = new THREE.Group();
  const truck = F.forklift({ loaded: true });
  const load = S.palletLoad({ rows: 2, wrapped: true, seed: 2 });
  truck.userData.setLoad(load);
  g.add(truck);

  // a pedestrian on foot in the same lane, walking toward the truck
  const ped = worker({ variant: 'hivis' });
  ped.position.set(0, 0, 7.5);
  ped.rotation.y = Math.PI;
  g.add(ped);

  world.dynamic(g);
  world.add(g, at, heading);

  const anchor = new THREE.Vector3(at[0], 1.1, at[2] + 3.6);
  world.hazard({
    id: 'forklift-pedestrian-collision',
    center: anchor,
    size: V(4.0, 2.6, 9.0),
    hint: 'Look at what the truck is driving along, not just the truck.',
  });

  // moving version: the truck creeps down the lane, the pedestrian walks back
  if (patrol && world.opts.movingHazards) {
    const t0 = truck.position.z;
    const p0 = ped.position.z;
    world.animate((dt, t) => {
      const s = Math.sin(t * 0.32);
      truck.position.z = t0 + s * 3.4;
      const speed = Math.abs(Math.cos(t * 0.32)) * 0.55;
      for (const w of truck.userData.wheels) w.rotation.x -= dt * 6 * (speed + 0.2);
      ped.position.z = p0 - Math.sin(t * 0.32 + 0.9) * 2.6;
      ped.rotation.y = Math.PI + (Math.cos(t * 0.32 + 0.9) > 0 ? 0 : Math.PI);
      animateWorker(ped, t, 0.8);
      flashBeacon(truck, t);
    });
  } else {
    world.animate((dt, t) => {
      animateWorker(ped, t, 0);
      flashBeacon(truck, t);
    });
  }

  world.collider(at[0], at[2], 0.7, 1.4, 2.2);
  g.userData.truck = truck;
  g.userData.ped = ped;
  return g;
}

/* ================================================================== *
 * 2. Reversing forklift with a worker in the blind spot
 * ================================================================== */
export function reversingForklift(world, { at = [0, 0, 0], heading = 0 }) {
  const g = new THREE.Group();
  const truck = F.forklift({ loaded: true });
  const load = S.palletLoad({ rows: 3, wrapped: true, seed: 1 });
  truck.userData.setLoad(load);
  g.add(truck);

  const driver = worker({ variant: 'driver' });
  driver.position.set(0, 0.62, -0.66);
  driver.scale.setScalar(0.94);
  // seated: fold the legs forward
  driver.userData.parts.legs[0].leg.rotation.x = -1.35;
  driver.userData.parts.legs[1].leg.rotation.x = -1.35;
  driver.userData.parts.legs[0].knee.rotation.x = 1.35;
  driver.userData.parts.legs[1].knee.rotation.x = 1.35;
  g.add(driver);

  // the worker standing directly behind the counterweight
  const behind = worker({ variant: 'hivis' });
  behind.position.set(0.15, 0, -3.0);
  behind.rotation.y = 0.4;
  g.add(behind);

  // a clipboard so it reads as "distracted, doing a job"
  const board = new THREE.Mesh(boxGeo(0.26, 0.34, 0.02), materials().paintWhite);
  board.position.set(0.15, 1.15, -2.78);
  board.rotation.set(-0.5, 0.4, 0);
  g.add(board);

  world.dynamic(g);
  world.add(g, at, heading);

  world.hazard({
    id: 'forklift-reversing-blind',
    center: new THREE.Vector3(at[0], 1.1, at[2] - 2.0),
    size: V(3.2, 2.4, 5.2),
    hint: 'Check the arc directly behind the counterweight.',
  });

  world.collider(at[0], at[2], 0.7, 1.4, 2.2);

  const z0 = truck.position.z;
  world.animate((dt, t) => {
    const reversing = world.opts.movingHazards;
    if (reversing) {
      truck.position.z = z0 - (Math.sin(t * 0.5) * 0.5 + 0.5) * 1.1;
      for (const w of truck.userData.wheels) w.rotation.x += dt * 2.2;
    }
    // reversing lights pulse
    const on = (t % 0.9) < 0.45;
    for (const l of truck.userData.reverseLights) {
      l.material.emissiveIntensity = on ? 2.4 : 0.05;
    }
    flashBeacon(truck, t);
    animateWorker(behind, t, 0);
  });

  g.userData.truck = truck;
  g.userData.behind = behind;
  g.userData.reversing = true;
  return g;
}

/* ================================================================== *
 * 3. Unstable / falling boxes on an upper rack beam
 * ================================================================== */
export function fallingBoxes(world, { rack, bay = 1, level = 2, side = 0 }) {
  const slot = rack.userData.slot(bay, level, side);
  const local = slot.clone();

  const load = S.unstableLoad({ seed: 3 });
  load.userData.dynamic = true; // the overhanging carton is animated
  load.position.copy(local);
  rack.add(load);

  // good neighbours either side so the bad one reads as the anomaly
  for (const b of [bay - 1, bay + 1]) {
    if (b < 0 || b >= rack.userData.bays) continue;
    const s2 = rack.userData.slot(b, level, side);
    const good = S.palletLoad({ rows: 2, wrapped: true, seed: b });
    good.position.copy(s2);
    rack.add(good);
  }

  rack.updateWorldMatrix(true, true);
  const world_ = new THREE.Vector3();
  load.getWorldPosition(world_);

  world.hazard({
    id: 'falling-boxes',
    center: world_.clone().add(V(0.2, 0.7, 0)),
    size: V(2.4, 2.0, 1.9),
    hint: 'Compare this pallet with the ones beside it. Look at the edges.',
  });

  // Controlled animation rather than a physics engine: the overhanging carton
  // rocks, tips further, drops, bounces once and resets. Deterministic, cheap,
  // and it communicates instability far more clearly than a static prop.
  const falling = load.userData.fallingBox;
  const tilted = load.userData.tiltedBox;
  const startPos = falling.position.clone();
  const startRot = falling.rotation.clone();
  let phase = 0;
  let fallT = 0;
  let vy = 0;
  const groundLocalY = -world_.y + 0.18;

  world.animate((dt, t) => {
    // the tilted carton always creaks back and forth a little
    if (tilted) tilted.rotation.z = -0.34 + Math.sin(t * 1.6) * 0.035;

    if (!world.opts.movingHazards) {
      // static difficulty: just a slow rock, no drop
      falling.rotation.z = startRot.z + Math.sin(t * 1.1) * 0.05;
      return;
    }

    if (phase === 0) {
      // teeter
      fallT += dt;
      falling.rotation.z = startRot.z + Math.sin(t * 2.1) * 0.09;
      falling.position.y = startPos.y + Math.sin(t * 2.1) * 0.012;
      if (fallT > 6.5) { phase = 1; fallT = 0; vy = 0; }
    } else if (phase === 1) {
      // fall
      vy -= 9.81 * dt;
      falling.position.y += vy * dt;
      falling.position.x += dt * 0.35;
      falling.rotation.z += dt * 2.4;
      falling.rotation.x += dt * 1.1;
      if (falling.position.y <= groundLocalY) {
        falling.position.y = groundLocalY;
        if (Math.abs(vy) > 1.2) {
          vy = -vy * 0.28; // one bounce
        } else {
          phase = 2;
          fallT = 0;
          world.onBoxImpact?.();
        }
      }
    } else if (phase === 2) {
      // rest on the floor, then reset so the scenario can be observed again
      fallT += dt;
      if (fallT > 5) {
        falling.position.copy(startPos);
        falling.rotation.copy(startRot);
        phase = 0;
        fallT = 0;
      }
    }
  });

  return load;
}

/* ================================================================== *
 * 4. Damaged / leaning racking
 * ================================================================== */
export function damagedRacking(world, { at = [0, 0, 0], heading = 0, bays = 3, levels = 3 }) {
  const rack = S.racking({ bays, levels, damagedBay: 1 });
  world.add(rack, at, heading);

  // scattered impact debris at the base + a scuff mark
  const debris = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const chip = new THREE.Mesh(boxGeo(0.08 + i * 0.02, 0.03, 0.06), materials().rackDamaged);
    chip.position.set(-1.1 + i * 0.35, 0.015, 0.4 + (i % 2) * 0.25);
    chip.rotation.y = i * 0.7;
    debris.add(chip);
  }
  rack.add(debris);

  const bw = rack.userData.bayWidth;
  const dx = -rack.userData.totalWidth / 2 + 1 * bw + bw / 2;
  const wp = new THREE.Vector3(dx, 0, 0);
  rack.localToWorld(wp);

  world.hazard({
    id: 'damaged-rack',
    center: new THREE.Vector3(wp.x, 1.6, wp.z),
    size: V(3.4, 3.4, 2.2),
    hint: 'Sight down the line of uprights - are they all vertical?',
  });

  world.colliderFor(rack, { shrink: 0.05, height: rack.userData.height });
  return rack;
}

/* ================================================================== *
 * 5. Unmarked spill
 * ================================================================== */
export function unmarkedSpill(world, { at = [0, 0, 0], size = 2.4, withDrum = true }) {
  const g = new THREE.Group();
  const sp = P.spill({ size });
  g.add(sp);
  if (withDrum) {
    const drum = P.oilDrum({ leaking: true });
    drum.position.set(-size * 0.42, 0, -size * 0.24);
    g.add(drum);
  }
  world.dynamic(g);
  world.add(g, at);

  world.hazard({
    id: 'floor-spill',
    center: new THREE.Vector3(at[0], 0.5, at[2]),
    size: V(size + 0.6, 1.4, size * 0.8 + 0.6),
    hint: 'A managed spill has a sign and cones. This one has neither.',
  });

  // subtle wet shimmer
  world.animate((dt, t) => {
    sp.material.roughness = 0.05 + Math.sin(t * 0.9) * 0.02;
  });
  return g;
}

/** The safe control: a spill that IS signed and coned. Registered as a decoy. */
export function managedSpill(world, { at = [0, 0, 0], size = 1.6 }) {
  const g = new THREE.Group();
  const sp = P.spill({ size });
  g.add(sp);
  const sign = P.wetFloorSign();
  sign.position.set(size * 0.5, 0, size * 0.35);
  g.add(sign);
  for (const [x, z] of [[-size * 0.6, size * 0.3], [0, -size * 0.5], [size * 0.55, -size * 0.2]]) {
    const c = P.trafficCone({ h: 0.5 });
    c.position.set(x, 0, z);
    g.add(c);
  }
  world.dynamic(g);
  world.add(g, at);
  world.decoy({
    center: new THREE.Vector3(at[0], 0.5, at[2]),
    size: V(size + 1.2, 1.6, size + 1.2),
    reason:
      'This spill is already being managed - it is signed and coned off, which is exactly the correct control. The hazard is an UNMARKED spill.',
  });
  return g;
}

/* ================================================================== *
 * 6. Blocked pedestrian walkway
 * ================================================================== */
export function blockedWalkway(world, { at = [0, 0, 0], heading = 0 }) {
  const g = new THREE.Group();

  const p1 = S.palletLoad({ rows: 2, seed: 5 });
  p1.position.set(-0.35, 0, 0);
  g.add(p1);
  const p2 = S.blockStack({ rows: 2, cols: 2, levels: 2, seed: 7 });
  p2.position.set(0.75, 0, 0.5);
  p2.rotation.y = 0.3;
  g.add(p2);
  const cage = F.rollCage();
  cage.position.set(-1.3, 0, 0.9);
  cage.rotation.y = -0.4;
  g.add(cage);

  world.dynamic(g);
  world.add(g, at, heading);

  world.hazard({
    id: 'blocked-walkway',
    center: new THREE.Vector3(at[0], 0.9, at[2]),
    size: V(3.6, 2.2, 3.0),
    hint: 'Follow the green paint. Where would you have to step off it?',
  });

  world.collider(at[0], at[2], 1.5, 1.3, 1.6);
  return g;
}

/* ================================================================== *
 * 7. Blocked emergency exit
 * ================================================================== */
export function blockedFireExit(world, { at = [0, 0, 0], heading = 0 }) {
  const g = new THREE.Group();
  // The door itself is placed by the environment (Structure.fireExitDoor);
  // this builder only places the obstruction in front of it.
  const stack = S.palletLoad({ rows: 3, wrapped: true, seed: 9 });
  stack.position.set(-0.35, 0, 0.55);
  stack.rotation.y = 0.12;
  g.add(stack);

  const cage = F.rollCage();
  cage.position.set(0.85, 0, 0.5);
  cage.rotation.y = 0.25;
  g.add(cage);

  const loose = S.carton(0.45, 0.38, 0.4, 2);
  loose.position.set(0.28, 0.19, 1.25);
  loose.rotation.y = 0.6;
  g.add(loose);

  world.dynamic(g);
  world.add(g, at, heading);

  world.hazard({
    id: 'blocked-fire-exit',
    center: new THREE.Vector3(at[0], 1.1, at[2] + Math.cos(heading) * 0.6),
    size: V(3.4, 2.6, 2.6),
    hint: 'Trace the route to every green running-man sign.',
  });

  world.collider(at[0], at[2] + 0.5, 1.4, 1.0, 2.2);
  return g;
}

/* ================================================================== *
 * 8. Blocked fire extinguisher
 * ================================================================== */
export function blockedFirePoint(world, { at = [0, 0, 0], heading = 0 }) {
  const g = new THREE.Group();
  const fp = P.firePoint({ blocked: true });
  g.add(fp);

  const stack = S.blockStack({ rows: 2, cols: 3, levels: 3, seed: 4 });
  stack.position.set(0, 0, 0.85);
  g.add(stack);
  const p = S.pallet();
  p.position.set(0.9, 0, 1.3);
  p.rotation.y = 0.4;
  g.add(p);

  world.dynamic(g);
  world.add(g, at, heading);

  world.hazard({
    id: 'blocked-extinguisher',
    center: new THREE.Vector3(at[0] - Math.sin(heading) * 0.8, 1.0, at[2] - Math.cos(heading) * 0.8),
    size: V(2.6, 2.4, 2.6),
    hint: 'Could you walk straight up and lift the extinguisher out?',
  });

  world.collider(at[0], at[2], 1.2, 1.0, 1.6);
  return g;
}

/* ================================================================== *
 * 9. Worker without PPE
 * ================================================================== */
export function workerNoPPE(world, { at = [0, 0, 0], heading = 0, withCompliantNearby = true }) {
  const g = new THREE.Group();

  const bad = worker({ variant: 'noppe' });
  g.add(bad);

  if (withCompliantNearby) {
    // a compliant colleague right next to them makes the contrast explicit
    const good = worker({ variant: 'hivis' });
    good.position.set(1.5, 0, 0.6);
    good.rotation.y = -0.7;
    g.add(good);
    world.animate((dt, t) => animateWorker(good, t, 0));
  }

  world.dynamic(g);
  world.add(g, at, heading);

  world.hazard({
    id: 'no-ppe-worker',
    center: new THREE.Vector3(at[0], 1.0, at[2]),
    size: V(1.4, 2.2, 1.4),
    hint: 'Compare what the two people are wearing.',
  });

  world.animate((dt, t) => animateWorker(bad, t, 0));
  g.userData.bad = bad;
  return g;
}

/* ================================================================== *
 * 10. Person at an open loading dock edge
 * ================================================================== */
export function openDockEdge(world, { at = [0, 0, 0], heading = 0 }) {
  const g = new THREE.Group();

  const person = worker({ variant: 'hivis' });
  person.position.set(0, 0, -0.55);
  person.rotation.y = Math.PI;
  poseLeaning(person);
  g.add(person);

  // the edge itself: striped nosing, no gate, no chain
  const nosing = stripedFloor({ w: 3.0, d: 0.5, repeat: [8, 1] });
  nosing.position.set(0, 0.006, -0.28);
  g.add(nosing);

  // a dock plate lying to one side, unused
  const plate = new THREE.Mesh(boxGeo(1.4, 0.05, 0.9), materials().forkliftSteel);
  plate.position.set(1.9, 0.025, 0.4);
  plate.rotation.y = 0.2;
  g.add(plate);

  world.dynamic(g);
  world.add(g, at, heading);

  world.hazard({
    id: 'open-dock-edge',
    center: new THREE.Vector3(at[0], 1.0, at[2] - Math.cos(heading) * 0.4),
    size: V(3.0, 2.4, 2.2),
    hint: 'Is there a trailer against that opening, or a barrier?',
  });

  world.animate((dt, t) => {
    // slight sway - a person standing on an edge
    person.rotation.z = Math.sin(t * 0.8) * 0.02;
  });
  return g;
}

/* ================================================================== *
 * 11. Trailing damaged cable
 * ================================================================== */
export function trailingCableHazard(world, { at = [0, 0, 0], heading = 0, points = null }) {
  const g = new THREE.Group();
  const cable = P.trailingCable({ points, damaged: true });
  g.add(cable);

  const sock = P.socketBox();
  sock.position.set(-0.16, 0.9, 0);
  g.add(sock);

  // the tool at the far end, so the lead has a reason to exist
  const tool = new THREE.Mesh(boxGeo(0.34, 0.24, 0.24), materials().forkliftBody);
  const end = cable.userData.curve.getPointAt(1);
  tool.position.copy(end).add(new THREE.Vector3(0.2, 0.12, 0));
  g.add(tool);

  world.dynamic(g);
  world.add(g, at, heading);

  const mid = cable.userData.curve.getPointAt(0.5).clone();
  const wp = g.localToWorld(mid.clone());

  world.hazard({
    id: 'trailing-cable',
    center: new THREE.Vector3(wp.x, 0.55, wp.z),
    size: V(3.4, 1.2, 2.4),
    hint: 'Trace any cable from the socket to the tool.',
  });

  // exposed conductor glints
  world.animate((dt, t) => {
    if (cable.userData.bare) {
      cable.userData.bare.material.emissiveIntensity = 0.3 + Math.sin(t * 5) * 0.25;
    }
  });
  return g;
}

/* ================================================================== *
 * 12. Broken pallet still in use
 * ================================================================== */
export function brokenPalletHazard(world, { at = [0, 0, 0], heading = 0 }) {
  const g = new THREE.Group();
  const p = S.pallet({ broken: true });
  g.add(p);

  // still loaded, which is what makes it a hazard rather than scrap
  for (let i = 0; i < 5; i++) {
    const b = S.carton(0.4, 0.34, 0.38, i % 4);
    b.position.set(-0.35 + (i % 3) * 0.38, 0.14 + 0.17 + Math.floor(i / 3) * 0.34, -0.18 + (i % 2) * 0.36);
    // the load sags into the missing board
    if (i === 1) { b.position.y -= 0.05; b.rotation.z = 0.09; }
    g.add(b);
  }

  // a good pallet alongside for contrast
  const good = S.pallet();
  good.position.set(1.35, 0, 0.1);
  good.rotation.y = 0.1;
  g.add(good);

  world.dynamic(g);
  world.add(g, at, heading);

  world.hazard({
    id: 'broken-pallet',
    center: new THREE.Vector3(at[0], 0.5, at[2]),
    size: V(1.8, 1.4, 1.5),
    hint: 'Look at the pallet, not the boxes on it.',
  });

  world.collider(at[0], at[2], 0.7, 0.5, 0.9);
  return g;
}

/* ================================================================== *
 * 13. Over-height / overloaded stack
 * ================================================================== */
export function overloadedStackHazard(world, { at = [0, 0, 0], heading = 0, withGoodStack = true }) {
  const g = new THREE.Group();
  const bad = S.overloadedStack();
  g.add(bad);

  if (withGoodStack) {
    const good = S.blockStack({ rows: 3, cols: 3, levels: 3, seed: 6 });
    good.position.set(2.4, 0, 0.3);
    g.add(good);
    world.decoy({
      center: new THREE.Vector3(at[0] + 2.4, 0.6, at[2] + 0.3),
      size: V(1.8, 1.6, 1.8),
      reason:
        'This stack is correctly built - wide base, low height, boxes square. Compare it with the tall narrow one beside it.',
    });
  }

  world.dynamic(g);
  world.add(g, at, heading);

  world.hazard({
    id: 'overloaded-stack',
    center: new THREE.Vector3(at[0] + 0.3, 1.7, at[2] + 0.15),
    size: V(2.0, 3.6, 1.8),
    hint: 'Compare the height of the stack with the width of its base.',
  });

  world.collider(at[0], at[2], 0.6, 0.6, 3.2);

  // it leans a little more as forklifts pass - visible instability
  world.animate((dt, t) => {
    bad.rotation.z = Math.sin(t * 0.7) * 0.012;
  });
  return g;
}

/* ================================================================== *
 * 14. Unsafe ladder use
 * ================================================================== */
export function unsafeLadder(world, { at = [0, 0, 0], heading = 0, againstRack = true }) {
  const g = new THREE.Group();
  const lad = P.ladder({ length: 3.4, unsafe: true });
  g.add(lad);

  // worker on the top two rungs, holding a box, no three points of contact
  const w = worker({ variant: 'hivis' });
  const climbY = 2.35;
  const climbZ = -1.32;
  w.position.set(0, climbY, climbZ);
  w.rotation.x = 0.0;
  poseClimbing(w);
  g.add(w);

  const box = S.carton(0.36, 0.3, 0.3, 1);
  box.position.set(0.34, climbY + 1.35, climbZ + 0.3);
  box.rotation.set(0.1, 0.3, 0.15);
  g.add(box);

  world.dynamic(g);
  world.add(g, at, heading);

  world.hazard({
    id: 'unsafe-ladder',
    center: new THREE.Vector3(at[0], 2.0, at[2] - Math.cos(heading) * 0.9),
    size: V(2.2, 3.6, 2.6),
    hint: 'Check the angle of the ladder and where the person is standing.',
  });

  world.collider(at[0], at[2] - 0.6, 0.4, 0.9, 2.0);

  world.animate((dt, t) => {
    // the ladder shifts slightly - it is not footed
    lad.rotation.z = Math.sin(t * 1.3) * 0.008;
  });
  return g;
}

/* ================================================================== *
 * 15. Blind corner conflict
 * ================================================================== */
export function blindCorner(world, { at = [0, 0, 0], heading = 0, cornerRack = null }) {
  const g = new THREE.Group();

  // solid stock right up to the corner, killing the sight line
  const wallOfStock = S.blockStack({ rows: 2, cols: 4, levels: 5, seed: 11 });
  wallOfStock.position.set(-1.6, 0, -1.4);
  g.add(wallOfStock);

  const truck = F.forklift({ loaded: false });
  truck.position.set(-4.6, 0, 2.2);
  truck.rotation.y = Math.PI / 2;
  g.add(truck);

  const ped = worker({ variant: 'hivis' });
  ped.position.set(1.4, 0, 3.4);
  ped.rotation.y = -Math.PI / 2;
  g.add(ped);

  world.dynamic(g);
  world.add(g, at, heading);

  world.hazard({
    id: 'blind-corner',
    center: new THREE.Vector3(at[0] - 0.6, 1.3, at[2] + 1.6),
    size: V(5.4, 2.8, 4.6),
    hint: 'This hazard is the layout itself. What is missing at this junction?',
  });

  world.collider(at[0] - 1.6, at[2] - 1.4, 1.0, 0.6, 1.8);

  world.animate((dt, t) => {
    if (world.opts.movingHazards) {
      truck.position.x = -4.6 + Math.sin(t * 0.4) * 1.7;
      for (const w of truck.userData.wheels) w.rotation.x -= dt * 3;
      ped.position.z = 3.4 - (Math.sin(t * 0.4 + 1.2) * 0.5 + 0.5) * 1.8;
      animateWorker(ped, t, 0.7);
    } else {
      animateWorker(ped, t, 0);
    }
    flashBeacon(truck, t);
  });
  return g;
}

/* ------------------------------------------------------------------ *
 * Shared helpers
 * ------------------------------------------------------------------ */

/** Amber rotating beacon flash, shared by every truck in the game. */
export function flashBeacon(truck, t) {
  const b = truck.userData?.beacon;
  if (!b) return;
  const v = (Math.sin(t * 7) * 0.5 + 0.5) ** 2;
  b.material.emissiveIntensity = 0.4 + v * 2.4;
  if (truck.userData.beaconLight) truck.userData.beaconLight.intensity = v * 5;
}

/**
 * Decoy generator: sprinkle deliberately SAFE lookalike props around the
 * building. Higher difficulties get more of them, which is one of the
 * concrete ways difficulty changes gameplay rather than just a label.
 */
export function scatterDecoys(world, spots, count) {
  const made = [];
  const rnd = World_seeded(4242);
  const pool = [...spots];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(rnd() * pool.length);
    const [spot] = pool.splice(idx, 1);
    made.push(buildDecoy(world, spot));
  }
  return made;
}

function World_seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DECOY_BUILDERS = {
  goodPallet: (world, at) => {
    const p = S.palletLoad({ rows: 3, wrapped: true, seed: 12 });
    world.add(p, at);
    world.decoy({
      object: p,
      reason: 'This load is correctly stacked and shrink-wrapped inside the pallet footprint. It is a good example, not a hazard.',
    });
    world.collider(at[0], at[2], 0.65, 0.45, 1.2);
    return p;
  },
  cordonedArea: (world, at) => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const c = P.trafficCone({ h: 0.55 });
      c.position.set(Math.cos((i / 4) * Math.PI * 2) * 1.1, 0, Math.sin((i / 4) * Math.PI * 2) * 1.1);
      g.add(c);
    }
    const s = P.wetFloorSign();
    s.position.set(0, 0, 0);
    g.add(s);
    world.dynamic(g);
  world.add(g, at);
    world.decoy({
      center: new THREE.Vector3(at[0], 0.6, at[2]), size: V(2.6, 1.6, 2.6),
      reason: 'The area is properly coned off and signed. Correct control, not a hazard.',
    });
    return g;
  },
  taggedRack: (world, at) => {
    const g = new THREE.Group();
    const tag = S.rackInspectionTag('green');
    tag.position.set(0, 1.4, 0);
    g.add(tag);
    const p = S.pallet();
    g.add(p);
    world.dynamic(g);
  world.add(g, at);
    world.decoy({
      center: new THREE.Vector3(at[0], 1.0, at[2]), size: V(1.2, 2.0, 1.2),
      reason: 'A green inspection tag means this rack has been checked and passed. Damage would carry an amber or red tag.',
    });
    return g;
  },
  parkedTruck: (world, at) => {
    const t = F.palletTruck();
    world.add(t, at, 0.6);
    world.decoy({
      object: t,
      reason: 'A hand pallet truck parked tidily out of the walkway with its forks down is stored correctly.',
    });
    return t;
  },
  goodLadder: (world, at) => {
    const l = P.ladder({ length: 3.0, unsafe: false });
    world.add(l, at, 0);
    world.decoy({
      center: new THREE.Vector3(at[0], 1.4, at[2]), size: V(1.4, 3.0, 1.6),
      reason: 'This ladder is stored at the correct angle against the wall with nobody on it. Unattended and correctly angled is fine.',
    });
    return l;
  },
  clearExit: (world, at) => {
    const g = new THREE.Group();
    world.dynamic(g);
  world.add(g, at);
    world.decoy({
      center: new THREE.Vector3(at[0], 1.1, at[2]), size: V(2.2, 2.2, 1.8),
      reason: 'This exit route is completely clear with its keep-clear hatching visible. That is what a compliant exit looks like.',
    });
    return g;
  },
};

function buildDecoy(world, spot) {
  const fn = DECOY_BUILDERS[spot.type];
  if (!fn) return null;
  return fn(world, spot.at);
}

export { DECOY_BUILDERS };
