/**
 * Worker.js
 * Procedural low-poly human figures, ~1.72m tall.
 *
 * HONEST NOTE: these are stylised primitive-built figures with a simple
 * procedural walk/idle cycle - not rigged, skinned character models.
 * Proportions are set against real anthropometry so scale against the racking
 * and forklift reads correctly, which is what matters for hazard judgement.
 *
 * Variants:
 *   'hivis'   compliant worker: hi-vis vest + hard hat + boots
 *   'noppe'   HAZARD: plain clothes, no vest, no helmet   (no-ppe-worker)
 *   'male'    Nepali daura/kurta-surwal inspired avatar (profile use)
 *   'female'  Nepali kurti-surwal inspired avatar        (profile use)
 *
 * userData exposes limb groups so Animator can drive a walk cycle.
 */
import * as THREE from 'three';
import { materials, boxGeo, cylGeo, sphereGeo } from './Materials.js';

const H = {
  head: 0.23,
  neck: 0.06,
  torso: 0.56,
  hip: 0.12,
  upperLeg: 0.44,
  lowerLeg: 0.42,
  foot: 0.07,
  upperArm: 0.30,
  lowerArm: 0.28,
};
const GROUND_TO_HIP = H.foot + H.lowerLeg + H.upperLeg; // 0.93

