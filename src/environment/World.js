/**
 * World.js
 * The build context handed to every environment definition.
 *
 * A scene file never touches the renderer, the hazard system's internals or
 * the player controller directly - it calls world.add / world.collider /
 * world.hazard / world.decoy / world.animate. That is what lets Environment 2
 * and 3 be ~200 lines each instead of a copy of the whole application.
 */
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HazardInstance } from '../hazards/HazardSystem.js';

export class World {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../hazards/HazardSystem.js').HazardSystem} hazards
   * @param {object} opts difficulty-derived options
   */
  constructor(scene, hazards, opts = {}) {
    this.scene = scene;
    this.hazards = hazards;
    this.opts = opts;

    this.root = new THREE.Group();
    this.root.name = 'environment';
    scene.add(this.root);

    /** @type {{cx:number,cz:number,hx:number,hz:number,h:number,opaque:boolean}[]} */
    this.colliders = [];
    /** @type {((dt:number, t:number)=>void)[]} */
    this.updaters = [];
    /** Named references scenes can hand back to gameplay (spawn points etc). */
    this.markers = {};
    /** Objects that scenes want disposed explicitly. */
    this.disposables = [];
  }

  /**
   * Add an object to the environment root.
   * @param {THREE.Object3D} obj
   * @param {number[]} [pos] [x,y,z]
   * @param {number} [rotY]
   */
  add(obj, pos = [0, 0, 0], rotY = 0) {
    obj.position.set(pos[0], pos[1], pos[2]);
    obj.rotation.y = rotY;
    this.root.add(obj);
    return obj;
  }

  /**
   * Register a solid box the player cannot walk through.
   * `opaque` also makes it block hazard line-of-sight.
   */
  collider(cx, cz, hx, hz, h = 3, opaque = true) {
    const c = { cx, cz, hx, hz, h, opaque };
    this.colliders.push(c);
    return c;
  }

  /** Convenience: collider derived from an object's world bounding box. */
  colliderFor(obj, { shrink = 0, height = null, opaque = true } = {}) {
    obj.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    return this.collider(
      c.x,
      c.z,
      Math.max(0.05, size.x / 2 - shrink),
      Math.max(0.05, size.z / 2 - shrink),
      height ?? Math.max(0.4, size.y),
      opaque,
    );
  }

  /**
   * Declare a hazard. `object` is used to compute the volume when explicit
   * center/size are not supplied.
   */
  /**
   * Describe where a point is, in words a person can act on.
   *
   * Scenes set `world.locator` to a function of (x, z). Without one this falls
   * back to a compass description, which is still better than nothing.
   */
  locate(x, z) {
    if (this.locator) {
      try {
        const s = this.locator(x, z);
        if (s) return s;
      } catch (err) {
        console.warn('[World] locator threw:', err);
      }
    }
    const ns = z < -4 ? 'north' : z > 4 ? 'south' : 'centre';
    const ew = x < -4 ? 'west' : x > 4 ? 'east' : 'centre';
    return ns === ew ? 'centre of the building' : `${ns} ${ew} area`.replace('centre ', '');
  }

  hazard({ id, object = null, center = null, size = null, hint = null, location = null, pad = 0.25 }) {
    let c = center;
    let s = size;
    if ((!c || !s) && object) {
      object.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(object);
      c ??= box.getCenter(new THREE.Vector3());
      s ??= box.getSize(new THREE.Vector3()).addScalar(pad * 2);
    }
    if (!c || !s) throw new Error(`hazard(${id}): needs an object or explicit center+size`);
    // Never let a proxy be paper-thin - it makes aiming frustrating.
    s.x = Math.max(s.x, 0.6);
    s.y = Math.max(s.y, 0.6);
    s.z = Math.max(s.z, 0.6);

    // A location the player can navigate by, plus the height band, because
    // "Aisle C" is not enough when the hazard is 4 m up on a rack beam.
    const where = location ?? this.locate(c.x, c.z);
    const band = c.y > 3.5 ? 'high up' : c.y > 1.9 ? 'above head height' : c.y < 0.8 ? 'at floor level' : 'at eye level';

    return this.hazards.register(new HazardInstance({
      id, anchor: object, center: c, size: s, hint,
      location: where,
      heightBand: band,
    }));
  }

  /**
   * Declare a decoy: something that looks like it could be a hazard but is
   * actually a correctly-controlled situation. Flagging it is wrong and the
   * player is told why it is fine - that is the teaching moment.
   */
  decoy({ object = null, center = null, size = null, reason, pad = 0.2 }) {
    let c = center;
    let s = size;
    if ((!c || !s) && object) {
      object.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(object);
      c ??= box.getCenter(new THREE.Vector3());
      s ??= box.getSize(new THREE.Vector3()).addScalar(pad * 2);
    }
    return this.hazards.registerDecoy({ center: c, size: s, reason });
  }

  /** Register a per-frame updater (patrols, falling boxes, flashing beacons). */
  animate(fn) {
    this.updaters.push(fn);
    return fn;
  }

