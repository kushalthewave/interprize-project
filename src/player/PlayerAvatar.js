/**
 * PlayerAvatar.js
 * The trainee's own 3D character — the avatar they chose, standing in the
 * warehouse, seen from behind in third-person view.
 *
 * Built on the same procedural figure as every worker in the game (Worker.js)
 * so it is to scale against the racking and the forklifts, then dressed to
 * match the portrait the trainee picked: skin tone, hard-hat colour, hair,
 * hijab or beard, safety goggles, an orange hi-vis jacket with a first-aid
 * badge, and the kit their role carries — a first-aid kit, a clipboard, an
 * extinguisher or a radio.
 */
import * as THREE from 'three';
import { worker, animateWorker } from '../environment/props/Worker.js';
import { materials } from '../environment/props/Materials.js';
import { getAvatar } from '../data/avatars.js';
import { PLAYER } from '../data/config.js';

const HEAD = 0.23;

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

/** Build the 3D figure for an avatar id. */
export function buildPlayerAvatar(avatarId) {
  const a = getAvatar(avatarId);
  const M = materials();
  const g = worker({ variant: 'hivis', skin: a.skin, helmetColor: a.hat });
  g.name = `player-avatar-${a.id}`;
  const { torso, head, arms } = g.userData.parts;

  const jacket = M.hiVisOrange;
  const hairMat = mat(a.hairColour, { roughness: 0.9 });

  // A fitted orange hi-vis jacket with sleeves, like the portrait, instead of
  // the loose yellow vest box the background workers wear over their shirts.
  const chest = torso.children.find((c) => c.isMesh && c.material === M.trouser);
  for (const o of [...torso.children]) {
    if (o.isMesh && (o.material === M.hiVis || o.material === M.paintWhite)) torso.remove(o);
  }
  if (chest) chest.material = jacket;
  for (const { arm } of arms) {
    const sleeve = arm.children.find((c) => c.isMesh);
    if (sleeve) sleeve.material = jacket;
  }
  const W = 0.44;
  const T = 0.56;
  const reflective = mat(0xe5e7eb, { roughness: 0.3, metalness: 0.1, emissive: 0x2a2a2a });
  for (const y of [T * 0.28, T * 0.52]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(W + 0.012, 0.045, 0.252), reflective);
    band.position.y = y;
    torso.add(band);
  }
  for (const z of [-0.123, 0.123]) {
    for (const x of [-0.1, 0.1]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.042, T * 0.78, 0.006), reflective);
      brace.position.set(x, T * 0.5, z);
      torso.add(brace);
    }
  }
  // Collar.
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 6, 16), jacket);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = T - 0.01;
  torso.add(collar);

  // Green first-aid badge on the chest.
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.04, 20), mat(0x16a34a, { emissive: 0x0a4d22, emissiveIntensity: 0.4 }));
  badge.position.set(-0.16, T * 0.68, 0.127);
  torso.add(badge);
  const crossMat = mat(0xffffff);
  for (const [w, h] of [[0.016, 0.052], [0.052, 0.016]]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(w, h), crossMat);
    bar.position.set(-0.16, T * 0.68, 0.129);
    torso.add(bar);
  }

  // The hard hat sits higher than on the background workers, so the brim
  // does not hide the eyes, and the head is a touch larger so the face reads
  // from the third-person camera.
  const hatHex = new THREE.Color(a.hat).getHex();
  for (const o of head.children) {
    if (o.isMesh && o.material.color?.getHex() === hatHex) o.position.y += 0.035;
  }
  head.scale.setScalar(1.12);

  // Hair, recoloured and reshaped to the avatar.
  // The background workers' hair is a whole sphere, which hides the face; the
  // trainee's is a shell over the top and back, open at the front.
  const hair = head.children.find((c) => c.isMesh && c.material === M.hair);
  let fringe = null;
  if (hair) {
    hair.material = hairMat;
    hairMat.side = THREE.DoubleSide;
    const r = HEAD / 2 + 0.012;
    const gap = 0.95;
    hair.geometry = new THREE.SphereGeometry(r, 18, 12, Math.PI / 2 + gap, Math.PI * 2 - gap * 2, 0, Math.PI * 0.68);
    // Hairline across the forehead.
    fringe = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 6, 0, Math.PI * 2, 0, Math.PI * 0.2), hairMat);
    fringe.position.copy(hair.position);
    fringe.scale.copy(hair.scale);
    head.add(fringe);
  }

  switch (a.hair) {
    case 'curly': {
      for (const [x, y, z] of [[-0.11, 0.06, 0.0], [0.11, 0.06, 0.0], [-0.1, 0.0, -0.05], [0.1, 0.0, -0.05],
        [0, 0.02, -0.11], [-0.07, -0.05, -0.08], [0.07, -0.05, -0.08]]) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), hairMat);
        c.position.set(x, HEAD * 0.45 + y, z);
        head.add(c);
      }
      break;
    }
    case 'ponytail': {
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), hairMat);
      tail.scale.set(0.8, 1.9, 0.8);
      tail.position.set(0, HEAD * 0.2, -0.13);
      tail.rotation.x = 0.35;
      head.add(tail);
      break;
    }
    case 'hijab': {
      // Fabric over the head and wrapped down over the neck and shoulders.
      if (hair) hair.visible = false;
      if (fringe) fringe.visible = false;
      const cloth = mat(a.hairColour, { roughness: 0.85, side: THREE.DoubleSide });
      // A shell round the head, open at the front so the face shows (+z is phi = π/2).
      const gap = 0.8;
      const wrap = new THREE.Mesh(
        new THREE.SphereGeometry(HEAD / 2 + 0.02, 18, 12, Math.PI / 2 + gap, Math.PI * 2 - gap * 2, 0, Math.PI * 0.78),
        cloth,
      );
      wrap.scale.set(0.92, 1.06, 0.98);
      wrap.position.y = HEAD / 2;
      head.add(wrap);
      // Wrapped down over the neck and onto the shoulders.
      const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.15, 0.13, 18, 1, true), cloth);
      drape.position.set(0, -0.045, -0.008);
      head.add(drape);
      break;
    }
    default:
      break;
  }

  // A smile, so the front view reads as a face and not a mannequin.
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0065, 4, 12, Math.PI), mat(0x5b1a12));
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, HEAD * 0.34, HEAD / 2 * 0.86);
  head.add(mouth);

  if (a.earrings) {
    for (const x of [-0.098, 0.098]) {
      const ring = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat(0xfbbf24, { metalness: 0.7, roughness: 0.3 }));
      ring.position.set(x, HEAD * 0.36, 0.01);
      head.add(ring);
    }
  }

  if (a.beard) {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), mat(a.beard, { roughness: 0.95 }));
    beard.scale.set(1.05, 0.8, 0.7);
    beard.position.set(0, HEAD * 0.2, HEAD / 2 * 0.62);
    head.add(beard);
  }

  if (a.goggles) {
    const lens = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.042, 0.03),
      mat(0xd6ecfa, { transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.2 }),
    );
    lens.position.set(0, HEAD * 0.58, HEAD / 2 * 0.95);
    head.add(lens);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(HEAD / 2 + 0.005, 0.008, 6, 24), mat(0x374151));
    strap.rotation.x = Math.PI / 2;
    strap.position.y = HEAD * 0.58;
    head.add(strap);
  }

  if (a.hatBadge) {
    const shield = new THREE.Mesh(new THREE.CircleGeometry(0.03, 5), mat(0xfde68a, { metalness: 0.3 }));
    shield.position.set(0, HEAD * 0.82 + 0.035, HEAD / 2 + 0.03);
    head.add(shield);
  }

  // The kit their role carries, in the right hand.
  const hand = arms[0].hand;
  const prop = buildProp(a.prop);
  if (prop && hand) {
    prop.position.set(0, -0.08, 0.02);
    hand.add(prop);
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = true; } });
  g.userData.avatarId = a.id;
  g.userData.isPlayer = true;
  return g;
}