export function worker({ variant = 'hivis', skin = null, helmetColor = null } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = `worker-${variant}`;

  const skinMat = skin
    ? new THREE.MeshStandardMaterial({ color: skin, roughness: 0.75 })
    : M.skin;

  const isFemale = variant === 'female';
  const shoulderW = isFemale ? 0.38 : 0.44;

  /* ---- lower body ---- */
  const hips = new THREE.Group();
  hips.position.y = GROUND_TO_HIP;
  g.add(hips);

  const trouserMat =
    variant === 'male' ? M.kurtaTrouser
    : isFemale ? M.kurtiTrouser
    : variant === 'noppe' ? M.plainShirt
    : M.trouser;

  const pelvis = new THREE.Mesh(boxGeo(shoulderW * 0.82, H.hip, 0.22), trouserMat);
  pelvis.position.y = H.hip / 2;
  pelvis.castShadow = true;
  hips.add(pelvis);

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.115, 0, 0);
    hips.add(leg);

    const upper = new THREE.Mesh(cylGeo(0.085, 0.075, H.upperLeg, 10), trouserMat);
    upper.position.y = -H.upperLeg / 2;
    upper.castShadow = true;
    leg.add(upper);

    const knee = new THREE.Group();
    knee.position.y = -H.upperLeg;
    leg.add(knee);
    const lower = new THREE.Mesh(cylGeo(0.072, 0.06, H.lowerLeg, 10), trouserMat);
    lower.position.y = -H.lowerLeg / 2;
    lower.castShadow = true;
    knee.add(lower);

    const foot = new THREE.Mesh(boxGeo(0.11, H.foot, 0.26), variant === 'noppe' ? M.plainShirt : M.boot);
    foot.position.set(0, -H.lowerLeg - H.foot / 2, 0.05);
    foot.castShadow = true;
    knee.add(foot);

    legs.push({ leg, knee });
  }

  /* ---- torso ---- */
  const torso = new THREE.Group();
  torso.position.y = H.hip;
  hips.add(torso);

  const shirtMat =
    variant === 'male' ? M.kurtaMale
    : isFemale ? M.kurtiFemale
    : variant === 'noppe' ? M.plainShirt
    : M.trouser;

  const chest = new THREE.Mesh(boxGeo(shoulderW, H.torso, 0.24), shirtMat);
  chest.position.y = H.torso / 2;
  chest.castShadow = true;
  torso.add(chest);

  // Nepali garments: kurta skirt / kurti tunic hanging below the waist
  if (variant === 'male' || isFemale) {
    const skirtH = isFemale ? 0.42 : 0.3;
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(shoulderW * 0.52, shoulderW * 0.66, skirtH, 12, 1, true),
      shirtMat,
    );
    skirt.position.y = -skirtH / 2 + 0.02;
    skirt.material = shirtMat.clone();
    skirt.material.side = THREE.DoubleSide;
    skirt.castShadow = true;
    torso.add(skirt);
    if (isFemale) {
      // dupatta / scarf across one shoulder
      const scarf = new THREE.Mesh(boxGeo(0.1, 0.62, 0.02), M.scarf);
      scarf.position.set(-0.14, H.torso * 0.45, 0.13);
      scarf.rotation.z = 0.22;
      torso.add(scarf);
    }
  }

  // hi-vis vest for compliant workers - deliberately absent on 'noppe'
  if (variant === 'hivis' || variant === 'driver') {
    const vest = new THREE.Mesh(boxGeo(shoulderW + 0.05, H.torso * 0.82, 0.28), M.hiVis);
    vest.position.y = H.torso * 0.46;
    vest.castShadow = true;
    torso.add(vest);
    // retro-reflective bands
    for (const y of [H.torso * 0.3, H.torso * 0.58]) {
      const band = new THREE.Mesh(boxGeo(shoulderW + 0.06, 0.05, 0.29), M.paintWhite);
      band.position.y = y;
      torso.add(band);
    }
    const vband = new THREE.Mesh(boxGeo(0.05, H.torso * 0.8, 0.29), M.paintWhite);
    vband.position.set(-0.11, H.torso * 0.46, 0.005);
    torso.add(vband);
    const vband2 = vband.clone();
    vband2.position.x = 0.11;
    torso.add(vband2);
  }

  /* ---- arms ---- */
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * (shoulderW / 2 + 0.03), H.torso * 0.92, 0);
    torso.add(arm);

    const upper = new THREE.Mesh(cylGeo(0.055, 0.05, H.upperArm, 8), shirtMat);
    upper.position.y = -H.upperArm / 2;
    upper.castShadow = true;
    arm.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -H.upperArm;
    arm.add(elbow);
    // forearms bare for hi-vis/plain workers, sleeved for the Nepali avatars
    const lowerMat = variant === 'male' || isFemale ? shirtMat : skinMat;
    const lower = new THREE.Mesh(cylGeo(0.048, 0.042, H.lowerArm, 8), lowerMat);
    lower.position.y = -H.lowerArm / 2;
    lower.castShadow = true;
    elbow.add(lower);
    const hand = new THREE.Mesh(sphereGeo(0.055, 10), skinMat);
    hand.position.y = -H.lowerArm - 0.03;
    elbow.add(hand);

    arms.push({ arm, elbow, hand });
  }

  /* ---- head ---- */
  const neck = new THREE.Mesh(cylGeo(0.055, 0.06, H.neck, 8), skinMat);
  neck.position.y = H.torso + H.neck / 2;
  torso.add(neck);

  const head = new THREE.Group();
  head.position.y = H.torso + H.neck;
  torso.add(head);

  const skull = new THREE.Mesh(sphereGeo(H.head / 2, 14), skinMat);
  skull.scale.set(0.86, 1.0, 0.92);
  skull.position.y = H.head / 2;
  skull.castShadow = true;
  head.add(skull);

  // hair
  const hair = new THREE.Mesh(sphereGeo(H.head / 2 + 0.012, 14), M.hair);
  hair.scale.set(0.88, isFemale ? 1.02 : 0.94, 0.94);
  hair.position.y = H.head / 2 + 0.014;
  head.add(hair);
  if (isFemale) {
    const bun = new THREE.Mesh(sphereGeo(0.075, 10), M.hair);
    bun.position.set(0, H.head * 0.52, -0.11);
    head.add(bun);
  }

  // headwear
  if (variant === 'hivis' || variant === 'driver') {
    const hm = helmetColor
      ? new THREE.MeshStandardMaterial({ color: helmetColor, roughness: 0.35 })
      : variant === 'driver'
        ? M.helmetBlue
        : M.helmet;
    const shell = new THREE.Mesh(sphereGeo(H.head / 2 + 0.028, 14), hm);
    shell.scale.set(1, 0.72, 1);
    shell.position.y = H.head * 0.66;
    shell.castShadow = true;
    head.add(shell);
    const brim = new THREE.Mesh(cylGeo(H.head / 2 + 0.062, H.head / 2 + 0.062, 0.016, 16), hm);
    brim.position.y = H.head * 0.56;
    head.add(brim);
    const peak = new THREE.Mesh(boxGeo(0.14, 0.014, 0.09), hm);
    peak.position.set(0, H.head * 0.56, 0.13);
    head.add(peak);
  } else if (variant === 'male') {
    // dhaka topi - the Nepali cap
    const topi = new THREE.Mesh(cylGeo(H.head / 2 + 0.008, H.head / 2 + 0.02, 0.11, 16), M.dhakaTopi);
    topi.position.y = H.head * 0.72;
    topi.castShadow = true;
    head.add(topi);
    const band = new THREE.Mesh(cylGeo(H.head / 2 + 0.023, H.head / 2 + 0.023, 0.03, 16), M.red);
    band.position.y = H.head * 0.62;
    head.add(band);
  }

  // simple face so the figure has a facing direction at a glance
  for (const x of [-0.045, 0.045]) {
    const eye = new THREE.Mesh(sphereGeo(0.014, 8), M.forkliftDark);
    eye.position.set(x, H.head * 0.56, H.head / 2 * 0.9);
    head.add(eye);
  }

  // Animated in every scene it appears in, so it must survive World.optimize().
  g.userData.dynamic = true;
  g.userData.parts = { hips, torso, head, legs, arms };
  g.userData.variant = variant;
  g.userData.height = GROUND_TO_HIP + H.hip + H.torso + H.neck + H.head;
  g.userData.phase = Math.random() * Math.PI * 2;
  return g;
}