  update(dt, t) {
    for (const fn of this.updaters) {
      try {
        fn(dt, t);
      } catch (err) {
        console.error('[World] updater threw:', err);
      }
    }
  }

  /**
   * Mark an object (and everything under it) as dynamic: animated, or
   * otherwise not safe to bake into merged static geometry.
   */
  dynamic(obj) {
    obj.userData.dynamic = true;
    return obj;
  }

  /**
   * Static-geometry merge pass.
   *
   * A believable warehouse needs thousands of cartons, pallets and rack
   * members. Left as individual meshes that is ~9,500 draw calls per frame,
   * which no browser will render smoothly. Because those props share a small
   * set of materials, we can bake every static mesh of a given material into
   * one merged BufferGeometry - taking the scene from thousands of draw calls
   * to a few dozen with no visual change.
   *
   * Anything under an object marked `userData.dynamic` (forklifts, workers,
   * the falling carton, flags, beacons, lights) is left untouched so it can
   * still be animated.
   *
   * @returns {{before:number, after:number, merged:number}}
   */
  optimize() {
    /** @type {Map<THREE.Material, THREE.BufferGeometry[]>} */
    const groups = new Map();
    /** @type {Map<THREE.Material, {cast:boolean, receive:boolean}>} */
    const flags = new Map();
    const toRemove = [];
    let before = 0;

    this.root.updateWorldMatrix(true, true);
    const rootInv = new THREE.Matrix4().copy(this.root.matrixWorld).invert();

    const walk = (obj, dynamic) => {
      const isDynamic = dynamic || obj.userData.dynamic === true;
      if (obj.isMesh) {
        before++;
        // Skip dynamic meshes, multi-material meshes, and anything with
        // per-object state the merge would destroy (skinning, morphs).
        const mergeable =
          !isDynamic &&
          !Array.isArray(obj.material) &&
          !obj.isSkinnedMesh &&
          !obj.isInstancedMesh &&
          !obj.geometry.morphAttributes?.position;
        if (mergeable) {
          const g = obj.geometry.clone();
          // Bake the mesh's world transform, expressed relative to root.
          g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInv, obj.matrixWorld));
          // Merging requires identical attribute sets - drop anything exotic.
          for (const key of Object.keys(g.attributes)) {
            if (!['position', 'normal', 'uv'].includes(key)) g.deleteAttribute(key);
          }
          if (!g.attributes.uv) {
            g.setAttribute('uv', new THREE.BufferAttribute(
              new Float32Array((g.attributes.position.count) * 2), 2));
          }
          if (!g.attributes.normal) g.computeVertexNormals();
          g.morphAttributes = {};

          if (!groups.has(obj.material)) {
            groups.set(obj.material, []);
            flags.set(obj.material, { cast: false, receive: false });
          }
          groups.get(obj.material).push(g);
          const f = flags.get(obj.material);
          f.cast ||= obj.castShadow;
          f.receive ||= obj.receiveShadow;
          toRemove.push(obj);
        }
      }
      for (const c of [...obj.children]) walk(c, isDynamic);
    };
    walk(this.root, false);

    // Detach the originals and free their GPU buffers.
    for (const m of toRemove) {
      m.parent?.remove(m);
      m.geometry.dispose();
    }

    let merged = 0;
    for (const [material, geos] of groups) {
      if (geos.length === 0) continue;
      try {
        // A single mesh does not benefit from merging, but going through the
        // same path keeps the result uniform.
        const g = geos.length === 1 ? geos[0] : BufferGeometryUtils.mergeGeometries(geos, false);
        if (!g) throw new Error('mergeGeometries returned null');
        if (geos.length > 1) for (const old of geos) old.dispose();

        const mesh = new THREE.Mesh(g, material);
        const f = flags.get(material);
        mesh.castShadow = f.cast;
        mesh.receiveShadow = f.receive;
        mesh.name = `merged-${material.name || material.uuid.slice(0, 6)}`;
        // Merged batches span the whole building, so per-object frustum
        // culling can only ever produce false negatives here.
        mesh.frustumCulled = false;
        mesh.matrixAutoUpdate = false;
        this.root.add(mesh);
        merged++;
      } catch (err) {
        // Fall back to keeping this material's meshes unmerged rather than
        // losing geometry - correctness beats the optimisation.
        console.warn('[World.optimize] could not merge a material batch:', err);
        for (const g of geos) {
          const mesh = new THREE.Mesh(g, material);
          this.root.add(mesh);
        }
      }
    }

    let after = 0;
    this.root.traverse((o) => { if (o.isMesh) after++; });
    return { before, after, merged };
  }

  /** Random-but-deterministic helper so scenes look identical every load. */
  static seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  dispose() {
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
      // Shared materials from Materials.js are cached and reused across
      // environments, so only dispose materials the scene cloned itself.
      const m = o.material;
      if (m?.userData?.owned) {
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else m.dispose();
      }
    });
    this.scene.remove(this.root);
    this.updaters.length = 0;
    this.colliders.length = 0;
  }
}
