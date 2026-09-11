/**
 * PlayerController.js
 * First-person camera controller: pointer-lock mouse look, WASD movement with
 * acceleration/damping, crouch, and collision resolution against the scene's
 * axis-aligned collider list.
 *
 * Why no physics engine: the warehouse is a flat slab with box-shaped
 * obstacles. A circle-vs-AABB sweep gives correct, cheap, deterministic
 * collision without adding a ~500kB dependency. See docs/DECISIONS.md.
 *
 * Input: rebindable keyboard (Settings → Controls), mouse, touch sticks, and
 * any standard gamepad through the browser Gamepad API.
 */
import * as THREE from 'three';
import { PLAYER } from '../data/config.js';
import { DEFAULT_KEYBINDS } from '../data/settings.js';

/** Standard-mapping gamepad buttons. */
const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, R3: 11 };
const DEADZONE = 0.16;
const dz = (v) => (Math.abs(v) < DEADZONE ? 0 : (v - Math.sign(v) * DEADZONE) / (1 - DEADZONE));

const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class PlayerController {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement  the element that captures pointer lock
   */
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;

    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;

    this.enabled = false;
    this.locked = false;
    /**
     * Pointer lock is not always available: embedded iframes without
     * allow="pointer-lock", some kiosk/managed browsers, and any context where
     * the user dismisses the permission all refuse it. When that happens we
     * fall back to click-and-drag looking so the game stays fully playable
     * rather than stranding the player on the "click to look around" prompt.
     */
    this.lockSupported =
      typeof document !== 'undefined' && !!domElement.requestPointerLock;
    this.lockFailed = false;
    this.dragging = false;
    this.dragMoved = 0;
    this.crouching = false;
    this.running = false;
    this.height = PLAYER.eyeHeight;
    this.targetHeight = PLAYER.eyeHeight;

    /** @type {{cx:number,cz:number,hx:number,hz:number,h:number}[]} */
    this.colliders = [];
    /** Soft bounds so the player cannot leave the building even if a wall is missed. */
    this.bounds = { minX: -1e6, maxX: 1e6, minZ: -1e6, maxZ: 1e6 };

    this.keys = new Set();
    this.touch = { move: { x: 0, y: 0 }, look: { x: 0, y: 0 }, active: false };

    /* --- user settings, applied from Profile via main.applySettings() --- */
    /** Flip the vertical look axis. */
    this.invertY = false;
    /** Master switch: no head bob and no camera shake. */
    this.reducedMotion = false;
    this.headBob = true;
    this.cameraShake = true;
    /** Multiplier on look speed, 0.25 - 3.0. */
    this.lookSensitivity = 1;
    /** action -> [primary, alternative] KeyboardEvent.code */
    this.keybinds = DEFAULT_KEYBINDS;
    /**
     * Aim assist slows the camera while the crosshair is over a hazard, so it
     * is easier to stop on one. Set by the game each frame (1 = no effect).
     */
    this.aimFriction = 1;

    /** Latest gamepad state, or null when none is connected. */
    this.gamepad = null;
    this.pad = { move: { x: 0, y: 0 }, run: false, crouch: false };
    this._padPrev = [];

    this._shake = 0;
    this._stepT = 0;

    this._bind();
  }

  /* ---------------------------------------------------------------- *
   * Input
   * ---------------------------------------------------------------- */

  /** Is any key bound to this action currently held? */
  isDown(action) {
    const slots = this.keybinds[action] ?? [];
    return slots.some((c) => c && this.keys.has(c));
  }

  _bind() {
    this._onKeyDown = (e) => {
      if (!this.enabled) return;
      // Do not swallow keys while the user is typing in a form.
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      this.keys.add(e.code);
      // Stop bound keys scrolling the page or triggering browser shortcuts.
      const bound = Object.values(this.keybinds).some((slots) => slots.includes(e.code));
      if (bound || ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.code);
    };
    this._onMouseMove = (e) => {
      if (!this.enabled) return;
      // Locked: use raw movement deltas. Unlocked: only while dragging.
      if (!this.locked && !this.dragging) return;
      const mx = e.movementX ?? 0;
      const my = e.movementY ?? 0;
      if (this.dragging) this.dragMoved += Math.abs(mx) + Math.abs(my);
      const base = this.locked ? PLAYER.lookSensitivity : PLAYER.lookSensitivity * 1.4;
      const sens = base * this.lookSensitivity * this.aimFriction;
      this.yaw -= mx * sens;
      this.pitch -= my * sens * (this.invertY ? -1 : 1);
      this._clampPitch();
    };
    this._onLockChange = () => {
      this.locked = document.pointerLockElement === this.dom;
      if (this.locked) this.lockFailed = false;
      this.onLockChange?.(this.locked);
      if (!this.locked) this.keys.clear();
    };
    this._onLockError = () => {
      this.locked = false;
      // Remember the refusal so the UI can switch to drag-look permanently
      // instead of re-prompting for a lock that will never be granted.
      this.lockFailed = true;
      this.onLockChange?.(false);
      this.onLockUnavailable?.();
    };

    // --- drag-to-look fallback ---
    this._onMouseDown = (e) => {
      if (!this.enabled || this.locked || e.button !== 0) return;
      this.dragging = true;
      this.dragMoved = 0;
    };
    this._onMouseUp = () => {
      this.dragging = false;
    };
    this.dom.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onLockChange);
    document.addEventListener('pointerlockerror', this._onLockError);

    // blur safety: release all keys when the tab loses focus
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.running = false;
      this.setCrouch(false);
    });
  }

  requestLock() {
    if (this.locked) return;
    if (!this.lockSupported) {
      this.lockFailed = true;
      this.onLockUnavailable?.();
      return;
    }
    let p;
    try {
      p = this.dom.requestPointerLock?.();
    } catch {
      this.lockFailed = true;
      this.onLockUnavailable?.();
      return;
    }
    // Newer Chrome returns a promise. A rejection means the lock was refused
    // (sandboxed iframe, permissions policy, or the Esc cooldown) - fall back
    // to drag-look rather than leaving the player unable to move the camera.
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        this.lockFailed = true;
        this.onLockUnavailable?.();
      });
    }
  }

  releaseLock() {
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
  }

  setCrouch(v) {
    this.crouching = v;
    this.targetHeight = v ? PLAYER.crouchHeight : PLAYER.eyeHeight;
  }

  _clampPitch() {
    const lim = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  /** Feed look deltas from a touch stick (pixels). */
  applyTouchLook(dx, dy) {
    // Touch follows the same sensitivity, invert and aim-assist settings as
    // the mouse; it used to ignore all three.
    const sens = PLAYER.touchLookSensitivity * this.lookSensitivity * this.aimFriction;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens * (this.invertY ? -1 : 1);
    this._clampPitch();
  }

  /**
   * Read the first connected gamepad. Called every frame by main.js, even
   * when paused, so Start can resume. Movement and look only apply while the
   * round is live; button presses are reported as edges through callbacks.
   *
   *   Left stick   move          Right stick   look
   *   A            flag hazard   Start         pause / resume
   *   LB / L3      run (hold)    B / R3        crouch (hold)
   */
  pollGamepad(dt) {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = [...(pads ?? [])].find((p) => p && p.connected) ?? null;
    const was = this.gamepad;
    this.gamepad = gp ? { id: gp.id } : null;
    if (!!was !== !!gp) this.onGamepadChange?.(this.gamepad);
    if (!gp) {
      this.pad.move.x = this.pad.move.y = 0;
      this.pad.run = this.pad.crouch = false;
      return;
    }

    const btn = (i) => !!gp.buttons[i]?.pressed;
    const edge = (i) => btn(i) && !this._padPrev[i];

    if (edge(PAD.START)) this.onPadPause?.();
    if (this.enabled && edge(PAD.A)) this.onPadFlag?.();

    if (this.enabled) {
      this.pad.move.x = dz(gp.axes[0] ?? 0);
      this.pad.move.y = -dz(gp.axes[1] ?? 0);
      this.pad.run = btn(PAD.LB) || btn(PAD.L3);
      this.pad.crouch = btn(PAD.B) || btn(PAD.R3);

      const rx = dz(gp.axes[2] ?? 0);
      const ry = dz(gp.axes[3] ?? 0);
      // Squared response gives fine control near the centre of the stick.
      const curve = (v) => Math.sign(v) * v * v;
      const sens = 2.6 * this.lookSensitivity * this.aimFriction;
      this.yaw -= curve(rx) * sens * dt;
      this.pitch -= curve(ry) * sens * 0.75 * dt * (this.invertY ? -1 : 1);
      this._clampPitch();
    }

    this._padPrev = gp.buttons.map((b) => b.pressed);
  }

  /** A jolt (0–1), e.g. a carton landing nearby. Ignored when shake is off. */
  addShake(strength) {
    if (!this.cameraShake || this.reducedMotion) return;
    this._shake = Math.min(1, Math.max(this._shake, strength));
  }

  /* ---------------------------------------------------------------- *
   * Placement
   * ---------------------------------------------------------------- */

  teleport(x, z, yaw = 0) {
    this.position.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
    this._applyCamera();
  }

  setColliders(list) {
    this.colliders = list ?? [];
  }

  setBounds(b) {
    this.bounds = { ...this.bounds, ...b };
  }

  /** Unit vector the camera is looking along. */
  getLookDirection(out = new THREE.Vector3()) {
    return this.camera.getWorldDirection(out);
  }

  /* ---------------------------------------------------------------- *
   * Simulation
   * ---------------------------------------------------------------- */

  update(dt) {
    if (!this.enabled) return;

    // --- desired direction in local space
    let fwd = 0;
    let strafe = 0;
    if (this.isDown('forward')) fwd += 1;
    if (this.isDown('back')) fwd -= 1;
    if (this.isDown('right')) strafe += 1;
    if (this.isDown('left')) strafe -= 1;
    fwd += this.touch.move.y + this.pad.move.y;
    strafe += this.touch.move.x + this.pad.move.x;

    this.running = this.isDown('run') || this.pad.run;
    const wantCrouch = this.isDown('crouch') || this.pad.crouch;
    if (wantCrouch !== this.crouching) this.setCrouch(wantCrouch);

    const mag = Math.hypot(fwd, strafe);
    if (mag > 1) {
      fwd /= mag;
      strafe /= mag;
    }

    const speed = this.crouching
      ? PLAYER.crouchSpeed
      : this.running
        ? PLAYER.runSpeed
        : PLAYER.walkSpeed;

    FORWARD.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    RIGHT.crossVectors(FORWARD, UP).normalize().multiplyScalar(-1);

    const wishX = FORWARD.x * fwd + RIGHT.x * strafe;
    const wishZ = FORWARD.z * fwd + RIGHT.z * strafe;

    // --- accelerate toward the wish velocity, damp otherwise
    const targetVX = wishX * speed;
    const targetVZ = wishZ * speed;
    const accel = mag > 0.01 ? PLAYER.accel : PLAYER.damping;
    const k = 1 - Math.exp(-accel * dt);
    this.velocity.x += (targetVX - this.velocity.x) * k;
    this.velocity.z += (targetVZ - this.velocity.z) * k;
    if (Math.abs(this.velocity.x) < 0.002) this.velocity.x = 0;
    if (Math.abs(this.velocity.z) < 0.002) this.velocity.z = 0;

    // --- integrate with per-axis collision resolution (prevents sticking on corners)
    const r = PLAYER.radius;
    let nx = this.position.x + this.velocity.x * dt;
    let nz = this.position.z + this.velocity.z * dt;

    nx = this._resolveAxis(nx, this.position.z, r, 'x');
    nz = this._resolveAxis(nx, nz, r, 'z');

    this.position.x = THREE.MathUtils.clamp(nx, this.bounds.minX, this.bounds.maxX);
    this.position.z = THREE.MathUtils.clamp(nz, this.bounds.minZ, this.bounds.maxZ);

    // --- smooth crouch
    this.height += (this.targetHeight - this.height) * (1 - Math.exp(-14 * dt));

    // --- footsteps, independent of whether the camera bobs
    const stepSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (stepSpeed > 0.6) {
      this._stepT += dt * stepSpeed;
      const stride = this.crouching ? 0.55 : 0.78;
      if (this._stepT >= stride) {
        this._stepT -= stride;
        this.onStep?.();
      }
    } else {
      this._stepT = 0;
    }

    // --- camera shake decays quickly
    this._shake = Math.max(0, this._shake - dt * 2.4);

    // --- subtle head bob so walking feels physical (disabled when still)
    // Its own setting, and also off under "reduce all motion": some people
    // get motion sick from camera bob, so it must be genuinely switchable off.
    if (this.reducedMotion || !this.headBob) {
      this._bob = 0;
      this._bobT = 0;
    } else {
      const sp = Math.hypot(this.velocity.x, this.velocity.z);
      this._bobT = (this._bobT ?? 0) + dt * sp * 1.9;
      const bob = sp > 0.4 ? Math.sin(this._bobT * 2) * 0.022 * Math.min(1, sp / PLAYER.walkSpeed) : 0;
      this._bob = (this._bob ?? 0) + (bob - (this._bob ?? 0)) * (1 - Math.exp(-12 * dt));
    }

    this._applyCamera();
  }

  /**
   * Push the player out of any collider it overlaps along one axis.
   * Treats the player as a circle of radius r against an AABB.
   */
  _resolveAxis(x, z, r, axis) {
    let val = axis === 'x' ? x : z;
    for (const c of this.colliders) {
      if (c.h !== undefined && c.h < 0.35) continue; // low kerbs are walkable
      const dx = x - c.cx;
      const dz = z - c.cz;
      const ox = c.hx + r - Math.abs(dx);
      const oz = c.hz + r - Math.abs(dz);
      if (ox <= 0 || oz <= 0) continue; // no overlap

      if (axis === 'x') {
        val = c.cx + Math.sign(dx || 1) * (c.hx + r);
        x = val;
      } else {
        val = c.cz + Math.sign(dz || 1) * (c.hz + r);
        z = val;
      }
    }
    return val;
  }

  _applyCamera() {
    const k = this._shake * this._shake;
    const jx = k ? (Math.random() - 0.5) * 0.05 * k : 0;
    const jy = k ? (Math.random() - 0.5) * 0.05 * k : 0;
    this.camera.position.set(
      this.position.x,
      this.height + (this._bob ?? 0) + jy * 0.6,
      this.position.z,
    );
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this.yaw + jx);
    this.camera.rotateX(this.pitch + jy);
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onLockChange);
    document.removeEventListener('pointerlockerror', this._onLockError);
    this.dom.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
  }
}