function buildProp(kind) {
  const p = new THREE.Group();
  switch (kind) {
    case 'firstaid': {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.08), mat(0xdc2626));
      p.add(box);
      const white = mat(0xffffff);
      for (const [w, h] of [[0.03, 0.1], [0.1, 0.03]]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.082), white);
        p.add(bar);
      }
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI), mat(0x7f1d1d));
      handle.position.y = 0.075;
      p.add(handle);
      break;
    }
    case 'clipboard': {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.27, 0.012), mat(0x92400e));
      const paper = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.22, 0.014), mat(0xffffff));
      paper.position.z = 0.002;
      p.add(board, paper);
      p.rotation.set(-0.9, 0, 0);
      break;
    }
    case 'extinguisher': {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.32, 14), mat(0xdc2626, { roughness: 0.4 }));
      body.position.y = -0.12;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.06, 10), mat(0x1f2933));
      top.position.y = 0.06;
      p.add(body, top);
      break;
    }
    case 'radio': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.13, 0.035), mat(0x1f2933));
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.03), mat(0xfde047, { emissive: 0x806c00, emissiveIntensity: 0.6 }));
      screen.position.set(0, 0.025, 0.0181);
      const aerial = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 6), mat(0x1f2933));
      aerial.position.set(0.02, 0.105, 0);
      p.add(body, screen, aerial);
      break;
    }
    default:
      return null;
  }
  return p;
}

/**
 * Keeps the avatar figure in step with the player: position, facing, walk
 * cycle and crouch. Rebuilt whenever the trainee chooses another avatar.
 */
export class AvatarRig {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.model = null;
    this.avatarId = null;
    this._t = 0;
  }

  setAvatar(id, force = false) {
    const want = getAvatar(id).id;
    if (want === this.avatarId && this.model && !force) return;
    // Not disposed: the figure shares cached geometry with every other worker.
    if (this.model) this.scene.remove(this.model);
    this.model = buildPlayerAvatar(want);
    this.model.visible = false;
    this.avatarId = want;
    this.scene.add(this.model);
  }

  /**
   * @param {object} p           the PlayerController
   * @param {number} dt
   * @param {boolean} visible    shown in third-person view, hidden in first
   */
  update(p, dt, visible, moving = true) {
    if (!this.model) return;
    this.model.visible = visible;
    if (!visible) return;
    this._t += dt;
    this.model.position.set(p.position.x, 0, p.position.z);
    // The figure faces +z; the player looks along -z at yaw 0.
    this.model.rotation.y = p.yaw + Math.PI;
    const speed = moving ? Math.hypot(p.velocity.x, p.velocity.z) : 0;
    animateWorker(this.model, this._t, Math.min(1.4, speed / 3.4));

    // Crouch: knees bent, hips dropped, a slight lean — feet stay on the floor.
    const c = THREE.MathUtils.clamp((PLAYER.eyeHeight - p.height) / (PLAYER.eyeHeight - PLAYER.crouchHeight), 0, 1);
    if (c > 0.001) {
      const { hips, torso, legs } = this.model.userData.parts;
      hips.position.y -= 0.39 * c;
      torso.rotation.x = 0.28 * c;
      for (const { leg, knee } of legs) {
        leg.rotation.x = leg.rotation.x * (1 - c) - 1.0 * c;
        knee.rotation.x = knee.rotation.x * (1 - c) + 2.0 * c;
      }
    } else {
      this.model.userData.parts.torso.rotation.x = 0;
    }
  }
}