/**
 * Drive a walk or idle cycle. Called from the frame loop.
 * @param {THREE.Group} w   a group returned by worker()
 * @param {number} t        elapsed seconds
 * @param {number} speed    0 = idle sway, 1 = normal walking pace
 */
export function animateWorker(w, t, speed = 0) {
  const p = w.userData.parts;
  if (!p) return;
  const ph = w.userData.phase ?? 0;

  if (speed > 0.01) {
    const f = t * 5.2 * speed + ph;
    const swing = 0.62 * Math.min(1, speed);
    p.legs[0].leg.rotation.x = Math.sin(f) * swing;
    p.legs[1].leg.rotation.x = -Math.sin(f) * swing;
    p.legs[0].knee.rotation.x = Math.max(0, -Math.sin(f + 0.6)) * 0.75;
    p.legs[1].knee.rotation.x = Math.max(0, Math.sin(f + 0.6)) * 0.75;
    p.arms[0].arm.rotation.x = -Math.sin(f) * swing * 0.7;
    p.arms[1].arm.rotation.x = Math.sin(f) * swing * 0.7;
    p.arms[0].elbow.rotation.x = -0.28;
    p.arms[1].elbow.rotation.x = -0.28;
    p.hips.position.y = 0.93 + Math.abs(Math.sin(f)) * 0.035;
    p.torso.rotation.y = Math.sin(f) * 0.07;
  } else {
    const f = t * 1.1 + ph;
    p.legs[0].leg.rotation.x = 0;
    p.legs[1].leg.rotation.x = 0;
    p.legs[0].knee.rotation.x = 0;
    p.legs[1].knee.rotation.x = 0;
    p.arms[0].arm.rotation.x = Math.sin(f) * 0.05 - 0.06;
    p.arms[1].arm.rotation.x = -Math.sin(f) * 0.05 - 0.06;
    p.arms[0].arm.rotation.z = 0.09;
    p.arms[1].arm.rotation.z = -0.09;
    p.arms[0].elbow.rotation.x = -0.16;
    p.arms[1].elbow.rotation.x = -0.16;
    p.hips.position.y = 0.93 + Math.sin(f * 1.7) * 0.008;
    p.torso.rotation.y = Math.sin(f * 0.7) * 0.05;
  }
}

/** Put a worker into a "climbing a ladder / reaching up" pose. */
export function poseClimbing(w) {
  const p = w.userData.parts;
  if (!p) return;
  p.arms[0].arm.rotation.x = -2.3;
  p.arms[1].arm.rotation.x = -2.0;
  p.arms[0].elbow.rotation.x = -0.5;
  p.arms[1].elbow.rotation.x = -0.7;
  p.legs[0].leg.rotation.x = 0.35;
  p.legs[1].leg.rotation.x = -0.15;
  p.legs[0].knee.rotation.x = 0.5;
  w.userData.static = true;
}

/** Put a worker into a "looking down over an edge" pose. */
export function poseLeaning(w) {
  const p = w.userData.parts;
  if (!p) return;
  p.torso.rotation.x = 0.3;
  p.head.rotation.x = 0.25;
  p.arms[0].arm.rotation.x = -0.5;
  p.arms[1].arm.rotation.x = -0.45;
  w.userData.static = true;
}
