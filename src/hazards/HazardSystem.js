/**
 * HazardSystem.js
 * Owns the live hazard instances for the loaded environment:
 *   - registration (a scene declares WHERE each hazard id lives)
 *   - targeting (what is the reticle currently over?)
 *   - validation (correct flag / wrong flag)
 *   - highlighting (Train Mode and Simple difficulty)
 *
 * Detection model
 * ---------------
 * Each hazard gets an invisible convex proxy mesh sized to the physical
 * hazard. The reticle raycast tests ONLY those proxies (typically 15 objects),
 * which is far cheaper than raycasting the whole scene. A coarse ray-vs-AABB
 * occlusion pass against the collider list then rejects hazards the player
 * cannot actually see through solid racking.
 *
 * Wrong flags are also meaningful: flagging a *decoy* (a deliberately
 * safe-but-similar prop) or flagging empty space both count as wrong, and both
 * return a teaching tip.
 */
import * as THREE from 'three';
import { getHazard } from '../data/hazards.js';
import { bus, EV } from '../core/EventBus.js';
import { PLAYER } from '../data/config.js';

export class HazardInstance {
  /**
   * @param {object} o
   * @param {string} o.id            hazard definition id
   * @param {THREE.Object3D} o.anchor object the hazard is attached to
   * @param {THREE.Vector3} o.center  world-space centre of the hazard volume
   * @param {THREE.Vector3} o.size    world-space size of the hazard volume
   * @param {string} [o.hint]         scene-specific extra guidance for Train Mode
   */
  constructor({ id, anchor, center, size, hint = null, location = null, heightBand = null, highlightTargets = [] }) {
    this.def = getHazard(id);
    this.id = id;
    this.anchor = anchor;
    this.center = center.clone();
    this.size = size.clone();
    this.hint = hint;
    /** Where it is, in words the player can navigate by ("Aisle C, north end"). */
    this.location = location;
    /** Roughly how high it sits: floor level / eye level / above head / high up. */
    this.heightBand = heightBand;
    this.highlightTargets = highlightTargets;

    this.found = false;
    this.foundAt = null;
    this.reactionTime = null;
    this.attempts = 0;
    this.proxy = null;
    this.marker = null;
  }

  get severity() {
    return this.def.severity;
  }

  /** One line a player can act on: "Aisle C, north end - high up". */
  get where() {
    if (!this.location) return this.heightBand ?? '';
    return this.heightBand ? `${this.location} — ${this.heightBand}` : this.location;
  }
}

