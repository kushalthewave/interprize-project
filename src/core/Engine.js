/**
 * Engine.js
 * Owns the WebGL renderer, the scene graph root, the camera and the frame loop.
 * Nothing gameplay-specific lives here - systems register update callbacks.
 */
import * as THREE from 'three';
import { RENDER } from '../data/config.js';
import { shouldRenderFrame } from '../data/settings.js';

export class Engine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [o]
   * @param {boolean} [o.antialias] MSAA is a property of the WebGL context and
   *   cannot be changed after it is created, so it is read from the saved
   *   setting here and a change to it takes effect on the next start.
   */
  constructor(canvas, { antialias = true } = {}) {
    this.canvas = canvas;
    this.msaa = !!antialias;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.msaa,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0e12);

    this.camera = new THREE.PerspectiveCamera(
      RENDER.fov,
      window.innerWidth / window.innerHeight,
      RENDER.near,
      RENDER.far,
    );
    this.camera.position.set(0, 1.7, 0);

    this.clock = new THREE.Clock();
    /** @type {Set<(dt:number, elapsed:number)=>void>} */
    this.updaters = new Set();
    this.running = false;
    this.paused = false;
    this._raf = null;

    /** Frames per second limit; 0 = match the display. */
    this.fpsCap = 0;
    this._lastFrame = 0;
    /** When false the resolution is fixed by the player and never auto-lowered. */
    this.adaptive = true;
    /** Replaced by Graphics so post-processing can take over the draw. */
    this.renderFn = null;
    /** Metres per second the camera moved last frame (drives motion blur). */
    this.cameraSpeed = 0;
    this._lastCamPos = new THREE.Vector3();

    // rolling FPS estimate for the perf overlay / adaptive quality
    this.fps = 60;
    this._fpsAccum = 0;
    this._fpsFrames = 0;
    this._adaptiveCooldown = 0;

    this._onResize = this.resize.bind(this);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    this.resize();

    // WebGL context-loss resilience
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.stop();
      console.warn('[Engine] WebGL context lost.');
      this.onContextLost?.();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      console.warn('[Engine] WebGL context restored.');
      this.onContextRestored?.();
      this.start();
    });
  }

  /** @returns {() => void} unregister */
  addUpdater(fn) {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  /**
   * Resize the renderer and camera to the window.
   *
   * Both dimensions are clamped to at least 1px. A zero-sized viewport - a
   * hidden iframe, a minimised window, a display:none container - otherwise
   * gives `aspect = 0`, which makes the projection matrix singular. Every
   * element of it (and of its inverse) becomes NaN, and because hazard
   * targeting unprojects through that matrix, the reticle silently stops
   * hitting anything. It does not recover on its own either: without a later
   * resize event the NaN persists after the window becomes visible again.
   */
  resize() {
    const w = Math.max(1, window.innerWidth || this.canvas.clientWidth || 1);
    const h = Math.max(1, window.innerHeight || this.canvas.clientHeight || 1);
    const aspect = w / h;
    if (!Number.isFinite(aspect) || aspect <= 0) return;

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.onResize?.();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = (now = performance.now()) => {
      if (!this.running) return;
      this._raf = requestAnimationFrame(loop);
      // Frame-rate cap: skip this display refresh entirely. The clock is only
      // read on frames that are drawn, so dt still covers the skipped time.
      if (!shouldRenderFrame(now, this._lastFrame, this.fpsCap)) return;
      this._lastFrame = now;
      // Clamp dt so a background tab does not teleport the player.
      const dt = Math.min(this.clock.getDelta(), 0.1);
      const elapsed = this.clock.elapsedTime;

      this._trackFps(dt);

      if (!this.paused) {
        for (const fn of this.updaters) {
          try {
            fn(dt, elapsed);
          } catch (err) {
            console.error('[Engine] updater threw:', err);
          }
        }
      }
      if (dt > 0) {
        this.cameraSpeed = this.camera.position.distanceTo(this._lastCamPos) / dt;
        this._lastCamPos.copy(this.camera.position);
      }
      if (this.renderFn) this.renderFn();
      else this.renderer.render(this.scene, this.camera);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  setPaused(v) {
    this.paused = v;
  }

  _trackFps(dt) {
    this._fpsAccum += dt;
    this._fpsFrames++;
    if (this._fpsAccum >= 0.5) {
      this.fps = this._fpsFrames / this._fpsAccum;
      this._fpsAccum = 0;
      this._fpsFrames = 0;
      this._adaptiveQuality();
    }
  }

  /**
   * Cheap adaptive quality: if we are consistently below ~40fps, drop the
   * device pixel ratio one notch (down to 1) before touching anything else.
   * Recovers when headroom returns.
   */
  _adaptiveQuality() {
    // A resolution the player chose is respected, even if it is slow.
    if (!this.adaptive) return;
    if (this._adaptiveCooldown > 0) {
      this._adaptiveCooldown--;
      return;
    }
    const cur = this.renderer.getPixelRatio();
    const target = Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio);
    // A frame cap below 40 would otherwise read as "too slow" forever.
    const floor = this.fpsCap && this.fpsCap < 45 ? this.fpsCap * 0.85 : 40;
    if (this.fps < floor && cur > 1) {
      this.renderer.setPixelRatio(Math.max(1, cur - 0.25));
      this._adaptiveCooldown = 8;
      this.onResize?.();
    } else if (this.fps > 58 && cur < target) {
      this.renderer.setPixelRatio(Math.min(target, cur + 0.25));
      this._adaptiveCooldown = 8;
      this.onResize?.();
    }
  }

  /** Remove and dispose everything under a root object. */
  static disposeObject(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose?.());
      else m?.dispose?.();
    });
    obj.parent?.remove(obj);
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    Engine.disposeObject(this.scene);
    this.renderer.dispose();
  }
}