export class HazardSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    /** @type {HazardInstance[]} */
    this.instances = [];
    /** @type {THREE.Mesh[]} */
    this.proxies = [];
    /** @type {THREE.Mesh[]} */
    this.decoyProxies = [];
    /** Coarse boxes used for line-of-sight rejection. */
    this.occluders = [];

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = PLAYER.interactRange;
    this.center = new THREE.Vector2(0, 0);

    this.current = null; // hazard instance currently under the reticle
    this.currentDecoy = null;
    this.highlightEnabled = false;
    this.flagRadius = 1.0;
    this.active = false;
    /** Train Mode: the hazard the guide is currently leading the player to. */
    this.guideTarget = null;
    this.beacon = null;

    this.group = new THREE.Group();
    this.group.name = 'hazard-proxies';
    this.scene.add(this.group);

    this.markerGroup = new THREE.Group();
    this.markerGroup.name = 'hazard-markers';
    this.scene.add(this.markerGroup);

    this._t = 0;
  }

  /* ---------------------------------------------------------------- *
   * Registration
   * ---------------------------------------------------------------- */

  /** @param {HazardInstance} inst */
  register(inst) {
    const geo = new THREE.BoxGeometry(inst.size.x, inst.size.y, inst.size.z);
    const proxy = new THREE.Mesh(
      geo,
      // DoubleSide matters: several hazard volumes are large enough to stand
      // inside (the walkway a forklift is driving down, the blind corner).
      // With the default FrontSide the raycast finds no front face from inside
      // the box, making the hazard impossible to flag from exactly the spot
      // where it is most obvious.
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    );
    proxy.position.copy(inst.center);
    // Mesh.raycast() reads matrixWorld, NOT position. Without this the proxy
    // is still at the origin as far as raycasting is concerned until the first
    // render updates the scene graph - which silently breaks all targeting on
    // the opening frames (and entirely if the tab is not rendering yet).
    proxy.updateMatrixWorld(true);
    proxy.userData.hazardId = inst.id;
    proxy.userData.instance = inst;
    proxy.name = `proxy-${inst.id}`;
    // Proxies must never affect rendering or shadows.
    proxy.castShadow = false;
    proxy.receiveShadow = false;
    proxy.frustumCulled = true;
    this.group.add(proxy);

    inst.proxy = proxy;
    inst.marker = this._makeMarker(inst);
    this.markerGroup.add(inst.marker);

    this.instances.push(inst);
    this.proxies.push(proxy);
    return inst;
  }

  /**
   * Register a decoy: a physically safe object that resembles a hazard.
   * Flagging one is wrong, and produces a "why this is actually fine" tip.
   */
  registerDecoy({ center, size, reason }) {
    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    );
    proxy.position.copy(center);
    proxy.updateMatrixWorld(true); // see register() - raycasting needs matrixWorld
    proxy.userData.decoy = { reason };
    proxy.name = 'proxy-decoy';
    this.group.add(proxy);
    this.decoyProxies.push(proxy);
    return proxy;
  }

  setOccluders(list) {
    this.occluders = list ?? [];
  }

  setHighlight(v) {
    this.highlightEnabled = v;
    for (const i of this.instances) {
      if (i.marker) i.marker.visible = v && !i.found;
    }
  }

  setFlagRadius(r) {
    this.flagRadius = r;
  }

  /** Total hazards, and how many have been found. */
  get progress() {
    return {
      total: this.instances.length,
      found: this.instances.filter((i) => i.found).length,
    };
  }

  get remaining() {
    return this.instances.filter((i) => !i.found);
  }

  /* ---------------------------------------------------------------- *
   * Markers / highlights
   * ---------------------------------------------------------------- */

  _makeMarker(inst) {
    const g = new THREE.Group();
    g.position.copy(inst.center);
    g.position.y = inst.center.y + inst.size.y / 2 + 0.5;

    const color = inst.severity === 'major' ? 0xff4d4d : 0xffc14d;

    // A ring + a pulsing halo reads clearly at distance without hiding the object.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.055, 8, 28),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false }),
    );
    ring.renderOrder = 999;
    g.add(ring);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthTest: false }),
    );
    halo.renderOrder = 999;
    g.add(halo);

    g.visible = false;
    g.userData.ring = ring;
    g.userData.halo = halo;
    return g;
  }

  /** Briefly show a marker regardless of the highlight setting (Train Mode). */
  revealMarker(inst, on = true) {
    if (inst.marker) inst.marker.visible = on;
  }

  /**
   * Train Mode: lead the player to one hazard.
   *
   * A column of light rises from the hazard's position and is drawn over
   * everything, so it can be seen across the building and through racking.
   * The HUD arrow says which way to turn; the beam says where to stop. Pass
   * null to remove it.
   */
  setGuideTarget(inst) {
    // The previous target's marker goes back to normal size.
    if (this.guideTarget?.marker) this.guideTarget.marker.scale.setScalar(1);
    this.guideTarget = inst ?? null;
    if (!inst) {
      if (this.beacon) this.beacon.visible = false;
      return;
    }
    if (!this.beacon) this.beacon = this._makeBeacon();
    const colour = inst.severity === 'major' ? 0xff4d4d : 0xffc14d;
    this.beacon.userData.beam.material.color.setHex(colour);
    this.beacon.userData.base.material.color.setHex(colour);
    this.beacon.position.set(inst.center.x, 0, inst.center.z);
    this.beacon.visible = true;
  }

  _makeBeacon() {
    const g = new THREE.Group();
    g.name = 'train-guide-beacon';
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.34, 9, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffc14d, transparent: true, opacity: 0.32,
        depthTest: false, depthWrite: false, side: THREE.DoubleSide,
      }),
    );
    beam.position.y = 4.5;
    beam.renderOrder = 998;
    const base = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.78, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffc14d, transparent: true, opacity: 0.7,
        depthTest: false, depthWrite: false, side: THREE.DoubleSide,
      }),
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.04;
    base.renderOrder = 998;
    g.add(beam, base);
    g.userData.beam = beam;
    g.userData.base = base;
    g.visible = false;
    this.markerGroup.add(g);
    return g;
  }

  /* ---------------------------------------------------------------- *
   * Targeting
   * ---------------------------------------------------------------- */

  update(dt, elapsed) {
    this._t += dt;

    // markers billboard toward the camera and pulse
    const s = 1 + Math.sin(this._t * 3.2) * 0.12;
    if (this.beacon?.visible) {
      this.beacon.userData.beam.material.opacity = 0.22 + (s - 0.88) * 0.5;
      this.beacon.userData.base.scale.setScalar(0.85 + (s - 0.88) * 1.4);
      // The guided hazard's own marker is drawn larger than the rest.
      const gm = this.guideTarget?.marker;
      if (gm?.visible) gm.scale.setScalar(1.6);
    }
    for (const i of this.instances) {
      const m = i.marker;
      if (!m || !m.visible) continue;
      m.lookAt(this.camera.position);
      m.userData.ring.scale.setScalar(s);
      m.userData.halo.scale.setScalar(2 - s);
    }

    if (!this.active) {
      if (this.current) {
        this.current = null;
        bus.emit(EV.HAZARD_TARGET, null);
      }
      return;
    }

    const prev = this.current;
    const prevDecoy = this.currentDecoy;
    const { hazard, decoy } = this._pick();
    this.current = hazard;
    this.currentDecoy = decoy;

    if (hazard !== prev || decoy !== prevDecoy) {
      bus.emit(EV.HAZARD_TARGET, hazard ? { id: hazard.id, name: hazard.def.name } : decoy ? { decoy: true } : null);
    }
  }

  _pick() {
    this.raycaster.setFromCamera(this.center, this.camera);
    this.raycaster.far = PLAYER.interactRange;

    const hits = this.raycaster.intersectObjects([...this.proxies, ...this.decoyProxies], false);
    for (const h of hits) {
      const inst = h.object.userData.instance;
      if (inst && inst.found) continue; // already found: look past it
      if (this._occluded(h.point)) continue;
      if (inst) return { hazard: inst, decoy: null };
      if (h.object.userData.decoy) return { hazard: null, decoy: h.object };
    }
    return { hazard: null, decoy: null };
  }

  /**
   * Coarse line-of-sight test from the camera to a point against the collider
   * AABBs. Uses a slab test per box - no scene traversal.
   *
   * Two boxes must never count as occluders, or hazards become unflaggable:
   *  - the box the TARGET sits in (a hazard's own collider, or the racking it
   *    is attached to) - otherwise every hazard occludes itself
   *  - the box the CAMERA is standing in
   */
  _occluded(point) {
    const o = this.camera.position;
    const dx = point.x - o.x;
    const dy = point.y - o.y;
    const dz = point.z - o.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.001) return false;
    const ix = dx / len;
    const iy = dy / len;
    const iz = dz / len;

    /** Is p inside this collider box, allowing a margin? */
    const contains = (c, p, m) =>
      p.x >= c.cx - c.hx - m && p.x <= c.cx + c.hx + m &&
      p.z >= c.cz - c.hz - m && p.z <= c.cz + c.hz + m &&
      p.y >= -m && p.y <= (c.h ?? 3) + m;

    for (const c of this.occluders) {
      if (!c.opaque) continue;
      // Self-occlusion guards.
      if (contains(c, point, 0.6)) continue;
      if (contains(c, o, 0.2)) continue;

      const minX = c.cx - c.hx;
      const maxX = c.cx + c.hx;
      const minZ = c.cz - c.hz;
      const maxZ = c.cz + c.hz;
      const minY = 0;
      const maxY = c.h ?? 3;

      let t0 = 0.2; // start slightly ahead so we never self-occlude
      let t1 = len - 0.6; // stop well short of the target
      if (t1 <= t0) continue;

      let ok = true;
      const slab = (start, iDir, lo, hi) => {
        if (Math.abs(iDir) < 1e-6) {
          if (start < lo || start > hi) ok = false;
          return;
        }
        let ta = (lo - start) / iDir;
        let tb = (hi - start) / iDir;
        if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta);
        t1 = Math.min(t1, tb);
        if (t0 > t1) ok = false;
      };
      slab(o.x, ix, minX, maxX);
      if (ok) slab(o.y, iy, minY, maxY);
      if (ok) slab(o.z, iz, minZ, maxZ);
      if (ok) return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------- *
   * Flagging
   * ---------------------------------------------------------------- */

  /**
   * The player has flagged whatever the reticle is on.
   * @param {number} elapsedForHazard seconds since this hazard became live
   * @returns {{result:'correct'|'wrong', instance?:HazardInstance, reason?:string}}
   */
  flag(elapsedForHazard = 0) {
    if (!this.active) return { result: 'wrong', reason: 'Not in play.' };

    if (this.current) {
      const inst = this.current;
      inst.found = true;
      inst.foundAt = Date.now();
      inst.reactionTime = elapsedForHazard;
      inst.attempts++;
      if (inst.marker) inst.marker.visible = false;
      if (inst.proxy) inst.proxy.userData.foundAt = inst.foundAt;
      this.current = null;
      bus.emit(EV.HAZARD_FOUND, { instance: inst, reactionTime: elapsedForHazard });
      return { result: 'correct', instance: inst };
    }

    const reason = this.currentDecoy
      ? this.currentDecoy.userData.decoy.reason
      : 'Nothing hazardous there. Look for something that is physically wrong: an obstruction, damage, instability, or a person in the wrong place.';

    bus.emit(EV.HAZARD_WRONG, { reason, decoy: !!this.currentDecoy });
    return { result: 'wrong', reason };
  }

  /** Reveal every unfound hazard (used at the end of a round / in Train Mode). */
  revealAll() {
    for (const i of this.instances) {
      if (!i.found && i.marker) i.marker.visible = true;
    }
  }

  /** Find an instance by hazard id. */
  byId(id) {
    return this.instances.find((i) => i.id === id) ?? null;
  }

  reset() {
    this.setGuideTarget(null);
    for (const i of this.instances) {
      if (i.marker) i.marker.scale.setScalar(1);
      i.found = false;
      i.foundAt = null;
      i.reactionTime = null;
      i.attempts = 0;
      if (i.marker) i.marker.visible = this.highlightEnabled;
    }
    this.current = null;
    this.currentDecoy = null;
  }

  /** Tear down when the environment is unloaded. */
  clear() {
    for (const p of [...this.proxies, ...this.decoyProxies]) {
      p.geometry.dispose();
      p.material.dispose();
      this.group.remove(p);
    }
    for (const i of this.instances) {
      if (i.marker) {
        i.marker.traverse((o) => {
          o.geometry?.dispose?.();
          o.material?.dispose?.();
        });
        this.markerGroup.remove(i.marker);
      }
    }
    this.instances = [];
    this.proxies = [];
    this.decoyProxies = [];
    this.current = null;
    this.currentDecoy = null;
    this.guideTarget = null;
    if (this.beacon) {
      this.beacon.traverse((o) => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
      this.markerGroup.remove(this.beacon);
      this.beacon = null;
    }
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
    this.scene.remove(this.markerGroup);
  }
}
